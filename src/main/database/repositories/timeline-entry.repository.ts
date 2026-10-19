// ============================================================
// Timeline Entry Repository
// ============================================================

import { getDatabase, queryAll, execute } from '../database'
import type { TimelineEntry } from '@shared/types'
import { logger } from '../../logger/logger'

export class TimelineEntryRepository {
  
  public getEntries(): TimelineEntry[] {
    const rows = queryAll<any>('SELECT * FROM timeline_entries ORDER BY date DESC')
    return rows.map(row => ({
      id: row.id,
      type: row.type,
      date: row.date,
      title: row.title,
      facts: row.facts ? JSON.parse(row.facts) : undefined,
      aiInterpretation: row.ai_interpretation ? JSON.parse(row.ai_interpretation) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }))
  }

  public saveEntries(entries: TimelineEntry[]): void {
    const db = getDatabase()
    
    const insert = db.prepare(`
      INSERT INTO timeline_entries (id, type, date, title, facts, ai_interpretation, metadata)
      VALUES (@id, @type, @date, @title, @facts, @aiInterpretation, @metadata)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        facts = excluded.facts,
        ai_interpretation = excluded.ai_interpretation,
        metadata = excluded.metadata
    `)

    const insertMany = db.transaction((items: TimelineEntry[]) => {
      for (const item of items) {
        insert.run({
          id: item.id,
          type: item.type,
          date: item.date,
          title: item.title,
          facts: item.facts ? JSON.stringify(item.facts) : null,
          aiInterpretation: item.aiInterpretation ? JSON.stringify(item.aiInterpretation) : null,
          metadata: item.metadata ? JSON.stringify(item.metadata) : null
        })
      }
    })

    try {
      insertMany(entries)
      logger.info('TimelineEntryRepo', `Saved ${entries.length} entries`)
    } catch (e) {
      logger.error('TimelineEntryRepo', 'Failed to save entries', e)
      throw e
    }
  }

  public clearEntries(): void {
    execute('DELETE FROM timeline_entries')
  }
}

