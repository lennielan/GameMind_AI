// ============================================================
// Timeline Prompt Builder — Anti-Cliche Directives & Few-Shot
// ============================================================

import type { TimelineEntry } from '@shared/types'

export interface PromptContext {
  persona: string
  traits: Array<{ traitName: string; traitValue: number }>
  epochs: TimelineEntry[]
  definingGames: TimelineEntry[]
  language: 'ru' | 'en'
}

export class TimelinePromptBuilder {

  public buildSystemPrompt(language: 'ru' | 'en'): string {
    const isRu = language === 'ru'

    if (isRu) {
      return `Ты — остроумный, проницательный игровой биограф-хроникер (GameMind Chronicler).
Твоя задача — описать игровую историю конкретного человека на основе реальных фактов, игровых часов и полученных достижений.

КАТЕГОРИЧЕСКИ ЗАПРЕЩЕННЫЕ ШАБЛОНЫ И КЛИШЕ (СТРОГИЙ ЗАПРЕТ):
1. ЗАПРЕЩЕНО писать общие фразы о мировой индустрии: "оказал колоссальное влияние на индустрию", "стал свидетелем революционных изменений", "шедевр геймдева", "перевернул индустрию с ног на голову", "настоящий шедевр игровой индустрии".
2. ЗАПРЕЩЕНО пересказывать сюжет или Википедию игры. Игрок и так знает, про что игра.
3. ЗАПРЕЩЕНО обобщать ("каждый уважающий себя геймер", "в эту эпоху все играли").

ОБЯЗАТЕЛЬНЫЕ ТРЕБОВАНИЯ К СТИЛЮ И СОДЕРЖАНИЮ:
1. Пиши ЛИЧНО о самом игроке: о его упорстве, странных контрастах вкуса (например, когда после 200 часов в уютной песочнице он уходит в хардкорные соулслайки), ночных марафонах и реальном времени.
2. "Что если" (What-If): строй гипотезы ТОЛЬКО вокруг самого игрока и его бэклога (например: "Если бы вы не оставили 300 часов на автоматизацию заводов в Factorio, вы бы наверняка прошли весь бэклог из 40 непройденных RPG — или защитили докторскую степень").
3. Пиши живо, образно, с легкой иронией и глубоким уважением к игровому пути.
4. ЯЗЫК: ВЕСЬ текст генерируй строго на русском языке. Ответ должен быть валидным JSON-объектом.`
    }

    return `You are a sharp, witty, perceptive gaming biographer and documentary chronicler (GameMind Chronicler).
Your mission is to write a personal chronicle of a real gamer based on verifiable playtime, epochs, and achievements.

STRICT NEGATIVE CONSTRAINTS (ANTI-CLICHE DIRECTIVES):
1. NEVER use generic marketing blurbs: "revolutionized the gaming industry", "a true masterpiece of modern gaming", "stood the test of time", "witnessed groundbreaking changes".
2. NEVER summarize the plot from Wikipedia. The player already played the game and knows what it is.
3. NEVER make universal claims about humanity ("every gamer remembers", "a landmark in history").

REQUIRED NARRATIVE PRINCIPLES:
1. Focus entirely on the PLAYER: their patience, taste pivots, intense marathons, and behavioral contrasts (e.g. going from cozy farming directly into grueling roguelikes).
2. Personalized "What If" scenarios: speculate about the player's own habits and backlog (e.g. "What if you hadn't dedicated 400 hours to Terraria? You might have cleared your entire 20-game backlog, or perhaps learned fluent Japanese").
3. Tone: intelligent, warm, slightly ironic, and deeply observant.
4. LANGUAGE: Everything MUST be in English. Output strictly valid JSON.`
  }

