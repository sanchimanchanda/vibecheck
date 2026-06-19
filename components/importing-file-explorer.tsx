'use client'

import React, { useState, useCallback } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  Search,
  Settings,
  GitBranch,
  Activity,
  FileText,
  Code2,
  Image,
  Music,
  Video,
  Archive,
  Coffee,
  Terminal,
  Bug,
  Package,
  Globe,
  Database,
  Lock,
  Cpu,
  Zap,
  Plus,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  FolderPlus,
  FilePlus
} from 'lucide-react'

type NodeType = 'file' | 'folder'

interface TreeNode {
  name: string
  type: NodeType
  children?: TreeNode[]
  content?: string
}

interface ContextMenuState {
  x: number
  y: number
  item: TreeNode
  path: string
}

// File type to icon mapping
const getFileIcon = (fileName: string): React.ReactNode => {
  const extension = fileName.split('.').pop()?.toLowerCase() || ''
  const iconMap: Record<string, React.ReactNode> = {
    js: <Code2 className="w-4 h-4 text-yellow-500" />,
    jsx: <Code2 className="w-4 h-4 text-blue-400" />,
    ts: <Code2 className="w-4 h-4 text-blue-600" />,
    tsx: <Code2 className="w-4 h-4 text-blue-600" />,
    html: <Globe className="w-4 h-4 text-orange-500" />,
    css: <FileText className="w-4 h-4 text-blue-500" />,
    json: <Database className="w-4 h-4 text-green-500" />,
    md: <FileText className="w-4 h-4 text-gray-400" />,
    txt: <FileText className="w-4 h-4 text-gray-400" />,
    py: <Code2 className="w-4 h-4 text-green-600" />,
    java: <Coffee className="w-4 h-4 text-red-500" />,
    cpp: <Cpu className="w-4 h-4 text-blue-700" />,
    c: <Cpu className="w-4 h-4 text-blue-700" />,
    go: <Zap className="w-4 h-4 text-cyan-500" />,
    rs: <Lock className="w-4 h-4 text-orange-600" />,
    png: <Image className="w-4 h-4 text-purple-500" />,
    jpg: <Image className="w-4 h-4 text-purple-500" />,
    jpeg: <Image className="w-4 h-4 text-purple-500" />,
    gif: <Image className="w-4 h-4 text-purple-500" />,
    svg: <Image className="w-4 h-4 text-green-500" />,
    mp3: <Music className="w-4 h-4 text-pink-500" />,
    mp4: <Video className="w-4 h-4 text-red-500" />,
    avi: <Video className="w-4 h-4 text-red-500" />,
    zip: <Archive className="w-4 h-4 text-gray-500" />,
    tar: <Archive className="w-4 h-4 text-gray-500" />,
    gz: <Archive className="w-4 h-4 text-gray-500" />,
    env: <Settings className="w-4 h-4 text-yellow-600" />,
    config: <Settings className="w-4 h-4 text-gray-600" />,
    yml: <Settings className="w-4 h-4 text-red-400" />,
    yaml: <Settings className="w-4 h-4 text-red-400" />,
    package: <Package className="w-4 h-4 text-green-600" />
  }
  return iconMap[extension] || <File className="w-4 h-4 text-gray-400" />
}

// Sample file system structure
const initialFileStructure: TreeNode = {
  name: 'project-root',
  type: 'folder',
  children: [
    {
      name: 'src',
      type: 'folder',
      children: [
        {
          name: 'components',
          type: 'folder',
          children: [
            { name: 'Header.tsx', type: 'file' },
            { name: 'Sidebar.tsx', type: 'file' },
            { name: 'Button.tsx', type: 'file' },
            {
              name: 'ui',
              type: 'folder',
              children: [
                { name: 'Input.tsx', type: 'file' },
                { name: 'Modal.tsx', type: 'file' },
                { name: 'Toast.tsx', type: 'file' }
              ]
            }
          ]
        },
        {
          name: 'pages',
          type: 'folder',
          children: [
            { name: 'Home.tsx', type: 'file' },
            { name: 'About.tsx', type: 'file' },
            { name: 'Contact.tsx', type: 'file' }
          ]
        },
        {
          name: 'hooks',
          type: 'folder',
          children: [
            { name: 'useAuth.ts', type: 'file' },
            { name: 'useLocalStorage.ts', type: 'file' }
          ]
        },
        {
          name: 'utils',
          type: 'folder',
          children: [
            { name: 'helpers.ts', type: 'file' },
            { name: 'constants.ts', type: 'file' },
            { name: 'api.ts', type: 'file' }
          ]
        },
        { name: 'App.tsx', type: 'file' },
        { name: 'index.tsx', type: 'file' },
        { name: 'main.css', type: 'file' }
      ]
    },
    {
      name: 'public',
      type: 'folder',
      children: [
        { name: 'index.html', type: 'file' },
        { name: 'favicon.ico', type: 'file' },
        {
          name: 'images',
          type: 'folder',
          children: [
            { name: 'logo.svg', type: 'file' },
            { name: 'hero.jpg', type: 'file' }
          ]
        }
      ]
    },
    {
      name: 'docs',
      type: 'folder',
      children: [
        { name: 'README.md', type: 'file' },
        { name: 'CONTRIBUTING.md', type: 'file' },
        { name: 'CHANGELOG.md', type: 'file' }
      ]
    },
    {
      name: 'tests',
      type: 'folder',
      children: [
        { name: 'App.test.tsx', type: 'file' },
        { name: 'utils.test.ts', type: 'file' },
        {
          name: '__mocks__',
          type: 'folder',
          children: [
            { name: 'api.ts', type: 'file' }
          ]
        }
      ]
    },
    { name: 'package.json', type: 'file' },
    { name: 'package-lock.json', type: 'file' },
    { name: 'tsconfig.json', type: 'file' },
    { name: 'tailwind.config.js', type: 'file' },
    { name: '.gitignore', type: 'file' },
    { name: '.env', type: 'file' },
    { name: 'vite.config.ts', type: 'file' },
    { name: 'README.md', type: 'file' }
  ]
}

