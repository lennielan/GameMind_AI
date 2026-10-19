import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipc-channels'
import { logger } from '../../logger/logger'
import type { IpcResult } from '@shared/types'

export function registerJournalIpc(): void {
  // Get all journals
  ipcMain.handle(
    IPC_CHANNELS.JOURNAL_GET_ALL,
    async (): Promise<IpcResult<any[]>> => {
      try {
        const { journalAiService } = await import('../../services/ai/journal-ai.service')
        const journals = journalAiService.getAllJournals()
        return { success: true, data: journals, error: null }
      } catch (error) {
        logger.error('JournalIPC', 'Failed to get journals', error)
        return { success: false, data: null, error: String(error) }
      }
    }
  )

  // Check for pending months and generate them
  ipcMain.handle(
    IPC_CHANNELS.JOURNAL_GENERATE_PENDING,
    async (): Promise<IpcResult<any[]>> => {
      try {
        // Sync Steam data first
        const { syncEngine } = await import('../../services/steam/sync-engine')
        try {
          if (!syncEngine.getStatus().isRunning) {
            await syncEngine.startSync()
          } else {
            let waited = 0
            while (syncEngine.getStatus().isRunning && waited < 30000) {
              await new Promise(resolve => setTimeout(resolve, 1000))
              waited += 1000
            }
          }
        } catch (e) {
          logger.warn('JournalIPC', 'Background sync failed, proceeding with local data', e)
        }

        const { journalAiService } = await import('../../services/ai/journal-ai.service')
        const newJournals = await journalAiService.generatePendingJournals()
        return { success: true, data: newJournals, error: null }
      } catch (error) {
        logger.error('JournalIPC', 'Failed to generate pending journals', error)
        return { success: false, data: null, error: String(error) }
      }
    }
  )

  // Check pending months (no generation, just list)
  ipcMain.handle(
    IPC_CHANNELS.JOURNAL_CHECK_PENDING,
    async (): Promise<IpcResult<string[]>> => {
      try {
        const { journalEngine } = await import('../../services/journal/journal.engine')
        const pending = journalEngine.getPendingMonths()
        return { success: true, data: pending, error: null }
      } catch (error) {
        logger.error('JournalIPC', 'Failed to check pending', error)
        return { success: false, data: null, error: String(error) }
      }
    }
  )

  // Mark journal as viewed
  ipcMain.handle(
    IPC_CHANNELS.JOURNAL_MARK_VIEWED,
    async (_event, month: string): Promise<IpcResult<boolean>> => {
      try {
        const { journalEngine } = await import('../../services/journal/journal.engine')
        journalEngine.markViewed(month)
        return { success: true, data: true, error: null }
      } catch (error) {
        logger.error('JournalIPC', 'Failed to mark viewed', error)
        return { success: false, data: null, error: String(error) }
      }
    }
  )

  // Check if there are unviewed journals
  ipcMain.handle(
    IPC_CHANNELS.JOURNAL_HAS_NEW,
    async (): Promise<IpcResult<boolean>> => {
      try {
        const { journalEngine } = await import('../../services/journal/journal.engine')
        const hasNew = journalEngine.hasUnviewedJournals()
        return { success: true, data: hasNew, error: null }
      } catch (error) {
        logger.error('JournalIPC', 'Failed to check new journals', error)
        return { success: false, data: null, error: String(error) }
      }
    }
  )

  // Admin: Force generate a month (bypassing v2 existence check)
  ipcMain.handle(
    IPC_CHANNELS.JOURNAL_ADMIN_GENERATE,
    async (_event, month: string): Promise<IpcResult<any>> => {
      try {
        const { supabase } = await import('../../services/supabase.client')
        if (supabase) {
          const { data: session } = await supabase.auth.getSession()
          if (!session?.session?.user) {
            return { success: false, data: null, error: 'Unauthorized: No active session' }
          }
          const { data: user } = await supabase.from('users').select('role').eq('id', session.session.user.id).single()
          if (user?.role !== 'admin') {
            return { success: false, data: null, error: 'Unauthorized: Not an admin' }
          }
        }

        const { journalEngine } = await import('../../services/journal/journal.engine')
        const { journalAiService } = await import('../../services/ai/journal-ai.service')
        
        // We delete first to bypass the "don't overwrite v2" check
        const { execute } = await import('../../database/database')
        execute('DELETE FROM game_journals WHERE month = ?', [month])
        
        const journal = await journalAiService.generateMonthlyJournal(month)
        return { success: true, data: journal, error: null }
      } catch (error) {
        logger.error('JournalIPC', `Admin generate failed for ${month}`, error)
        return { success: false, data: null, error: String(error) }
      }
    }
  )

  // Admin: Delete a journal
  ipcMain.handle(
    IPC_CHANNELS.JOURNAL_ADMIN_DELETE,
    async (_event, month: string): Promise<IpcResult<boolean>> => {
      try {
        const { supabase } = await import('../../services/supabase.client')
        if (supabase) {
          const { data: session } = await supabase.auth.getSession()
          if (!session?.session?.user) {
            return { success: false, data: null, error: 'Unauthorized: No active session' }
          }
          const { data: user } = await supabase.from('users').select('role').eq('id', session.session.user.id).single()
          if (user?.role !== 'admin') {
            return { success: false, data: null, error: 'Unauthorized: Not an admin' }
          }
        }

        const { execute } = await import('../../database/database')
        execute('DELETE FROM game_journals WHERE month = ?', [month])
        return { success: true, data: true, error: null }
      } catch (error) {
        logger.error('JournalIPC', `Admin delete failed for ${month}`, error)
        return { success: false, data: null, error: String(error) }
      }
    }
  )

  logger.info('JournalIPC', 'Journal v2 IPC handlers registered')
}
