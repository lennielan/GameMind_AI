import { configManager } from '../../../config/config-manager'

export class GameHardwareEvaluator {
  /**
   * Evaluates if a game can run on the current PC specs based on heuristics.
   * Accuracy target: 99% for standard Steam games.
   */
  evaluate(game: any, pcSpecs: string): string {
    const isRussian = configManager.get('language') === 'ru'
    
    const fallbackFine = isRussian ? 'Пойдет отлично' : 'Runs Fine'
    const fallbackHigh = isRussian ? 'Пойдет на высоких' : 'Runs on High'
    const fallbackStruggle = isRussian ? 'Возможны просадки' : 'Might struggle'

    if (!game || !pcSpecs) return fallbackFine

    const specsLower = pcSpecs.toLowerCase()
    
    // CPU classification
    const hasHighEndCpu = /i7|i9|ryzen 7|ryzen 9|m1 pro|m1 max|m2|m3/i.test(specsLower)
    const hasMidCpu = /i5|ryzen 5/i.test(specsLower)
    
    // GPU classification
    const hasDedicatedGpu = /rtx|gtx|radeon rx|arc/i.test(specsLower)
    const hasHighEndGpu = /rtx 30|rtx 40|rtx 50|rx 60|rx 70|rx 79/i.test(specsLower)
    const hasMidGpu = /rtx 20|gtx 16|gtx 10|rx 50|rx 5000/i.test(specsLower)
    
    // Memory classification
    const ramMatch = specsLower.match(/(\d+)\s*gb/i)
    const ramGb = ramMatch ? parseInt(ramMatch[1], 10) : 16

    // Game requirements estimation
    const yearMatch = game.releaseDate ? game.releaseDate.match(/\d{4}/) : null
    const year = yearMatch ? parseInt(yearMatch[0], 10) : 2015

    // Detect if game is historically heavy / demanding
    const gameName = (game.name || game.gameName || '').toLowerCase()
    const isHeavyGame = /cyberpunk|starfield|alan wake 2|hogwarts|dragon's dogma 2|jedi survivor|tlou|last of us|cities skylines ii|ark: survival ascended|black myth|hellblade ii/i.test(gameName)
    
    // Detect if game is historically light
    const isLightGame = /stardew|terraria|undertale|hollow knight|celeste|vampire survivors|brotato|slay the spire|balatro|binding of isaac|dead cells|hades/i.test(gameName)
    const tags = (game.tags || []).map((t: string) => t.toLowerCase())
    const isPixelGraphics = tags.includes('pixel graphics') || tags.includes('2d')
    const isEsports = tags.includes('e-sports') || /cs:go|counter-strike 2|dota 2|valorant|apex legends|league of legends|rocket league/.test(gameName)
    const is3D = tags.includes('3d') || tags.includes('realistic') || tags.includes('open world') || tags.includes('fps') || tags.includes('third person') || tags.includes('action rpg') || tags.includes('shooter')

    // SCORING
    let pcScore = 0
    if (hasHighEndGpu) pcScore += 50
    else if (hasMidGpu) pcScore += 30
    else if (hasDedicatedGpu) pcScore += 20
    else pcScore += 5 // iGPU yields almost no graphics points
    
    if (hasHighEndCpu) pcScore += 20
    else if (hasMidCpu) pcScore += 10
    else pcScore += 5
    
    if (ramGb >= 32) pcScore += 15
    else if (ramGb >= 16) pcScore += 10
    else if (ramGb >= 8) pcScore += 5
    
    let gameDemandScore = 0
    // Base demand by year
    if (year >= 2024) gameDemandScore = 70
    else if (year >= 2022) gameDemandScore = 60
    else if (year >= 2020) gameDemandScore = 50
    else if (year >= 2017) gameDemandScore = 40
    else if (year >= 2013) gameDemandScore = 30
    else gameDemandScore = 15

    // Heavy modifiers
    if (isHeavyGame) gameDemandScore += 25
    if (isLightGame || isPixelGraphics) gameDemandScore -= 30
    if (isEsports) gameDemandScore -= 15
    
    // iGPU Death Penalty for modern 3D games
    if (!hasDedicatedGpu && is3D && year >= 2015) {
      gameDemandScore += 20
    }
    
    // Final evaluation thresholds
    const diff = pcScore - gameDemandScore
    
    if (diff >= 15) return fallbackHigh
    if (diff >= -5) return fallbackFine
    return fallbackStruggle
  }
}

export const gameHardwareEvaluator = new GameHardwareEvaluator()
