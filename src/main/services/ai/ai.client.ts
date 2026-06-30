import { net } from 'electron'
import { logger } from '../../logger/logger'
import { configManager } from '../../config/config-manager'
import type { AiChatRequest, AiChatResponse } from '@shared/types/ai.types'

import keys from './keys.json'

const BUILTIN_GEMINI_KEY = keys.gemini || ''
const BUILTIN_GROQ_KEY = keys.groq || ''

export class AiClient {
  async generate(request: AiChatRequest, overrideProvider?: string): Promise<AiChatResponse> {
    const provider = overrideProvider || (configManager.get('aiProvider') as string) || 'gemini'
    
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
        apiUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
        apiKey = (configManager.get('geminiApiKey') as string) || BUILTIN_GEMINI_KEY
        if (apiKey === BUILTIN_GEMINI_KEY) {
          model = 'gemini-2.0-flash'
        } else {
          model = (configManager.get('geminiModel') as string) || 'gemini-2.0-flash'
        }
        break
      case 'claude':
        // Note: Anthropic's API is NOT directly OpenAI compatible, but they might have a compatibility layer, 
        // or we need a specific payload format. For simplicity in this hybrid model, we assume an OpenAI-compatible proxy 
        // or we just use OpenRouter for Claude. We'll leave it pointing to their generic or proxy if needed.
        // Actually, let's point it to a standard OpenAI compatible format if they have one, or just throw for now if not supported directly.
        // Let's use a placeholder or assume the user has a proxy if they select it natively, or use OpenRouter.
        apiUrl = 'https://api.anthropic.com/v1/messages' // Anthropic's native is different.
        apiKey = configManager.get('claudeApiKey') as string
        model = (configManager.get('claudeModel') as string) || 'claude-3-5-sonnet-20240620'
        throw new Error('Claude native API is not fully OpenAI compatible in this client yet. Use OpenRouter for Claude.')
      case 'openrouter':
        apiUrl = 'https://openrouter.ai/api/v1/chat/completions'
        apiKey = configManager.get('openrouterApiKey') as string
        model = (configManager.get('openrouterModel') as string) || 'google/gemini-2.0-flash-lite-preview-02-05:free'
        break
      case 'groq':
        apiUrl = 'https://api.groq.com/openai/v1/chat/completions'
        apiKey = (configManager.get('groqApiKey') as string) || BUILTIN_GROQ_KEY
        if (apiKey === BUILTIN_GROQ_KEY) {
          model = 'llama-3.1-8b-instant'
        } else {
          model = (configManager.get('groqModel') as string) || 'llama-3.3-70b-versatile'
        }
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
      return await this._executeRequest(provider, apiUrl, apiKey, model, requiresAuth, request)
    } catch (error: any) {
      const isRateLimit = error.message.includes('429') || error.message.includes('503') || error.message.includes('Rate Limited')
      
      if (isRateLimit && (apiKey === BUILTIN_GEMINI_KEY || apiKey === BUILTIN_GROQ_KEY) && !overrideProvider) {
        logger.warn('AiClient', `Built-in provider ${provider} is rate limited. Attempting fallback...`)
        
        const fallbackOrder = ['gemini', 'groq']
        const nextProvider = fallbackOrder.find(p => p !== provider)
        
        if (nextProvider) {
          try {
            logger.info('AiClient', `Falling back to built-in provider: ${nextProvider}`)
            return await this.generate(request, nextProvider)
          } catch (fallbackError: any) {
            logger.error('AiClient', `Fallback to ${nextProvider} failed`, fallbackError.message || fallbackError)
            throw new Error('The free built-in AI is currently busy (Rate Limited). Please try again in a few minutes, or use your own API key in Settings.')
          }
        }
      }
      
      if (isRateLimit && (apiKey === BUILTIN_GEMINI_KEY || apiKey === BUILTIN_GROQ_KEY)) {
        throw new Error('The free built-in AI is currently busy (Rate Limited). Please try again in a few minutes, or use your own API key in Settings.')
      }

      throw error
    }
  }

  private _executeRequest(provider: string, apiUrl: string, apiKey: string, model: string, requiresAuth: boolean, request: AiChatRequest): Promise<AiChatResponse> {
    const payload = {
      model: model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 1000,
      response_format: request.responseFormat === 'json' ? { type: 'json_object' } : undefined
    }

    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      const req = net.request({
        method: 'POST',
        url: apiUrl
      })

      req.setHeader('Content-Type', 'application/json')
      
      if (requiresAuth) {
        req.setHeader('Authorization', `Bearer ${apiKey}`)
      }
      
      // OpenRouter specific headers
      if (provider === 'openrouter') {
        req.setHeader('HTTP-Referer', 'gamemind://app')
        req.setHeader('X-Title', 'GameMind AI')
      }

      let responseData = ''

      req.on('response', (response) => {
        response.on('data', (chunk) => {
          responseData += chunk.toString()
        })

        response.on('end', () => {
          const latencyMs = Date.now() - startTime
          
          if (response.statusCode === 200) {
            try {
              const result = JSON.parse(responseData)
              resolve({
                content: result.choices[0].message.content,
                provider: provider as any,
                model: result.model || model,
                tokensUsed: {
                  prompt: result.usage?.prompt_tokens || 0,
                  completion: result.usage?.completion_tokens || 0,
                  total: result.usage?.total_tokens || 0
                },
                latencyMs
              })
            } catch (error) {
              logger.error('AiClient', 'Failed to parse JSON response', error)
              reject(new Error(`Failed to parse response from ${provider}`))
            }
          } else {
            logger.error('AiClient', `API Error: ${response.statusCode}`, responseData)
            
            if (response.statusCode === 429 || response.statusCode === 503) {
              reject(new Error(`${provider} API Error ${response.statusCode} (Rate Limited)`))
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

      req.on('error', (error) => {
        logger.error('AiClient', 'Network error', error)
        reject(error)
      })

      req.write(JSON.stringify(payload))
      req.end()
    })
  }
}

export const aiClient = new AiClient()
