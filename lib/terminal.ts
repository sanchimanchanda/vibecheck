import type { ChildProcessWithoutNullStreams } from 'child_process'
import { spawn } from 'child_process'

export type TerminalSession = {
  id: string
  proc: ChildProcessWithoutNullStreams
}

declare global {
  // eslint-disable-next-line no-var
  var __terminalSessions: Map<string, TerminalSession> | undefined
}

const getStore = () => {
  if (!global.__terminalSessions) global.__terminalSessions = new Map()
  return global.__terminalSessions
}

export function createSession(cwd?: string): TerminalSession {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
  const isWin = process.platform === 'win32'
  const shell = isWin ? (process.env.ComSpec || 'C\\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' || 'powershell.exe') : (process.env.SHELL || '/bin/bash')
  const args = isWin ? ['-NoLogo'] : ['-l']

  const proc = spawn(shell, args, {
    cwd: cwd || process.cwd(),
    env: { ...process.env },
    stdio: 'pipe',
    shell: false,
  })

  const session: TerminalSession = { id, proc }
  const store = getStore()
  store.set(id, session)

  proc.on('exit', () => {
    try { store.delete(id) } catch {}
  })
  proc.on('error', () => {
    try { store.delete(id) } catch {}
  })

  return session
}

export function getSession(id: string | undefined | null): TerminalSession | undefined {
  if (!id) return undefined
  return getStore().get(id)
}

export function killSession(id: string) {
  const s = getStore().get(id)
  if (!s) return
  try { s.proc.kill() } catch {}
  try { getStore().delete(id) } catch {}
}


