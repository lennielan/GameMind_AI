import { steamApi } from '../steam/steam-api.client'
import { logger } from '../../logger/logger'

export interface MatchScore {
  appId: number
  name: string
  score: number // 0-100
  matchedGenres: string[]
}

export class LocalMatcher {
  /**
   * Упрощенный Jaccard Index для двух массивов строк
   */
  private calculateSimilarity(setA: string[], setB: string[]): number {
    if (setA.length === 0 || setB.length === 0) return 0
    
    const intersection = setA.filter(x => setB.includes(x))
    const union = new Set([...setA, ...setB])
    return intersection.length / union.size
  }

  /**
   * Собрать тэги/жанры для списка appId через Steam Store API.
   * Делает запросы последовательно, чтобы не спамить API.
   */
  private async fetchGenresForGames(games: { appId: number, name: string }[]): Promise<Map<number, string[]>> {
    const genresMap = new Map<number, string[]>()
    
    for (const game of games) {
      if (!game.appId) continue
      
      const details = await steamApi.getAppDetails(game.appId)
      const tags: string[] = []
      
      if (details) {
        if (details.genres) {
          details.genres.forEach((g: any) => tags.push(g.description))
        }
        if (details.categories) {
          details.categories.forEach((c: any) => tags.push(c.description))
        }
      }
      
      genresMap.set(game.appId, tags)
      
      // Небольшая задержка, чтобы не получить 429 от Steam
      await new Promise(r => setTimeout(r, 100))
    }
    
    return genresMap
  }

  /**
   * Основной алгоритм локального мэтчинга.
   * @param favoriteGames Игры, которые пользователю точно нравятся (топ по времени)
   * @param candidateGames Игры для проверки (бэклог или вишлист)
   * @param limit Сколько лучших результатов вернуть
   */
  public async getTopMatches(
    favoriteGames: { appId: number, name: string }[],
    candidateGames: { appId: number, name: string }[],
    limit: number = 3
  ): Promise<MatchScore[]> {
    logger.info('LocalMatcher', `Starting local match for ${candidateGames.length} candidates based on ${favoriteGames.length} favorites`)
    
    // 1. Получаем тэги для любимых игр
    const favoriteGenresMap = await this.fetchGenresForGames(favoriteGames)
    
    // Создаем единый профиль "ДНК" жанров пользователя (сет уникальных жанров, которые ему нравятся)
    const userGenreSet = new Set<string>()
    favoriteGenresMap.forEach(genres => {
      genres.forEach(g => userGenreSet.add(g))
    })
    const userProfileGenres = Array.from(userGenreSet)
    
    // 2. Получаем тэги для кандидатов
    const candidateGenresMap = await this.fetchGenresForGames(candidateGames)
    
    // 3. Считаем скоринг
    const scores: MatchScore[] = []
    
    for (const candidate of candidateGames) {
      const genres = candidateGenresMap.get(candidate.appId) || []
      
      // Если жанров нет, даем базовый скор 50
      if (genres.length === 0) {
        scores.push({
          appId: candidate.appId,
          name: candidate.name,
          score: 50,
          matchedGenres: []
        })
        continue
      }
      
      const similarity = this.calculateSimilarity(userProfileGenres, genres)
      
      // Переводим 0-1 в 50-99 (чтобы скор выглядел реалистично, как в Steam)
      const normalizedScore = Math.floor(50 + (similarity * 49))
      const matchedGenres = genres.filter(g => userProfileGenres.includes(g))
      
      scores.push({
        appId: candidate.appId,
        name: candidate.name,
        score: normalizedScore,
        matchedGenres
      })
    }
    
    // 4. Сортируем и берем топ
    scores.sort((a, b) => b.score - a.score)
    return scores.slice(0, limit)
  }
}

export const localMatcher = new LocalMatcher()
