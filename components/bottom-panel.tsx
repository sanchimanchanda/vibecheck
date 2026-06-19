'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bug, ChevronsDown, ChevronsDownUp, FileWarning, List as ListIcon, ListFilter, Play, Plus, Terminal, Trash2, X, FileDown } from 'lucide-react'

type RiskLevel = 'critical' | 'high' | 'medium' | 'low'

interface VulnerabilityMessage {
  id: number
  type: string
  risk: string
  riskLevel: RiskLevel
  file: string
  line: number
  message: string
  suggestion: string
  timestamp: Date
  cweId?: string
}

type LogLevel = 'log' | 'info' | 'warn' | 'error'

interface LogEntry {
  id: string
  level: LogLevel
  message: any[]
  timestamp: number
}

interface FetchEntry {
  id: string
  url: string
  method: string
  status?: number
  ok?: boolean
  durationMs?: number
  startedAt: number
  finishedAt?: number
}

interface BottomPanelProps {
  vulnerabilities: VulnerabilityMessage[]
  onOpenLocation?: (file: string, line?: number) => void
  onRunScan?: () => void
  currentModel?: string
  onSetModel?: (model: string) => void
}

type UITerminal = {
  key: string
  title: string
  sessionId: string | null
  lines: string[]
  input: string
  cwd: string
  isConnecting: boolean
  autoScroll: boolean
  isAtBottom: boolean
}

