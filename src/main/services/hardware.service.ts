import si from 'systeminformation'
import { logger } from '../logger/logger'

export class HardwareService {
  async getSpecs(): Promise<string> {
    try {
      logger.info('HardwareService', 'Gathering system specifications...')
      
      const cpu = await si.cpu()
      const graphics = await si.graphics()
      const mem = await si.mem()

      const cpuInfo = `${cpu.manufacturer} ${cpu.brand}`.trim()
      const gpuInfo = graphics.controllers.map(c => c.model).join(' / ') || 'Unknown GPU'
      const memInfo = `${Math.round(mem.total / (1024 * 1024 * 1024))}GB RAM`

      const specString = `CPU: ${cpuInfo}, GPU: ${gpuInfo}, RAM: ${memInfo}`
      
      logger.info('HardwareService', `Specs gathered: ${specString}`)
      return specString
    } catch (error) {
      logger.error('HardwareService', 'Failed to gather hardware specs', error)
      return 'Unknown Hardware Specs'
    }
  }
}

export const hardwareService = new HardwareService()
