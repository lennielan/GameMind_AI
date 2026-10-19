import { logger } from '../../logger/logger'
import { configManager } from '../../config/config-manager'
import { aiQueueService } from './ai-queue.service'
import type { AiChatRequest, AiChatResponse } from '../../../shared/types/ai.types'
import { createHash } from 'crypto'
import { supabase } from '../supabase.client'

export class AiClient {
  /**
   * Main entry point for generating AI completions.
   * Enqueues the request through AIQueueService for TPM rate limiting and exponential backoff.
   */
  async generate(request: AiChatRequest, overrideProvider?: string, bypassQueue = false): Promise<AiChatResponse> {
    const provider = overrideProvider || (configManager.get('aiProvider') as string) || 'gemini'

    if (bypassQueue) {
      return this._generateInternal(request, provider)
    }

    return aiQueueService.enqueue(
      request,
      () => this._generateInternal(request, provider),
      provider
    )
  }

  private async _generateInternal(request: AiChatRequest, overrideProvider?: string): Promise<AiChatResponse> {
    const provider = overrideProvider || (configManager.get('aiProvider') as string) || 'gemini'
    
    let cacheHash = ''
    if (request.cacheFeature) {
      const hashInput = request.cacheFeature + ':' + provider + ':' + request.messages.map(m => m.role + m.content).join('|')
      cacheHash = createHash('sha256').update(hashInput).digest('hex')
      try {
        if (supabase) {
          const { data, error } = await supabase.rpc('get_ai_cache', { p_hash: cacheHash })
          if (!error && data) {
            logger.info('AiClient', `Cache hit for feature: ${request.cacheFeature}`)
            const { extractAndParseJSON } = await import('./json-utils')
            const parsed = extractAndParseJSON(data)
            return {
            content: parsed,
            provider: provider as any,
            model: 'cached',
            tokensUsed: { prompt: 0, completion: 0, total: 0 },
            latencyMs: 0
          }
        }
        }
      } catch (err) {
        logger.warn('AiClient', 'Failed to check AI cache', err)
      }
    }

    let apiUrl = ''
    let apiKey = ''
    let model = ''
    let requiresAuth = true

    switch (provider) {
      case 'openai':
        apiUrl = 'https://api.openai.com/v1/chat/completions'
        apiKey = configManager.get('openaiApiKey') as string
        model = (configManager.get('openaiModel') as string) || 'gpt-4o'
        break
      case 'gemini':
        apiKey = configManager.get('geminiApiKey') as string
        if (!apiKey) {
          throw new Error('API key is not configured for Gemini. Please set it in Settings.')
        }
        model = (configManager.get('geminiModel') as string) || 'gemini-3.6-flash'
        if (
          !model ||
          model.includes('3.7') ||
          model.includes('3.5') ||
          model.includes('2.5') ||
          model.includes('2.0') ||
          model.includes('1.5') ||
          model.includes('latest')
        ) {
          model = 'gemini-3.6-flash'
        }
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
        requiresAuth = false
        break
      case 'claude':
        apiUrl = 'https://api.anthropic.com/v1/messages'
        apiKey = configManager.get('claudeApiKey') as string
        model = (configManager.get('claudeModel') as string) || 'claude-3-5-sonnet-20240620'
        break
      case 'openrouter':
        apiUrl = 'https://openrouter.ai/api/v1/chat/completions'
        apiKey = configManager.get('openrouterApiKey') as string
        model = (configManager.get('openrouterModel') as string) || 'google/gemini-2.0-flash-lite-preview-02-05:free'
        break
      case 'ollama':
        apiUrl = `${(configManager.get('ollamaUrl') as string) || 'http://localhost:11434'}/v1/chat/completions`
        model = (configManager.get('ollamaModel') as string) || 'llama3.1'
        requiresAuth = false
        break
      case 'lmstudio':
        apiUrl = `${(configManager.get('lmstudioUrl') as string) || 'http://localhost:1234'}/v1/chat/completions`
        model = (configManager.get('lmstudioModel') as string) || 'local-model'
        requiresAuth = false
        break
      default:
        throw new Error(`Unsupported AI provider: ${provider}`)
    }

    if (requiresAuth && !apiKey) {
      throw new Error(`API key is not configured for provider: ${provider}. Please set it in Settings.`)
    }

    try {
      const response = await this._executeRequest(provider, apiUrl, apiKey, model, requiresAuth, request)
      
      if (cacheHash && response && response.content && supabase) {
        supabase.rpc('set_ai_cache', { p_hash: cacheHash, p_response: response.content }).then(({ error }) => {
          if (error) logger.warn('AiClient', 'Failed to set AI cache', error)
        }).catch(err => {
          logger.warn('AiClient', 'Failed to set AI cache (exception)', err)
        })
      }
      return response
    } catch (error: any) {
      throw error
    }
  }