export default function BottomPanel({ vulnerabilities, onOpenLocation, onRunScan, currentModel, onSetModel }: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<'problems' | 'output' | 'terminal'>('problems')
  const [filter, setFilter] = useState<RiskLevel | 'all'>('all')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [terminals, setTerminals] = useState<UITerminal[]>([
    {
      key: 't1',
      title: 'Terminal 1',
      sessionId: null,
      lines: ["Type 'help' to see available commands."],
      input: '',
      cwd: '',
      isConnecting: false,
      autoScroll: true,
      isAtBottom: true,
    },
  ])
  const [activeTerminalKey, setActiveTerminalKey] = useState<string>('t1')
  const outputRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  const stripAnsi = (input: string): string => {
    try {
      return input.replace(/\x1B\[[0-?]*[ -\/]*[@-~]/g, '').replace(/\r/g, '')
    } catch {
      return input
    }
  }

  // Console interception
  useEffect(() => {
    const original = { ...console }
    const handler = (level: LogLevel) => (...args: any[]) => {
      setLogs((prev) => [...prev, { id: Date.now().toString() + Math.random(), level, message: args, timestamp: Date.now() }])
      // @ts-ignore
      original[level](...args)
    }
    console.log = handler('log') as any
    console.info = handler('info') as any
    console.warn = handler('warn') as any
    console.error = handler('error') as any
    return () => {
      console.log = original.log
      console.info = original.info
      console.warn = original.warn
      console.error = original.error
    }
  }, [])

  // Auto-detect project cwd from server
  useEffect(() => {
    const init = async () => {
      try {
        const saved = (() => { try { return localStorage.getItem('vibe_term_cwd') || '' } catch { return '' } })()
        if (saved) {
          setTerminals(prev => prev.map((t, i) => i === 0 ? { ...t, cwd: saved } : t))
          return
        }
        const res = await fetch('/api/env/cwd')
        const data = await res.json()
        if (res.ok && data?.cwd) setTerminals(prev => prev.map((t, i) => i === 0 ? { ...t, cwd: data.cwd } : t))
      } catch {}
    }
    init()
  }, [])

  // No fetch interception; Ports tab removed

  const getActiveTerminal = (): UITerminal => terminals.find(t => t.key === activeTerminalKey) || terminals[0]
  const updateActiveTerminal = (patch: Partial<UITerminal>) => {
    setTerminals(prev => prev.map(t => t.key === activeTerminalKey ? { ...t, ...patch } : t))
  }
  const appendToTerminal = (key: string, text: string) => {
    const clean = stripAnsi(text)
    setTerminals(prev => prev.map(t => t.key === key ? { ...t, lines: [...t.lines, clean] } : t))
  }

  useEffect(() => {
    const active = getActiveTerminal()
    if (activeTab === 'output' && outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
    if (activeTab === 'terminal' && terminalRef.current && (active.autoScroll || active.isAtBottom)) terminalRef.current.scrollTop = terminalRef.current.scrollHeight
  }, [logs, terminals, activeTab])

  // Track whether terminal is scrolled to bottom to show overlay button
  useEffect(() => {
    const el = terminalRef.current
    if (!el) return
    const check = () => {
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8
      updateActiveTerminal({ isAtBottom: nearBottom })
    }
    check()
    el.addEventListener('scroll', check)
    return () => el.removeEventListener('scroll', check)
  }, [terminalRef.current, activeTab, activeTerminalKey])

  const filteredVulns = useMemo(() => {
    return filter === 'all' ? vulnerabilities : vulnerabilities.filter(v => v.riskLevel === filter)
  }, [vulnerabilities, filter])

  const riskBadge = (level: RiskLevel) => {
    switch (level) {
      case 'critical': return 'text-red-400 border-red-400/40 bg-red-500/10'
      case 'high': return 'text-orange-400 border-orange-400/40 bg-orange-500/10'
      case 'medium': return 'text-yellow-400 border-yellow-400/40 bg-yellow-500/10'
      default: return 'text-blue-400 border-blue-400/40 bg-blue-500/10'
    }
  }

  const appendTerminal = (line: string) => appendToTerminal(activeTerminalKey, line)

  // Export vulnerabilities as a print-friendly PDF using the browser print dialog
  const exportVulnerabilitiesAsPDF = async () => {
    const bySeverity: Record<RiskLevel, typeof vulnerabilities> = {
      critical: [], high: [], medium: [], low: []
    }
    for (const v of vulnerabilities) bySeverity[v.riskLevel].push(v)

    const escape = (s: any) => String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

    const section = (level: RiskLevel, color: string) => {
      const list = bySeverity[level]
      if (list.length === 0) return ''
      return `
        <h2 style="margin:24px 0 8px;font-size:16px;color:${color};border-bottom:1px solid #e5e7eb;padding-bottom:4px">${level.toUpperCase()} (${list.length})</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:12px">
          <thead>
            <tr>
              <th style="text-align:left;border-bottom:1px solid #e5e7eb;padding:6px 8px">Type</th>
              <th style="text-align:left;border-bottom:1px solid #e5e7eb;padding:6px 8px">File:Line</th>
              <th style="text-align:left;border-bottom:1px solid #e5e7eb;padding:6px 8px">Message</th>
              <th style="text-align:left;border-bottom:1px solid #e5e7eb;padding:6px 8px">Suggestion</th>
              <th style="text-align:left;border-bottom:1px solid #e5e7eb;padding:6px 8px">CWE</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(v => `
              <tr>
                <td style="vertical-align:top;border-bottom:1px solid #f1f5f9;padding:6px 8px;white-space:nowrap">${escape(v.type)}</td>
                <td style="vertical-align:top;border-bottom:1px solid #f1f5f9;padding:6px 8px;white-space:nowrap">${escape(v.file)}:${escape(v.line)}</td>
                <td style="vertical-align:top;border-bottom:1px solid #f1f5f9;padding:6px 8px;">${escape(v.message)}</td>
                <td style="vertical-align:top;border-bottom:1px solid #f1f5f9;padding:6px 8px;">${escape(v.suggestion)}</td>
                <td style="vertical-align:top;border-bottom:1px solid #f1f5f9;padding:6px 8px;white-space:nowrap">${escape(v.cweId || '')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
    }

    const now = new Date()
    const counts = {
      critical: bySeverity.critical.length,
      high: bySeverity.high.length,
      medium: bySeverity.medium.length,
      low: bySeverity.low.length,
      total: vulnerabilities.length,
    }

    const html = `
      <div id="vibe-report" style="width:794px; padding:24px; box-sizing:border-box; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; color:#0f172a;">
        <h1 style="margin:0 0 4px;font-size:22px">Security Vulnerability Report</h1>
        <div style="color:#64748b;font-size:12px;margin-bottom:12px">Generated: ${now.toLocaleString()}</div>
        <div style="margin:8px 0 16px">
          <span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:12px;margin-right:8px;background:#fee2e2;color:#991b1b">Critical: ${counts.critical}</span>
          <span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:12px;margin-right:8px;background:#ffedd5;color:#9a3412">High: ${counts.high}</span>
          <span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:12px;margin-right:8px;background:#fef9c3;color:#854d0e">Medium: ${counts.medium}</span>
          <span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:12px;margin-right:8px;background:#dbeafe;color:#1e3a8a">Low: ${counts.low}</span>
          <span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:12px;margin-right:8px;background:#e5e7eb;color:#111827">Total: ${counts.total}</span>
        </div>
        ${section('critical', '#991b1b')}
        ${section('high', '#9a3412')}
        ${section('medium', '#854d0e')}
        ${section('low', '#1e3a8a')}
      </div>
    `

    // Create hidden container
    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.left = '0'
    container.style.top = '0'
    container.style.opacity = '0'
    container.style.pointerEvents = 'none'
    container.style.zIndex = '-1'
    container.style.width = '794px' // ~A4 width at 96dpi for better rendering
    container.innerHTML = html
    document.body.appendChild(container)
    // Ensure the browser lays out the content before capture
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

    // Load html2pdf bundle from CDN safely even with AMD present; avoid duplicate loads
    const ensureHtml2Pdf = () => new Promise<void>((resolve, reject) => {
      const g: any = window as any
      if (g.__vibe_html2pdf_loading) {
        const check = () => { if (g.html2pdf) resolve(); else setTimeout(check, 50) }
        check();
        return
      }
      if (g.html2pdf && (typeof g.html2pdf === 'function' || typeof g.html2pdf?.default === 'function')) return resolve()
      g.__vibe_html2pdf_loading = true
      const prevDefine = (g as any).define
      const hadAmd = prevDefine && (prevDefine as any).amd
      try { if (hadAmd) (g as any).define = undefined } catch {}
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js'
      script.async = true
      script.onload = () => {
        try { if (hadAmd) (g as any).define = prevDefine } catch {}
        g.__vibe_html2pdf_loading = false
        resolve()
      }
      script.onerror = () => {
        try { if (hadAmd) (g as any).define = prevDefine } catch {}
        g.__vibe_html2pdf_loading = false
        reject(new Error('Failed to load PDF generator'))
      }
      document.body.appendChild(script)
    })

    try {
      await ensureHtml2Pdf()
      const g: any = window as any
      const html2pdfFn = typeof g.html2pdf === 'function' ? g.html2pdf : (typeof g.html2pdf?.default === 'function' ? g.html2pdf.default : null)
      if (!html2pdfFn) throw new Error('PDF generator not available')
      const target = container.querySelector('#vibe-report') as HTMLElement | null
      if (!target) throw new Error('Report content not found')
      const fileName = `security-report-${now.toISOString().replace(/[:.]/g, '-')}.pdf`
      const opt = {
        margin:       [10, 10],
        filename:     fileName,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 1.8, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'] },
      }
      await html2pdfFn().set(opt).from(target).save()
    } catch (e) {
      console.error(e)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      document.body.removeChild(container)
    }
  }

  const handleTerminalCommand = async (raw: string) => {
    const input = raw.trim()
    if (!input) return
    appendTerminal(`> ${input}`)
    const [cmd, ...rest] = input.split(' ')
    const args = rest
    switch (cmd.toLowerCase()) {
      case 'help':
        appendTerminal('Available commands:')
        appendTerminal('  help                 Show this help')
        appendTerminal('  clear                Clear terminal output')
        appendTerminal('  scan                 Run vulnerability scan')
        appendTerminal('  open <file>[:n]      Open file, optionally at line n')
        appendTerminal('  model [name]         Show or set current AI model')
        appendTerminal('  connect [path]       Start shell in path (server)')
        appendTerminal('  cwd                  Show working directory (client pref)')
        appendTerminal('  kill                 Stop current terminal session')
        appendTerminal('  new                  Open an additional terminal')
        appendTerminal('  Any other text is sent to the shell if connected')
        break
      case 'clear':
        updateActiveTerminal({ lines: [] })
        break
      case 'connect': {
        try {
          updateActiveTerminal({ isConnecting: true })
          const saved = (() => { try { return localStorage.getItem('vibe_term_cwd') || '' } catch { return '' } })()
          const cwd = args.join(' ').trim() || getActiveTerminal().cwd || saved || ''
          const res = await fetch('/api/terminal/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cwd }) })
          const text = await res.text()
          let data: any
          try { data = JSON.parse(text) } catch { throw new Error(`Unexpected response from server: ${text?.slice(0, 60)}`) }
          if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to start session')
          const thisKey = activeTerminalKey
          setTerminals(prev => prev.map(t => t.key === thisKey ? { ...t, sessionId: data.sessionId, cwd: data.cwd || cwd || t.cwd } : t))
          const effective = data.cwd || cwd
          appendTerminal(`Connected. Session: ${data.sessionId}${effective ? ` • cwd: ${effective}` : ''}${data.usedFallback ? ' (fallback used)' : ''}`)
          if (effective) { try { localStorage.setItem('vibe_term_cwd', effective) } catch {} }
          // stream
          const streamRes = await fetch(`/api/terminal/stream?sessionId=${encodeURIComponent(data.sessionId)}`)
          const reader = streamRes.body?.getReader()
          const dec = new TextDecoder()
          const pump = async () => {
            if (!reader) return
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              const text = dec.decode(value)
              appendToTerminal(thisKey, stripAnsi(text))
            }
          }
          pump()
        } catch (e: any) {
          appendTerminal(`Failed to connect: ${e?.message || e}`)
        } finally {
          updateActiveTerminal({ isConnecting: false })
        }
        break
      }
      case 'cwd':
        appendTerminal(`Client CWD preference: ${getActiveTerminal().cwd || '(not set)'}`)
        break
      case 'kill':
        if (!getActiveTerminal().sessionId) { appendTerminal('No active session') ; break }
        try {
          await fetch('/api/terminal/kill', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: getActiveTerminal().sessionId }) })
          appendTerminal(`Killed session ${getActiveTerminal().sessionId}`)
        } catch {}
        updateActiveTerminal({ sessionId: null })
        break
      case 'scan':
        if (onRunScan) onRunScan()
        else appendTerminal('Scan function not available in this context.')
        break
      case 'open': {
        const target = args.join(' ')
        if (!target) { appendTerminal('Usage: open <file>[:line]'); break }
        const [file, lineStr] = target.split(':')
        const line = lineStr ? parseInt(lineStr, 10) : undefined
        onOpenLocation ? onOpenLocation(file, line) : appendTerminal('Open handler not available.')
        break
      }
      case 'model':
        if (args.length === 0) {
          appendTerminal(`Current model: ${currentModel || 'unknown'}`)
        } else {
          const name = args.join(' ')
          onSetModel ? (onSetModel(name), appendTerminal(`Model set to: ${name}`)) : appendTerminal('Model setter not available.')
        }
        break
      case 'new':
        addTerminal()
        appendTerminal('Opened a new terminal.')
        break
      default:
        if (getActiveTerminal().sessionId) {
          try {
            await fetch('/api/terminal/input', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: getActiveTerminal().sessionId, data: raw + '\n' }) })
          } catch (e: any) {
            appendTerminal(`send error: ${e?.message || e}`)
          }
        } else {
          appendTerminal(`Not connected. Type 'connect [path]' to start a shell.`)
        }
    }
  }

  const addTerminal = () => {
    const idx = terminals.length + 1
    const key = 't' + Date.now().toString(36)
    const saved = (() => { try { return localStorage.getItem('vibe_term_cwd') || '' } catch { return '' } })()
    const t: UITerminal = {
      key,
      title: `Terminal ${idx}`,
      sessionId: null,
      lines: ["Type 'help' to see available commands."],
      input: '',
      cwd: saved,
      isConnecting: false,
      autoScroll: true,
      isAtBottom: true,
    }
    setTerminals(prev => [...prev, t])
    setActiveTerminalKey(key)
  }

  const closeTerminal = (key: string) => {
    const t = terminals.find(tt => tt.key === key)
    if (t?.sessionId) {
      fetch('/api/terminal/kill', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: t.sessionId }) }).catch(() => {})
    }
    setTerminals(prev => prev.filter(tt => tt.key !== key))
    setTimeout(() => {
      setTerminals(prev => {
        if (prev.length === 0) {
          const key2 = 't' + Date.now().toString(36)
          const nt: UITerminal = { key: key2, title: 'Terminal 1', sessionId: null, lines: ["Type 'help' to see available commands."], input: '', cwd: '', isConnecting: false, autoScroll: true, isAtBottom: true }
          setActiveTerminalKey(key2)
          return [nt]
        }
        if (!prev.some(x => x.key === activeTerminalKey)) setActiveTerminalKey(prev[0].key)
        return prev
      })
    }, 0)
  }

  // Debug console removed

  const counts = useMemo(() => {
    const base = { critical: 0, high: 0, medium: 0, low: 0 }
    for (const v of vulnerabilities) (base as any)[v.riskLevel]++
    return base
  }, [vulnerabilities])

  // Ports tab removed

  return (
    <div className="h-full flex flex-col bg-black/40 backdrop-blur-2xl">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <ChevronsDownUp className="w-3.5 h-3.5" />
          <span>Bottom Panel</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="text-xs">{vulnerabilities.length} problems</Badge>
          <Badge variant="outline" className="text-xs">{logs.length} logs</Badge>
          
          <Button size="sm" className="h-7 px-2 text-xs bg-white/10 hover:bg-white/15" onClick={exportVulnerabilitiesAsPDF}>
            <FileDown className="w-3 h-3 mr-1" /> Export PDF
          </Button>

          {onRunScan && (
            <Button size="sm" className="h-7 px-2 text-xs bg-white/10 hover:bg-white/15" onClick={onRunScan}>
              <Play className="w-3 h-3 mr-1" /> Analyze
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="h-full flex flex-col">
          <div className="px-2 pt-2">
            <div className="inline-flex items-center gap-1 bg-white/5 rounded p-1 border border-white/10">
              <TabsList className="bg-transparent p-0 h-8">
                <TabsTrigger value="problems" className="data-[state=active]:bg-white/10">
                  <FileWarning className="w-3.5 h-3.5 mr-1" /> Problems
                </TabsTrigger>
                <TabsTrigger value="output" className="data-[state=active]:bg-white/10">
                  <ListIcon className="w-3.5 h-3.5 mr-1" /> Output
                </TabsTrigger>
                <TabsTrigger value="terminal" className="data-[state=active]:bg-white/10">
                  <Terminal className="w-3.5 h-3.5 mr-1" /> Terminal
                </TabsTrigger>
                
              </TabsList>
            </div>
          </div>

          <TabsContent value="problems" className="flex-1 px-3 pb-3">
            <div className="flex items-center gap-2 py-2">
              <ListFilter className="w-3.5 h-3.5 text-white/50" />
              <button className={`text-xs px-2 py-1 rounded border ${filter === 'all' ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`} onClick={() => setFilter('all')}>All</button>
              <button className={`text-xs px-2 py-1 rounded border ${filter === 'critical' ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`} onClick={() => setFilter('critical')}>Critical ({counts.critical})</button>
              <button className={`text-xs px-2 py-1 rounded border ${filter === 'high' ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`} onClick={() => setFilter('high')}>High ({counts.high})</button>
              <button className={`text-xs px-2 py-1 rounded border ${filter === 'medium' ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`} onClick={() => setFilter('medium')}>Medium ({counts.medium})</button>
              <button className={`text-xs px-2 py-1 rounded border ${filter === 'low' ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`} onClick={() => setFilter('low')}>Low ({counts.low})</button>
            </div>
            <div className="h-[calc(100%-2.5rem)]">
              <ScrollArea className="h-full">
                <div className="space-y-2 pr-2">
                  {filteredVulns.length === 0 ? (
                    <div className="text-xs text-white/40 py-6 text-center">No problems found.</div>
                  ) : (
                    filteredVulns.map((v) => (
                      <div key={v.id} className="p-2 bg-white/5 rounded border border-white/10 hover:bg-white/10 cursor-pointer" onClick={() => onOpenLocation && onOpenLocation(v.file, v.line)}>
                        <div className="flex items-center gap-2">
                          <Bug className="w-3.5 h-3.5 text-white/60" />
                          <span className="text-xs text-white/80 font-medium flex-1 truncate">{v.type}</span>
                          <Badge variant="outline" className={`text-[10px] ${riskBadge(v.riskLevel)}`}>{v.riskLevel}</Badge>
                        </div>
                        <p className="text-xs text-white/60 mt-1 line-clamp-2">{v.message}</p>
                        <p className="text-[10px] text-white/40 mt-1">{v.file}:{v.line}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="output" className="flex-1 px-3 pb-3">
            <div className="flex items-center gap-2 py-2">
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setLogs([])}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear Output
              </Button>
            </div>
            <div ref={outputRef} className="h-[calc(100%-2.5rem)] overflow-auto rounded bg-black/30 border border-white/10 p-2">
              {logs.length === 0 ? (
                <div className="text-xs text-white/40 py-4 text-center">No output yet.</div>
              ) : (
                logs.map((l) => (
                  <div key={l.id} className="text-xs">
                    <span className={`mr-2 ${l.level === 'error' ? 'text-red-400' : l.level === 'warn' ? 'text-yellow-400' : l.level === 'info' ? 'text-blue-400' : 'text-white/70'}`}>[{new Date(l.timestamp).toLocaleTimeString()}] {l.level.toUpperCase()}:</span>
                    <span className="text-white/90">{l.message.map((m, i) => typeof m === 'string' ? m : JSON.stringify(m)).join(' ')}</span>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          

          <TabsContent value="terminal" className="flex-1 px-3 pb-3 min-h-0">
            <div className="h-full flex flex-col min-h-0">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex items-center gap-2 overflow-x-auto flex-1 pr-2">
                  {terminals.map((t) => (
                    <button key={t.key} onClick={() => setActiveTerminalKey(t.key)} className={`px-2 py-1 rounded text-xs border whitespace-nowrap ${t.key === activeTerminalKey ? 'bg-white/15 text-white border-white/30' : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'}`}>
                      {t.title}{t.sessionId ? '' : ' (disconnected)'}
                      <span className="ml-1 inline-flex align-middle" onClick={(e) => { e.stopPropagation(); closeTerminal(t.key) }} title="Close">
                        <X className="w-3 h-3 opacity-60 hover:opacity-100" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div ref={terminalRef} className="relative flex-1 overflow-auto max-h-full rounded bg-black/30 border border-white/10 p-2 font-mono text-xs">
                {getActiveTerminal().lines.map((l, idx) => (
                  <div key={idx} className="whitespace-pre-wrap text-white/80">{l}</div>
                ))}
                {!getActiveTerminal().isAtBottom && (
                  <div className="absolute bottom-2 right-2">
                    <Button size="sm" variant="secondary" className="h-7 px-2 text-xs bg-white/20 hover:bg-white/30" onClick={() => { if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight }}>
                      <ChevronsDown className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2 flex-shrink-0">
                <div className="text-white/40 text-xs">$</div>
                <input value={getActiveTerminal().input} onChange={(e) => updateActiveTerminal({ input: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { const v = getActiveTerminal().input; handleTerminalCommand(v); updateActiveTerminal({ input: '' }) } }} placeholder="Type a command (help, connect, scan, open)" className="flex-1 h-8 bg-white/5 border border-white/10 rounded px-2 text-xs outline-none" />
                <input value={getActiveTerminal().cwd} onChange={(e) => updateActiveTerminal({ cwd: e.target.value })} placeholder="cwd (optional)" className="w-48 h-8 bg-white/5 border border-white/10 rounded px-2 text-xs outline-none" />
                <Button size="sm" disabled={getActiveTerminal().isConnecting} className="h-8 px-3 text-xs" onClick={() => { handleTerminalCommand(`connect ${getActiveTerminal().cwd}`) }}>
                  <Terminal className="w-3.5 h-3.5 mr-1" /> {getActiveTerminal().isConnecting ? 'Connecting…' : 'Connect'}
                </Button>
                <Button size="sm" className="h-8 px-3 text-xs" onClick={() => { const v = getActiveTerminal().input; handleTerminalCommand(v); updateActiveTerminal({ input: '' }) }}>
                  <Terminal className="w-3.5 h-3.5 mr-1" /> Run
                </Button>
                <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => { if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight }}>
                  <ChevronsDown className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className={`h-8 px-2 text-xs ${getActiveTerminal().autoScroll ? 'text-green-400' : ''}`} onClick={() => updateActiveTerminal({ autoScroll: !getActiveTerminal().autoScroll })}>
                  Auto
                </Button>
                <Button size="sm" className="h-8 px-3 text-xs bg-white/10 hover:bg-white/15 border border-white/20" onClick={addTerminal} title="New Terminal in this view">
                  <Plus className="w-3.5 h-3.5 mr-1" /> New
                </Button>
              </div>
            </div>
          </TabsContent>

          
        </Tabs>
      </div>
    </div>
  )
}