  public buildUserPrompt(ctx: PromptContext): string {
    const isRu = ctx.language === 'ru'

    const personaText = `Player Persona: "${ctx.persona}"
Core Traits: ${ctx.traits.map(t => `${t.traitName} (${t.traitValue}%)`).join(', ')}`

    const epochsPayload = ctx.epochs.map(e => ({
      id: e.id,
      eraName: e.metadata?.eraName,
      hoursPlayed: e.facts?.hoursPlayed,
      gamesCount: e.facts?.gamesCount,
      dominantGenres: e.facts?.dominantGenres,
      topGames: e.metadata?.games?.map((g: any) => `${g.name} (${g.hours}h)`).join(', '),
      companion: e.metadata?.companionName || 'Solo'
    }))

    const definingGamesPayload = ctx.definingGames.map(dg => ({
      id: dg.id,
      gameName: dg.metadata?.gameName || dg.title,
      hoursPlayed: dg.facts?.hoursPlayed,
      achievementsCount: dg.facts?.achievementsEarned,
      dominantGenres: dg.facts?.dominantGenres,
      globalPlaytimeSharePct: dg.facts?.globalPercent
    }))

    const fewShotExampleRu = `
ПРИМЕР ОЖИДАЕМОГО СТИЛЯ (FEW-SHOT):
Эпоха: "Ваша затяжная пауза от шутеров закончилась внезапным погружением в мрачные тактические рогалики. 180 часов проб и ошибок сформировали ваш фирменный расчетливый стиль."
Знаковая игра:
  - narrative: "Вы вложили в эту игру 310 часов, доведя каждую механику до автоматизма. Это был не просто побег от реальности, а личный полигон тактического перфекционизма."
  - alternateHistoryHypothesis: "Что если бы вы не провели здесь сотни часов? Ваш бэклог из 30 сюжетных игр вздохнул бы с облегчением, но вы бы так и не узнали вкус победы на последнем проценте здоровья."
Легенда:
  - narrative: "Ваш путь в Steam — это история эволюции от импульсивных покупок на распродажах к выверенной коллекции хардкорных миров, где каждый час был осознанным выбором."
  - futurePrediction: "Судя по возросшему интересу к глубоким системам, вашей следующей остановкой станет комплексный космический симулятор или сложная 4X-стратегия."
`

    const fewShotExampleEn = `
FEW-SHOT TONE REFERENCE:
Epoch: "Your break from mainstream shooters ended with an abrupt pivot into punishing roguelikes. 180 hours of trial and error solidified your meticulous, calculating playstyle."
Milestone Game:
  - narrative: "You poured 310 hours into this game, turning chaotic mechanics into second nature. Less of an escape, and more of a personal proving ground."
  - alternateHistoryHypothesis: "What if you hadn't spent hundreds of hours here? Your 30-game narrative backlog might have finally been conquered, but you'd never know the thrill of a clutch 1% HP victory."
Legacy:
  - narrative: "Your Steam journey traces an evolution from impulsive sale purchases to a finely curated library of demanding worlds where every hour was deliberate."
  - futurePrediction: "Given your rising affinity for intricate systems, your next obsession is destined to be a sprawling space simulation or a punishing 4X grand strategy."
`

    return `
${personaText}

${isRu ? fewShotExampleRu : fewShotExampleEn}

INPUT DATA TO CHRONICLE:

1. EPOCHS:
${JSON.stringify(epochsPayload, null, 2)}

2. MILESTONE DEFINING GAMES:
${JSON.stringify(definingGamesPayload, null, 2)}

OUTPUT SCHEMA REQUIREMENTS:
You MUST respond with a JSON object matching this exact structure:
{
  "epochs": [
    {
      "id": "<EXACT_EPOCH_ID>",
      "epochTitle": "${isRu ? 'Красивый авторский заголовок эпохи (напр. «Эпоха тактического поиска»)' : 'Evocative Epoch Title (e.g. «The Tactical Odyssey Era»)'}",
      "narrative": "${isRu ? '2-3 живых предложения без клише о роли этого периода для игрока' : '2-3 sharp sentences about this period for the player'}",
      "confidence": "high"
    }
  ],
  "milestones": [
    {
      "id": "<EXACT_MILESTONE_ID>",
      "narrative": "${isRu ? 'Персональный инсайт о связи игрока с этой игрой (без пересказа сюжета)' : 'Personal insight on the player connection to this game'}",
      "alternateHistoryHypothesis": "${isRu ? 'Что если бы вы никогда не играли в эту игру? (остроумная персональная гипотеза)' : 'What if you never played this game? (witty personal hypothesis)'}",
      "confidence": "high"
    }
  ],
  "legacy": {
    "id": "legacy-conclusion-fixed-id",
    "narrative": "${isRu ? 'Монументальное, но емкое резюме всего пути игрока' : 'Rich, concise documentary reflection on the player journey'}",
    "futurePrediction": "${isRu ? 'Куда игрока потянет дальше на основе его ДНК' : 'Where the player journey leads next based on their DNA'}",
    "confidence": "high"
  }
}
`
  }
}

export const timelinePromptBuilder = new TimelinePromptBuilder()
