'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageSquare, 
  Send, 
  Shield, 
  AlertTriangle, 
  Info, 
  Lightbulb, 
  Brain, 
  X,
  Loader2,
  Bot,
  User,
  FileText,
  Bug,
  Code,
  Check,
  Copy,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Zap,
  GripVertical,
  Trash2,
  Undo,
  Pencil
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { DiffView } from './DiffView'
import { notify } from '@/lib/toast'

interface VulnerabilityMessage {
  id: number
  type: string
  risk: string
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
  file: string
  line: number
  message: string
  suggestion: string
  timestamp: Date
  cweId?: string
}

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  vulnerability?: VulnerabilityMessage
  isStreaming?: boolean
  codeBlock?: {
    language: string
    code: string
    fileName?: string
    canApply?: boolean
    isDiff?: boolean
    oldCode?: string
  }
}

interface ContextItem {
  type: 'file' | 'selection' | 'vulnerability'
  label: string
  content?: string
  metadata?: any
}

interface LastChange {
  filePath: string
  oldContent: string
}

interface CursorLikeSidebarProps {
  vulnerabilities: VulnerabilityMessage[]
  selectedFile?: string
  fileContent?: string
  isScanning: boolean
  onAutoFix?: (vulnerability: VulnerabilityMessage) => Promise<void>
  isFixingId?: number | null
  onCodeApply?: (filePath: string, newContent: string) => void
  onRevertLastChange?: () => void
  lastChange?: LastChange | null
  allFiles?: Record<string, any>
  currentModel?: string
  onSetModel?: (model: string) => void
}

