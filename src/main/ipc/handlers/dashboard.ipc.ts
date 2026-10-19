import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipc-channels'
import { logger } from '../../logger/logger'
import type { IpcResult } from '@shared/types'

export function registerDashboardIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.DASHBOARD_GET_DATA,
    async (): Promise<IpcResult<any>> => {
      try {
        const { dashboardEngine } = await import('../../services/dashboard/dashboard.engine')
        const data = await dashboardEngine.getDashboardData()
        return { success: true, data, error: null }
      } catch (error) {
        logger.error('DashboardIPC', 'Failed to get dashboard data', error)
        return { success: false, data: null, error: String(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.DASHBOARD_GET_WEEKLY_INSIGHT,
    async (_event, forceRefresh?: boolean): Promise<IpcResult<string>> => {
      try {
        const { weeklyInsightAiService } = await import('../../services/ai/weekly-insight-ai.service')
        const insight = await weeklyInsightAiService.getOrGenerateWeeklyInsight(forceRefresh)
        return { success: true, data: insight, error: null }
      } catch (error) {
        logger.error('DashboardIPC', 'Failed to get weekly insight', error)
        return { success: false, data: null, error: String(error) }
      }
    }
  )

  logger.info('DashboardIPC', 'Dashboard IPC handlers registered')
}
