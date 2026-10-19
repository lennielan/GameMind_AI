// ============================================================
// Logger — Structured logging for main process
// ============================================================

import { app } from 'electron'
import { join } from 'path'
import { appendFileSync, mkdirSync, existsSync } from 'fs'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

class Logger {
  private logDir: string
  private logFile: string
  private minLevel: LogLevel = 'info'

  constructor() {
    const userDataPath = (app && typeof app.getPath === 'function') ? app.getPath('userData') : process.cwd()
    this.logDir = join(userDataPath, 'logs')
    this.logFile = join(this.logDir, `gamemind-${this.getDateStamp()}.log`)
    this.ensureLogDir()
  }

  setLevel(level: LogLevel): void {
    this.minLevel = level
  }

  debug(context: string, message: string, data?: unknown): void {
    this.log('debug', context, message, data)
  }

  info(context: string, message: string, data?: unknown): void {
    this.log('info', context, message, data)
  }

  warn(context: string, message: string, data?: unknown): void {
    this.log('warn', context, message, data)
  }

  error(context: string, message: string, error?: unknown): void {
    const errorData =
      error instanceof Error
        ? { message: error.message, stack: error.stack, name: error.name }
        : error
    this.log('error', context, message, errorData)
  }

  private log(level: LogLevel, context: string, message: string, data?: unknown): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.minLevel]) return

    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase().padEnd(5)}] [${context}]`
    const logLine = data
      ? `${prefix} ${message} ${JSON.stringify(data)}`
      : `${prefix} ${message}`

    // Console output
    const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
    consoleMethod(logLine)

    // File output
    try {
      appendFileSync(this.logFile, logLine + '\n')
    } catch {
      // Silently fail if can't write to log file
    }
  }

  private getDateStamp(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }

  private ensureLogDir(): void {
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true })
    }
  }
}

export const logger = new Logger()