export function CursorLikeSidebar({ 
  vulnerabilities, 
  selectedFile, 
  fileContent,
  isScanning,
  onAutoFix,
  isFixingId,
  onCodeApply,
  onRevertLastChange,
  lastChange,
  allFiles,
  currentModel,
  onSetModel
}: CursorLikeSidebarProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  type ChatSession = { id: string; title: string; messages: ChatMessage[] }
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>('')
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [contextItems, setContextItems] = useState<ContextItem[]>([])
  const [showVulnerabilities, setShowVulnerabilities] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(475)
  const [isResizing, setIsResizing] = useState(false)
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null)
  const [showSessionList, setShowSessionList] = useState(false)
  
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Persist and restore sidebar width
  useEffect(() => {
    try {
      const raw = localStorage.getItem('vibe_sidebar_width')
      if (raw) {
        const w = parseInt(raw, 10)
        if (!Number.isNaN(w) && w >= 280 && w <= 600) setSidebarWidth(w)
      }
    } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem('vibe_sidebar_width', String(sidebarWidth)) } catch {}
  }, [sidebarWidth])

  // Filter vulnerabilities for selected file, fallback to all if none match
  const filteredVulnerabilities = (() => {
    if (!vulnerabilities || vulnerabilities.length === 0) return []
    if (!selectedFile) return vulnerabilities
    const selectedBase = selectedFile.split(/[\\/]/).pop()
    const matches = vulnerabilities.filter(v => {
      const vBase = (v.file || '').split(/[\\/]/).pop()
      return v.file === selectedFile
        || (selectedBase && vBase === selectedBase)
        || (v.file && selectedFile && (selectedFile.endsWith(v.file) || v.file.endsWith(selectedFile)))
    })
    return matches.length > 0 ? matches : vulnerabilities
  })()

  // Add context item
  const addContext = (item: ContextItem) => {
    setContextItems(prev => {
      // Remove duplicate
      const filtered = prev.filter(p => !(p.type === item.type && p.label === item.label))
      return [...filtered, item]
    })
  }

  // Remove context item
  const removeContext = (index: number) => {
    setContextItems(prev => prev.filter((_, i) => i !== index))
  }

  // Auto-add file context when file is selected
  useEffect(() => {
    if (selectedFile) {
      addContext({
        type: 'file',
        label: selectedFile,
        content: fileContent,
        metadata: { language: selectedFile.split('.').pop() }
      })
    }
  }, [selectedFile, fileContent])

  // Initialize sessions and welcome message
  useEffect(() => {
    // Load sessions
    try {
      const raw = localStorage.getItem('vibe_sessions')
      if (raw) {
        const parsed: ChatSession[] = JSON.parse(raw)
        setSessions(parsed)
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id)
          setChatMessages(parsed[0].messages || [])
          return
        }
      }
    } catch {}
    if (chatMessages.length === 0) {
      const welcome: ChatMessage = {
        id: 'welcome',
        type: 'assistant',
        content: `Hi! I'm your AI security assistant, similar to Cursor's AI but specialized for security analysis.

**I can help you:**
• 🔍 Analyze and fix security vulnerabilities
• 📝 Write secure code with best practices  
• 🛡️ Explain CWE classifications and attack vectors
• ⚡ Apply code fixes directly to your files
• 🧠 Understand complex security concepts

**Context-aware assistance:**
I can see your selected files, vulnerabilities, and code context. Ask me anything about security!

${filteredVulnerabilities.length > 0 ? `\n🚨 **Found ${filteredVulnerabilities.length} security issue${filteredVulnerabilities.length > 1 ? 's' : ''}** - click any vulnerability below to learn more.` : ''}`,
        timestamp: new Date()
      }
      setChatMessages([welcome])
      const firstSession: ChatSession = {
        id: 'session_' + Date.now().toString(),
        title: 'New chat',
        messages: [welcome]
      }
      setSessions([firstSession])
      setActiveSessionId(firstSession.id)
    }
  }, [])

  // Persist active session on changes
  useEffect(() => {
    if (!activeSessionId) return
    setSessions(prev => {
      const next = [...prev]
      const idx = next.findIndex(s => s.id === activeSessionId)
      if (idx >= 0) {
        next[idx] = { ...next[idx], messages: chatMessages, title: deriveTitle(next[idx].title, chatMessages) }
      }
      try { localStorage.setItem('vibe_sessions', JSON.stringify(next)) } catch {}
      return next
    })
  }, [chatMessages, activeSessionId])

  const deriveTitle = (existing: string, msgs: ChatMessage[]): string => {
    if (existing && existing !== 'New chat') return existing
    const firstUser = msgs.find(m => m.type === 'user')
    return firstUser ? (firstUser.content.slice(0, 40) + (firstUser.content.length > 40 ? '…' : '')) : 'New chat'
  }

  const createNewSession = () => {
    const welcome: ChatMessage = {
      id: 'welcome_' + Date.now().toString(),
      type: 'assistant',
      content: 'Started a new chat. How can I help with security?'
        + (selectedFile ? ` (current file: ${selectedFile})` : ''),
      timestamp: new Date()
    }
    const sess: ChatSession = { id: 'session_' + Date.now().toString(), title: 'New chat', messages: [welcome] }
    setSessions(prev => {
      const next = [sess, ...prev]
      try { localStorage.setItem('vibe_sessions', JSON.stringify(next)) } catch {}
      return next
    })
    setActiveSessionId(sess.id)
    setChatMessages([welcome])
  }

  const switchSession = (id: string) => {
    if (id === activeSessionId) return
    const target = sessions.find(s => s.id === id)
    if (!target) return
    setActiveSessionId(id)
    setChatMessages(target.messages || [])
  }

  // Do not inject scan updates into chat; show in vulnerabilities section only

  // Send message to AI
  const sendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    }

    setChatMessages(prev => [...prev, userMessage])
    const originalMessage = inputMessage.trim()
    setInputMessage('')
    setIsTyping(true)

    try {
      // Build context for AI
      const codebaseContext = allFiles ? {
        totalFiles: Object.keys(allFiles).length,
        languages: Array.from(new Set(
          Object.keys(allFiles)
            .map(f => f.split('.').pop()?.toLowerCase())
            .filter(Boolean)
        )),
        projectStructure: Object.keys(allFiles).slice(0, 10).join(', ')
      } : undefined

      const context = {
        selectedFile,
        fileContent,
        vulnerabilities: filteredVulnerabilities,
        userMessage: originalMessage,
        codebaseContext,
        attachedContext: contextItems
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: originalMessage + `\n\nPlease provide complete, runnable code blocks. Include:\n- Full file contents (not snippets)\n- Any new/updated CSS in its own block\n- The intended file path for each block (include a leading comment like // path: app/components/Button.tsx)\n- A separate apply plan summarizing which files to write.`,
          context,
          model: currentModel || 'gemini-1.5-flash'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          const errorMessage: ChatMessage = {
            id: Date.now().toString() + '_quota',
            type: 'assistant',
            content: '⚠️ **API quota exceeded**. Please wait ~30 seconds and try again. You can also switch models in the dropdown above.',
            timestamp: new Date()
          }
          setChatMessages(prev => [...prev, errorMessage])
          return
        }
        throw new Error(data.error || 'Failed to get AI response')
      }

      // Parse response for code blocks
      const assistantMessage: ChatMessage = {
        id: Date.now().toString() + '_assistant',
        type: 'assistant',
        content: data.response || 'Sorry, I encountered an error processing your request.',
        timestamp: new Date(),
        codeBlock: extractCodeBlock(data.response)
      }

      setChatMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '_error',
        type: 'assistant',
        content: `❌ ${error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.'}`,
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  // Extract code block from response
  const extractCodeBlock = (content: string): ChatMessage['codeBlock'] | undefined => {
    // Prefer unified block format: file header, full code, optional CSS and apply path
    // Fallback to simple triple backticks.
    const fullBlockRegex = /```(?:(\w+))?\n([\s\S]*?)\n```/m
    const match = content.match(fullBlockRegex)
    if (!match) return undefined
    const language = match[1] || 'text'
    const code = match[2]
    return {
      language,
      code,
      canApply: Boolean(selectedFile),
      isDiff: true,
      oldCode: fileContent
    }
  }

  // Clear chat messages
  const clearChat = () => {
    // remove active session entirely
    setSessions(prev => {
      const next = prev.filter(s => s.id !== activeSessionId)
      try { localStorage.setItem('vibe_sessions', JSON.stringify(next)) } catch {}
      return next
    })
    // switch to first remaining or create a fresh one
    setTimeout(() => {
      const nextSessions = (() => {
        try { return JSON.parse(localStorage.getItem('vibe_sessions') || '[]') } catch { return [] }
      })() as Array<{ id: string; title: string; messages: ChatMessage[] }>
      if (nextSessions.length > 0) {
        setActiveSessionId(nextSessions[0].id)
        setChatMessages(nextSessions[0].messages || [])
      } else {
        createNewSession()
      }
    }, 0)
    notify.info('Chat deleted.')
  }

  const deleteSessionById = (id: string) => {
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== id)
      try { localStorage.setItem('vibe_sessions', JSON.stringify(remaining)) } catch {}
      if (id === activeSessionId) {
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id)
          setChatMessages(remaining[0].messages || [])
        } else {
          const welcome: ChatMessage = {
            id: 'welcome_' + Date.now().toString(),
            type: 'assistant',
            content: 'Started a new chat. How can I help with security?'
              + (selectedFile ? ` (current file: ${selectedFile})` : ''),
            timestamp: new Date()
          }
          const fresh: ChatSession = { id: 'session_' + Date.now().toString(), title: 'New chat', messages: [welcome] }
          try { localStorage.setItem('vibe_sessions', JSON.stringify([fresh])) } catch {}
          setActiveSessionId(fresh.id)
          setChatMessages([welcome])
          return [fresh]
        }
      }
      return remaining
    })
  }

  const deleteAllSessions = () => {
    const welcome: ChatMessage = {
      id: 'welcome_' + Date.now().toString(),
      type: 'assistant',
      content: 'Started a new chat. How can I help with security?'
        + (selectedFile ? ` (current file: ${selectedFile})` : ''),
      timestamp: new Date()
    }
    const fresh: ChatSession = { id: 'session_' + Date.now().toString(), title: 'New chat', messages: [welcome] }
    setSessions([fresh])
    setActiveSessionId(fresh.id)
    setChatMessages([welcome])
    try { localStorage.setItem('vibe_sessions', JSON.stringify([fresh])) } catch {}
    setShowSessionList(false)
  }

  // Copy code to clipboard
  const copyCode = async (code: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCodeId(messageId)
      notify.success('Code copied to clipboard!')
      setTimeout(() => setCopiedCodeId(null), 2000)
    } catch (error) {
      console.error('Failed to copy code:', error)
      notify.error('Failed to copy code')
    }
  }

  // Apply code fix
  const applyCodeFix = async (code: string) => {
    if (!selectedFile || !onCodeApply) return

    try {
      onCodeApply(selectedFile, code)
      
      // Add confirmation message
      const confirmMessage: ChatMessage = {
        id: Date.now().toString() + '_applied',
        type: 'assistant',
        content: `✅ **Code applied successfully** to \`${selectedFile}\``,
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, confirmMessage])
      notify.success('Code changes applied!')
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '_apply_error',
        type: 'assistant',
        content: `❌ Failed to apply code: ${error}`,
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, errorMessage])
      notify.error('Failed to apply code changes')
    }
  }

  // Ask about vulnerability
  const askAboutVulnerability = (vuln: VulnerabilityMessage) => {
    // Add vulnerability to context
    addContext({
      type: 'vulnerability',
      label: `${vuln.type} in ${vuln.file}:${vuln.line}`,
      content: vuln.message,
      metadata: vuln
    })

    setInputMessage(`Fix this ${vuln.type.toLowerCase()} vulnerability in ${vuln.file} at line ${vuln.line}. Show me the exact code fix.`)
    inputRef.current?.focus()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [chatMessages, isTyping])

  // Resize functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true)
    e.preventDefault()
    
    const startX = e.clientX
    const startWidth = sidebarWidth

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = startX - e.clientX
      const newWidth = Math.max(280, Math.min(600, startWidth + deltaX))
      setSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'default'
      document.body.style.userSelect = 'auto'
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  // Parse multiple Markdown-style code fences from assistant content
  type MessageSegment = { type: 'text'; content: string } | { type: 'code'; language: string; content: string }
  const parseMessageSegments = (content: string): MessageSegment[] => {
    const segments: MessageSegment[] = []
    const fence = /```(?:(\w+))?\n([\s\S]*?)\n```/g
    let lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = fence.exec(content)) !== null) {
      const [full, lang, code] = match
      const start = match.index
      const end = start + full.length
      if (start > lastIndex) {
        segments.push({ type: 'text', content: content.slice(lastIndex, start) })
      }
      segments.push({ type: 'code', language: (lang || 'text').toLowerCase(), content: code })
      lastIndex = end
    }
    if (lastIndex < content.length) {
      segments.push({ type: 'text', content: content.slice(lastIndex) })
    }
    if (segments.length === 0) return [{ type: 'text', content }]
    return segments
  }

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      notify.success('Copied to clipboard')
    } catch {
      notify.error('Copy failed')
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/30'
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/30'
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
      default: return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
    }
  }

  // Drag-and-drop support for attaching file context
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    try {
      const raw = e.dataTransfer.getData('application/x-import-file')
      if (raw) {
        const payload = JSON.parse(raw)
        addContext({ type: 'file', label: payload.path || payload.name, content: undefined, metadata: { path: payload.path } })
        return
      }
    } catch (err) {
      // ignore parsing errors
    }
  }

  return (
    <div 
      ref={sidebarRef}
      className="relative h-full bg-[#0b0b0e]/70 backdrop-blur-2xl border-l border-white/5 flex overflow-hidden"
      style={{ width: sidebarWidth }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Resize Handle */}
      <div
        className="absolute left-0 top-0 w-1 h-full cursor-col-resize group hover:bg-blue-500/50 transition-colors z-10"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-4 h-8 bg-white/10 rounded-r flex items-center justify-center backdrop-blur-sm">
            <GripVertical className="w-3 h-3 text-white/50" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col ml-1 min-w-0">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex-shrink-0 relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium tracking-tight">AI Security Assistant</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60">online</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowSessionList(v => !v)} title="History">
                <MessageSquare className="w-3.5 h-3.5" />
              </Button>
              {onRevertLastChange && lastChange && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onRevertLastChange}>
                  <Undo className="w-3 h-3 mr-1" /> Revert
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={clearChat}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" className="h-7 px-2 text-xs" onClick={createNewSession}>
                New Chat
              </Button>
            </div>
          </div>

          {/* Model Selection */}
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60">Model:</span>
              <Select value={currentModel || 'gemini-1.5-flash'} onValueChange={(v) => onSetModel?.(v)}>
                <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white w-full" title="Select AI model">
                  <SelectValue placeholder="Choose model" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 text-white border-white/10">
                  <SelectGroup>
                    <SelectLabel>Gemini Models</SelectLabel>
                    <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash (Recommended)</SelectItem>
                    <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                    <SelectItem value="gemini-2.0-flash-exp">Gemini 2.0 Flash (exp)</SelectItem>
                    <SelectItem value="gemini-2.0-pro-exp-02-05">Gemini 2.0 Pro (exp-02-05)</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>DeepSeek Models (OpenRouter)</SelectLabel>
                    <SelectItem value="openrouter/deepseek/deepseek-r1:free">DeepSeek R1 (Reasoning) - Free</SelectItem>
                    <SelectItem value="openrouter/deepseek/deepseek-r1">DeepSeek R1 (Reasoning)</SelectItem>
                    <SelectItem value="openrouter/deepseek/deepseek-chat-v3-0324:free">DeepSeek V3 Chat (Free)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sessions Panel (toggle with the icon) */}
          <AnimatePresence>
            {showSessionList && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute right-3 top-14 z-50 w-72 max-h-80 overflow-auto bg-black/90 border border-white/10 rounded-lg shadow-lg"
              >
                <div className="p-2 border-b border-white/10 flex items-center justify-between">
                  <span className="text-xs text-white/70">Chat history</span>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={deleteAllSessions}>Clear all</Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowSessionList(false)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="p-2 space-y-1">
                  {sessions.map((s) => (
                    <div key={s.id} className={`group flex items-center gap-2 p-2 rounded border ${s.id === activeSessionId ? 'bg-white/5 border-white/20' : 'bg-transparent border-white/10 hover:bg-white/5'}`}>
                      <button onClick={() => { switchSession(s.id); setShowSessionList(false) }} className="text-left text-xs text-white/80 flex-1 truncate">
                        {s.title || 'Untitled chat'}
                      </button>
                      <button
                        className="opacity-60 hover:opacity-100"
                        title="Rename"
                        onClick={() => {
                          const next = prompt('Rename chat', s.title || 'Untitled chat')
                          if (typeof next === 'string') {
                            setSessions(prev => {
                              const copy = prev.map(item => item.id === s.id ? { ...item, title: next.trim() || 'Untitled chat' } : item)
                              try { localStorage.setItem('vibe_sessions', JSON.stringify(copy)) } catch {}
                              return copy
                            })
                          }
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button className="opacity-60 hover:opacity-100" onClick={() => deleteSessionById(s.id)} title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {sessions.length === 0 && (
                    <div className="text-xs text-white/50 p-2">No chats yet</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Context Items */}
          {contextItems.length > 0 && (
            <div className="space-y-1 mb-3 max-h-24 overflow-auto pr-1">
              <div className="flex items-center justify-between">
              <p className="text-xs text-white/50">Context attached:</p>
                <button
                  className="text-[10px] text-white/40 hover:text-white/70"
                  onClick={() => setContextItems([])}
                >
                  Clear
                </button>
              </div>
              {contextItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-white/5 rounded text-xs">
                  <Paperclip className="w-3 h-3 text-white/40" />
                  <span className="text-white/70 flex-1 truncate">{item.label}</span>
                  <button 
                    onClick={() => removeContext(index)}
                    className="text-white/40 hover:text-white/70"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Vulnerabilities Summary */}
          {filteredVulnerabilities.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-2 bg-white/5 rounded-lg border border-white/10"
            >
              <button
                onClick={() => setShowVulnerabilities(!showVulnerabilities)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse"></div>
                  <p className="text-xs text-white/60">
                    {filteredVulnerabilities.length} vulnerability{filteredVulnerabilities.length !== 1 ? 'ies' : ''}
                  </p>
                </div>
                {showVulnerabilities ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </motion.div>
          )}
        </div>

        {/* Vulnerabilities List (Collapsible) */}
        <AnimatePresence>
          {showVulnerabilities && filteredVulnerabilities.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex-shrink-0 border-b border-white/5"
              style={{ maxHeight: '200px' }}
            >
              <div className="h-full overflow-y-auto p-2">
                <div className="space-y-2">
                  {filteredVulnerabilities.map((vuln, index) => (
                    <motion.div
                      key={vuln.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-2 bg-white/5 rounded cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => askAboutVulnerability(vuln)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${getRiskColor(vuln.riskLevel).split(' ')[0]}`} />
                        <span className="text-xs font-medium text-white/80 truncate">{vuln.type}</span>
                        <Badge variant="outline" className="text-xs">{vuln.riskLevel}</Badge>
                      </div>
                      <p className="text-xs text-white/60 line-clamp-2">{vuln.message}</p>
                      <p className="text-xs text-white/40 mt-1">{vuln.file}:{vuln.line}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Messages */}
        <div className="flex-1 flex flex-col min-h-0">
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
            style={{ 
              scrollBehavior: 'smooth',
              overflowAnchor: 'auto'
            }}
          >
            {chatMessages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 w-full min-w-0 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'assistant' && (
                  <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                )}
                
                <div className={`max-w-[85%] min-w-0 ${message.type === 'user' ? 'order-first' : ''}`}>
                  <div
                    className={`p-3 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white ml-auto'
                        : 'bg-white/10 text-white/90 border border-white/10'
                    }`}
                    
                    // Ensure long words/URLs wrap inside the bubble
                    style={{ overflowWrap: 'anywhere' }}
                  >
                    {/* Assistant/User message content with multi-code-block support */}
                    {(() => {
                      const segments = parseMessageSegments(String(message.content || ''))
                      let firstCodeRendered = false
                      return (
                    <div className="prose prose-sm prose-invert max-w-none break-words">
                          {segments.map((seg, idx) => {
                            if (seg.type === 'text') {
                              return (
                                <p key={idx} className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                  {seg.content}
                                </p>
                              )
                            }
                            // code segment
                            const canApply = Boolean(selectedFile)
                            const showDiff = canApply && !firstCodeRendered && fileContent
                            firstCodeRendered = true
                            return (
                              <div key={idx} className="mt-3 rounded overflow-hidden border border-white/10 bg-black/30">
                        <div className="flex items-center justify-between p-2 bg-white/5 border-b border-white/10">
                                  <span className="text-xs text-white/60">{seg.language}</span>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 px-2 text-xs"
                                      onClick={() => copyCode(seg.content, message.id)}
                            >
                              {copiedCodeId === message.id ? (
                                <Check className="w-3 h-3 text-green-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                                    {canApply && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 px-2 text-xs text-green-400 hover:text-green-300"
                                        onClick={() => applyCodeFix(seg.content)}
                              >
                                <Zap className="w-3 h-3 mr-1" />
                                Apply
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="p-3 bg-black/30 max-h-64 overflow-auto">
                                  {showDiff ? (
                            <DiffView
                                      oldCode={fileContent as string}
                                      newCode={seg.content}
                                      language={seg.language}
                            />
                          ) : (
                            <pre className="text-xs overflow-x-auto">
                                      <code className="text-white/90">{seg.content}</code>
                            </pre>
                          )}
                        </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}

                    {message.type === 'assistant' && (
                      <div className="mt-2 flex justify-end">
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] text-white/60" onClick={() => copyText(String(message.content || ''))}>
                          Copy message
                        </Button>
                      </div>
                    )}
                    
                    <p className="text-xs opacity-60 mt-2">
                      {new Date(message.timestamp as any).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {message.type === 'user' && (
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-3 h-3 text-white" />
                  </div>
                )}
              </motion.div>
            ))}
            
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2"
              >
                <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div className="bg-white/10 p-3 rounded-lg">
                  <motion.div
                    className="flex gap-1"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <div className="w-2 h-2 bg-white/60 rounded-full" />
                    <div className="w-2 h-2 bg-white/60 rounded-full" />
                    <div className="w-2 h-2 bg-white/60 rounded-full" />
                  </motion.div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input Area - Simplified without model selector */}
          <div className="flex-shrink-0 p-4 border-t border-white/5">
            <div className="rounded-xl bg-[#0f0f10] border border-white/10 p-3">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef as any}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Plan, search, build anything"
                  className="flex-1 bg-transparent outline-none text-sm placeholder-white/40 text-white h-12"
                  disabled={isTyping}
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" title="Attach (coming soon)">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  className="px-3 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isTyping ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-white/70">
                <span className="h-6 px-2 rounded-full bg-white/5 border border-white/10 flex items-center">∞ Agent Ctrl+I</span>
                <span className="h-6 px-2 rounded-full bg-white/5 border border-white/10 flex items-center">{currentModel || 'gemini-1.5-flash'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}