  private _executeRequest(
    provider: string,
    apiUrl: string,
    apiKey: string,
    model: string,
    requiresAuth: boolean,
    request: AiChatRequest
  ): Promise<AiChatResponse> {
    let electronNet: any = null
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      electronNet = require('electron')?.net
    } catch {
      // Not in Electron main process
    }

    if (electronNet && typeof electronNet.request === 'function') {
      return this._executeElectronNetRequest(electronNet, provider, apiUrl, apiKey, model, requiresAuth, request)
    }

    return this._executeFetchRequest(provider, apiUrl, apiKey, model, requiresAuth, request)
  }

  private _executeElectronNetRequest(
    electronNet: any,
    provider: string,
    apiUrl: string,
    apiKey: string,
    model: string,
    requiresAuth: boolean,
    request: AiChatRequest
  ): Promise<AiChatResponse> {
    const systemMessage = request.messages.find(message => message.role === 'system')?.content
    let payload: any = {}
    
    if (provider === 'claude') {
      payload = {
        model,
        max_tokens: request.maxTokens ?? 1000,
        temperature: request.temperature ?? 0.7,
        ...(systemMessage ? { system: systemMessage } : {}),
        messages: request.messages
          .filter(message => message.role !== 'system')
          .map(message => ({ role: message.role === 'assistant' ? 'assistant' : 'user', content: message.content }))
      }
    } else if (provider === 'gemini') {
      payload = {
        contents: request.messages
          .filter(m => m.role !== 'system')
          .map(m => ({
            role: m.role === 'assistant' ? 'model' : m.role,
            parts: [{ text: m.content }]
          })),
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens ?? 1000,
          responseMimeType: request.responseFormat === 'json' ? 'application/json' : 'text/plain'
        }
      }
      if (systemMessage) {
        payload.systemInstruction = {
          parts: [{ text: systemMessage }]
        }
      }
    } else {
      payload = {
        model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 1000,
        response_format: request.responseFormat === 'json' ? { type: 'json_object' } : undefined
      }
    }

    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      const req = electronNet.request({
        method: 'POST',
        url: apiUrl
      })

      const timeoutMs = request.timeoutMs || 25000 // 25s default timeout
      const timer = setTimeout(() => {
        req.abort()
        reject(new Error(`${provider} API Error: Request timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      req.setHeader('Content-Type', 'application/json')
      
      if (provider === 'claude') {
        req.setHeader('x-api-key', apiKey)
        req.setHeader('anthropic-version', '2023-06-01')
      } else if (requiresAuth) {
        req.setHeader('Authorization', `Bearer ${apiKey}`)
      }
      
      if (provider === 'openrouter') {
        req.setHeader('HTTP-Referer', 'gamemind://app')
        req.setHeader('X-Title', 'GameMind AI')
      }

      let responseData = ''

      req.on('response', (response: any) => {
        response.on('data', (chunk: any) => {
          responseData += chunk.toString()
        })

        response.on('end', () => {
          clearTimeout(timer)
          const latencyMs = Date.now() - startTime
          
          if (response.statusCode === 200) {
            try {
              const result = JSON.parse(responseData)
              let content = ''
              let promptTokens = 0
              let completionTokens = 0
              
              if (provider === 'claude') {
                content = result.content?.[0]?.text
                promptTokens = result.usage?.input_tokens || 0
                completionTokens = result.usage?.output_tokens || 0
              } else if (provider === 'gemini') {
                content = result.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || ''
                promptTokens = result.usageMetadata?.promptTokenCount || 0
                completionTokens = result.usageMetadata?.candidatesTokenCount || 0
              } else {
                content = result.choices?.[0]?.message?.content
                promptTokens = result.usage?.prompt_tokens || 0
                completionTokens = result.usage?.completion_tokens || 0
              }

              resolve({
                content,
                provider: provider as any,
                model: result.model || model,
                tokensUsed: {
                  prompt: promptTokens,
                  completion: completionTokens,
                  total: promptTokens + completionTokens
                },
                latencyMs
              })
            } catch (error) {
              logger.error('AiClient', 'Failed to parse JSON response', error)
              reject(new Error(`Failed to parse response from ${provider}`))
            }
          } else {
            logger.error('AiClient', `API Error: ${response.statusCode}`, responseData)
            if (response.statusCode === 429 || response.statusCode === 503 || response.statusCode === 403 || response.statusCode === 413) {
              reject(new Error(`${provider} API Error ${response.statusCode} (Rate Limited or Forbidden)`))
              return
            }

            try {
              const errJson = JSON.parse(responseData)
              reject(new Error(errJson.error?.message || `${provider} API Error ${response.statusCode}`))
            } catch {
              reject(new Error(`${provider} API Error ${response.statusCode}: ${responseData}`))
            }
          }
        })
      })

      req.on('error', (error: any) => {
        clearTimeout(timer)
        logger.error('AiClient', 'Network error', error)
        reject(error)
      })

      req.write(JSON.stringify(payload))
      req.end()
    })
  }

  private async _executeFetchRequest(
    provider: string,
    apiUrl: string,
    apiKey: string,
    model: string,
    requiresAuth: boolean,
    request: AiChatRequest
  ): Promise<AiChatResponse> {
    const systemMessage = request.messages.find(message => message.role === 'system')?.content
    let payload: any = {}
    
    if (provider === 'claude') {
      payload = {
        model,
        max_tokens: request.maxTokens ?? 1000,
        temperature: request.temperature ?? 0.7,
        ...(systemMessage ? { system: systemMessage } : {}),
        messages: request.messages
          .filter(message => message.role !== 'system')
          .map(message => ({ role: message.role === 'assistant' ? 'assistant' : 'user', content: message.content }))
      }
    } else if (provider === 'gemini') {
      payload = {
        contents: request.messages
          .filter(m => m.role !== 'system')
          .map(m => ({
            role: m.role === 'assistant' ? 'model' : m.role,
            parts: [{ text: m.content }]
          })),
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens ?? 1000,
          responseMimeType: request.responseFormat === 'json' ? 'application/json' : 'text/plain'
        }
      }
      if (systemMessage) {
        payload.systemInstruction = {
          parts: [{ text: systemMessage }]
        }
      }
    } else {
      payload = {
        model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 1000,
        response_format: request.responseFormat === 'json' ? { type: 'json_object' } : undefined
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (provider === 'claude') {
      headers['x-api-key'] = apiKey
      headers['anthropic-version'] = '2023-06-01'
    } else if (requiresAuth) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = 'gamemind://app'
      headers['X-Title'] = 'GameMind AI'
    }

    const startTime = Date.now()
    const timeoutMs = request.timeoutMs || 25000

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      clearTimeout(timer)
      const latencyMs = Date.now() - startTime
      const responseData = await response.text()

      if (response.ok) {
        const result = JSON.parse(responseData)
        let content = ''
        let promptTokens = 0
        let completionTokens = 0
        
        if (provider === 'claude') {
          content = result.content?.[0]?.text
          promptTokens = result.usage?.input_tokens || 0
          completionTokens = result.usage?.output_tokens || 0
        } else if (provider === 'gemini') {
          content = result.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || ''
          promptTokens = result.usageMetadata?.promptTokenCount || 0
          completionTokens = result.usageMetadata?.candidatesTokenCount || 0
        } else {
          content = result.choices?.[0]?.message?.content
          promptTokens = result.usage?.prompt_tokens || 0
          completionTokens = result.usage?.completion_tokens || 0
        }

        return {
          content,
          provider: provider as any,
          model: result.model || model,
          tokensUsed: {
            prompt: promptTokens,
            completion: completionTokens,
            total: promptTokens + completionTokens
          },
          latencyMs
        }
      } else {
        logger.error('AiClient', `API Error: ${response.status}`, responseData)
        if (response.status === 429 || response.status === 503 || response.status === 403 || response.status === 413) {
          throw new Error(`${provider} API Error ${response.status} (Rate Limited or Forbidden)`)
        }
        try {
          const errJson = JSON.parse(responseData)
          throw new Error(errJson.error?.message || `${provider} API Error ${response.status}`)
        } catch {
          throw new Error(`${provider} API Error ${response.status}: ${responseData}`)
        }
      }
    } catch (err: any) {
      clearTimeout(timer)
      if (err.name === 'AbortError') {
        throw new Error(`${provider} API Error: Request timed out after ${timeoutMs}ms`)
      }
      throw err
    }
  }
}

export const aiClient = new AiClient()
