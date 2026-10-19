import { aiClient } from './ai/ai.client'
import { configManager } from '../config/config-manager'
import { favoritesRepository } from '../database/repository.factory'

export class FavoritesService {
  public async generateAiReview(steamId: string, gameName: string, context?: string, force: boolean = false): Promise<string> {
    if (!force) {
      const cached = await favoritesRepository.getAiReview(steamId, gameName)
      if (cached) return cached
    }

    const language = configManager.get('language') || 'Russian'
    const isRu = language.toLowerCase().includes('ru') || language === 'Russian'

    const systemPrompt = isRu
      ? `Ты — GameMind AI, эрудированный и вдохновляющий игровой компаньон. Твоя цель — рассказать об игре живо, интересно и со знанием дела, как опытный геймер своему другу.

ПРАВИЛА НАПИСАНИЯ:
1. Тон: Живой, увлекательный, экспертный. Без шаблонной сухости и Википедии.
2. Формат: Ровно 2-3 связных, содержательных абзаца на русском языке (разделяй абзацы пустой строкой).
   - 1 абзац: В чем уникальная суть, атмосфера и главная идея игры.
   - 2 абзац: Почему игровой процесс так затягивает (ключевые механики, глубина, челлендж или динамика).
   - 3 абзац: Кому и какие эмоции дарит этот игровой опыт.
3. Ограничения:
   - Избегай занудных шаблонов вроде "Игрок может...", "Игрок должен...", "Главная цель игры заключается в...".
   - Будь на 100% точен в реальных механиках (никаких выдуманных фактов).
   - Пиши законченными предложениями, не обрывай мысль на полуслове.
   - Не используй markdown-разметку (никаких **, списков, заголовков). Только чистый текст.
   - Не переводи оригинальное название игры.`
      : `You are GameMind AI, an insightful and passionate gaming companion. Your goal is to describe the game in an engaging, knowledgeable way, like an experienced gamer recommending it to a friend.

RULES:
1. Tone: Engaging, articulate, gamer-centric. Avoid dry Wikipedia summaries.
2. Format: Exactly 2-3 cohesive paragraphs in English (separated by a blank line).
   - Paragraph 1: The core hook, premise, and unique atmosphere.
   - Paragraph 2: Why the gameplay loop is so compelling (mechanics, depth, challenge).
   - Paragraph 3: The player experience, emotions, and vibe it delivers.
3. Constraints:
   - Avoid repetitive phrasing ("The player can...", "The player must...", "The main goal is...").
   - Be 100% factually accurate to the actual game.
   - Finish all thoughts completely without cutting off.
   - Do NOT use markdown asterisks or bullet lists. Plain text paragraphs only.
   - Keep the original game title unchanged.`

    const userPrompt = isRu
      ? `Игра: "${gameName}"${context && context !== 'None' ? `\nКраткое инфо: ${context}` : ''}\n\nНапиши увлекательный обзор компаньона (2-3 абзаца на русском языке).`
      : `Game: "${gameName}"${context && context !== 'None' ? `\nBrief info: ${context}` : ''}\n\nWrite an engaging companion overview (2-3 paragraphs in English).`

    const response = await aiClient.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      maxTokens: 4000
    })
    const reviewText = response.content.trim()

    await favoritesRepository.updateAiReview(steamId, gameName, reviewText)
    
    return reviewText
  }
}

export const favoritesService = new FavoritesService()