interface ImportingFileExplorerProps {
  onOpenFile?: (path: string, content?: string) => void
  onRequestContent?: (path: string) => Promise<string | undefined>
  onImportProject?: () => void
  onCloneRepo?: (repoUrl: string, branch?: string) => Promise<void>
  files?: Record<string, any>
  rootName?: string
}

function generateMockContent(fileName: string): string {
  const ext = (fileName.split('.').pop() || '').toLowerCase()
  switch (ext) {
    case 'ts':
    case 'tsx':
      return `// ${fileName}\nexport const example = () => {\n  return 'Hello from ${fileName}';\n}`
    case 'js':
      return `// ${fileName}\nfunction example() {\n  return 'Hello from ${fileName}';\n}\nmodule.exports = example;`
    case 'md':
      return `# ${fileName}\n\nDocumentation placeholder.`
    case 'html':
      return `<!-- ${fileName} -->\n<!doctype html>\n<html><head><title>${fileName}</title></head><body>Placeholder</body></html>`
    case 'css':
      return `/* ${fileName} */\nbody {\n  font-family: system-ui, sans-serif;\n}`
    case 'json':
      return `{"name":"${fileName}","description":"Mock content"}`
    default:
      return `// ${fileName}\n// Mock content for preview.`
  }
}

function mapFilesToTree(nodes?: Record<string, any>): TreeNode[] {
  if (!nodes) return []
  return Object.entries(nodes).map(([name, node]) => {
    if (node.type === 'folder') {
      return {
        name,
        type: 'folder',
        children: mapFilesToTree(node.children)
      }
    }
    return { name, type: 'file', content: node.content }
  })
}

