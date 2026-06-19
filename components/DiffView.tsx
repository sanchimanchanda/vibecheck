// components/DiffView.tsx
import { diffLines, Change } from 'diff'

interface DiffViewProps {
  oldCode: string
  newCode: string
  language: string
}

export function DiffView({ oldCode, newCode, language }: DiffViewProps) {
  const changes = diffLines(oldCode, newCode)

  const renderChange = (change: Change, index: number) => {
    const lines = change.value.split('\n').filter(line => line.length > 0)
    
    if (change.added) {
      return lines.map((line, lineIndex) => (
        <div key={`${index}-${lineIndex}`} className="flex bg-green-500/20 border-l-2 border-green-500">
          <span className="w-8 text-center text-green-400 select-none text-xs">+</span>
          <pre className="flex-1 text-green-100 px-2 py-0.5"><code>{line}</code></pre>
        </div>
      ))
    }
    if (change.removed) {
      return lines.map((line, lineIndex) => (
        <div key={`${index}-${lineIndex}`} className="flex bg-red-500/20 border-l-2 border-red-500">
          <span className="w-8 text-center text-red-400 select-none text-xs">-</span>
          <pre className="flex-1 text-red-100 px-2 py-0.5"><code>{line}</code></pre>
        </div>
      ))
    }
    // Unchanged lines (context) - show up to 3 lines of context
    return lines.slice(0, 3).map((line, lineIndex) => (
      <div key={`${index}-${lineIndex}`} className="flex border-l-2 border-transparent">
        <span className="w-8 text-center text-white/30 select-none text-xs"> </span>
        <pre className="flex-1 text-white/60 px-2 py-0.5"><code>{line}</code></pre>
      </div>
    ))
  }

  return (
    <div className="text-xs font-mono bg-black/40 rounded-md border border-white/10 max-h-60 overflow-y-auto">
      <div className="bg-white/5 px-3 py-1 text-white/50 text-xs border-b border-white/10">
        {language} diff
      </div>
      <div className="p-0">
        {changes.map(renderChange)}
      </div>
    </div>
  )
}