export default function ImportingFileExplorer({ onOpenFile, onRequestContent, onImportProject, onCloneRepo, files, rootName = 'project-root' }: ImportingFileExplorerProps): JSX.Element {
  const [fileStructure] = useState<TreeNode>(initialFileStructure)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['project-root', 'src']))
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [showHiddenFiles, setShowHiddenFiles] = useState<boolean>(false)
  const [sortBy, setSortBy] = useState<'name' | 'type'>('name')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  
  // Convert files to tree structure for rendering
  const mappedTree = files ? mapFilesToTree(files) : []

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(path)) newSet.delete(path)
      else newSet.add(path)
      return newSet
    })
  }, [])

  const selectFile = useCallback((filePath: string, fileName: string) => {
    setSelectedFile(filePath)
    // eslint-disable-next-line no-console
    console.log('Selected file:', fileName, 'at path:', filePath)
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent, item: TreeNode, path: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, item, path })
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const filterFiles = useCallback((items: TreeNode[] | undefined, term: string, showHidden: boolean): TreeNode[] => {
    if (!items) return []
    return items.filter(item => {
      if (!showHidden && item.name.startsWith('.')) return false
      if (term && !item.name.toLowerCase().includes(term.toLowerCase())) {
        if (item.children) {
          const hasMatchingChildren = filterFiles(item.children, term, showHidden).length > 0
          return hasMatchingChildren
        }
        return false
      }
      return true
    })
  }, [])

  const sortFiles = useCallback((items: TreeNode[], sortKey: 'name' | 'type'): TreeNode[] => {
    return [...items].sort((a, b) => {
      if (a.type === 'folder' && b.type === 'file') return -1
      if (a.type === 'file' && b.type === 'folder') return 1
      switch (sortKey) {
        case 'type':
          return (a.name.split('.').pop() || '').localeCompare(b.name.split('.').pop() || '')
        case 'name':
        default:
          return a.name.localeCompare(b.name)
      }
    })
  }, [])

  const renderFileTree = useCallback((items?: TreeNode[], parentPath = '', level = 0): React.ReactNode => {
    if (!items) return null
    const filteredItems = filterFiles(items, searchTerm, showHiddenFiles)
    const sortedItems = sortFiles(filteredItems, sortBy)
    return sortedItems.map((item, index) => {
      const currentPath = parentPath ? `${parentPath}/${item.name}` : item.name
      const isExpanded = expandedFolders.has(currentPath)
      const isSelected = selectedFile === currentPath
      return (
        <div key={`${currentPath}-${index}`} className="select-none">
          <div
            className={`
              group flex items-center gap-2 px-2 py-1 hover:bg-white/5 cursor-pointer rounded-md mx-1 transition-all duration-150
              ${isSelected ? 'bg-white/10 text-white' : 'text-white/80'}
            `}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={async () => {
              if (item.type === 'folder') toggleFolder(currentPath)
              else {
                selectFile(currentPath, item.name)
                let content = ''
                
                // First try to get content directly from the tree node
                if (item.content && typeof item.content === 'string') {
                  content = item.content
                } else if (onRequestContent) {
                  try {
                    const real = await onRequestContent(currentPath)
                    if (typeof real === 'string') {
                      content = real
                    } else {
                      content = generateMockContent(item.name)
                    }
                  } catch {
                    content = generateMockContent(item.name)
                  }
                } else {
                  content = generateMockContent(item.name)
                }
                onOpenFile?.(currentPath, content)
              }
            }}
            onContextMenu={(e) => handleContextMenu(e, item, currentPath)}
            draggable={item.type === 'file'}
            onDragStart={(e) => {
              if (item.type === 'file') {
                const payload = { path: currentPath, name: item.name }
                e.dataTransfer.setData('application/x-import-file', JSON.stringify(payload))
                e.dataTransfer.setData('text/plain', item.name)
                e.dataTransfer.effectAllowed = 'copy'
              }
            }}
          >
            {item.type === 'folder' && (
              <button className="flex-shrink-0 p-0.5 hover:bg-white/10 rounded transition-colors">
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-white/70" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-white/70" />
                )}
              </button>
            )}
            {item.type === 'file' && <div className="w-4" />}
            <div className="flex-shrink-0">
              {item.type === 'folder' ? (
                isExpanded ? (
                  <FolderOpen className="w-4 h-4 text-blue-400" />
                ) : (
                  <Folder className="w-4 h-4 text-blue-400" />
                )
              ) : (
                getFileIcon(item.name)
              )}
            </div>
            <span className="text-sm truncate flex-1">{item.name}</span>
            {item.type === 'folder' && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <button
                  className="p-1 hover:bg-white/10 rounded text-white/70 hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation()
                    // eslint-disable-next-line no-console
                    console.log('Add file to', item.name)
                  }}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          {item.type === 'folder' && isExpanded && item.children && (
            <div className="transition-all duration-200">{renderFileTree(item.children, currentPath, level + 1)}</div>
          )}
        </div>
      )
    })
  }, [expandedFolders, selectedFile, searchTerm, showHiddenFiles, sortBy, toggleFolder, selectFile, handleContextMenu, filterFiles, sortFiles])

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <h2 className="font-semibold text-white/80 text-xs">Imported Project</h2>
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            onClick={onImportProject}
            title="Import Project"
          >
            <FolderPlus className="w-4 h-4 text-white/70" />
          </button>
          <button
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            onClick={() => console.log('New file')}
            title="New File"
          >
            <FilePlus className="w-4 h-4 text-white/70" />
          </button>
          <button
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            onClick={() => console.log('Refresh')}
            title="Refresh Explorer"
          >
            <RefreshCw className="w-4 h-4 text-white/70" />
          </button>
        </div>
      </div>

      <div className="p-3 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-white/5 border border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent text-white placeholder-white/40"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] text-white/60">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHiddenFiles(!showHiddenFiles)}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                showHiddenFiles ? 'bg-white/10 text-white' : 'hover:bg-white/5'
              }`}
              title={showHiddenFiles ? 'Hide hidden files' : 'Show hidden files'}
            >
              {showHiddenFiles ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              Hidden
            </button>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'type')}
            className="text-[10px] bg-transparent border-none focus:outline-none text-white/70"
          >
            <option value="name">Name</option>
            <option value="type">Type</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {files && Object.keys(files).length > 0 ? (
          renderFileTree([
            {
              name: rootName,
              type: 'folder',
              children: mapFilesToTree(files)
            }
          ])
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <Folder className="w-10 h-10 text-white/30 mb-3" />
            <p className="text-sm text-white/60">No project imported</p>
            <p className="text-xs text-white/40 mb-3">Import your project to browse files here</p>
            <button
              onClick={onImportProject}
              className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/15 text-white text-xs"
            >
              Import Project
            </button>
          </div>
        )}
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 bg-black/90 border border-white/10 rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={closeContextMenu}
        >
          <button className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 text-white/80">Open</button>
          <button className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 text-white/80">Rename</button>
          <button className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 text-white/80">Delete</button>
          <div className="border-t border-white/10 my-1" />
          <button className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 text-white/80">Copy Path</button>
          <button className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 text-white/80">Reveal in Explorer</button>
        </div>
      )}

      {contextMenu && <div className="fixed inset-0 z-40" onClick={closeContextMenu} />}
    </div>
  )
}


