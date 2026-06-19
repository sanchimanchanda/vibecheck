'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, FileText, Folder, FolderOpen, Shield, AlertTriangle, Info, Lightbulb, Brain, MessageSquare, Upload, FolderPlus, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { CursorLikeSidebar } from '@/components/cursor-like-sidebar'
import ImportingFileExplorer from '@/components/importing-file-explorer'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import BottomPanel from '@/components/bottom-panel'
import dynamic from 'next/dynamic'
import JSZip from 'jszip'
import Landing from '@/components/landing'
import TempLogin from '@/components/temp-login'
import GitHubBrowser from '@/components/github-browser'
import RepoInfoPanel from '@/components/repo-info-panel'
import ProjectManager from '@/components/project-manager'
import { cloneRepository, detectGitService } from '@/lib/git-services'
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

// File handling utilities
const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || ''
}

const getLanguageFromExtension = (extension: string): string => {
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    'kt': 'kotlin',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'shell',
    'bash': 'shell',
    'ps1': 'powershell',
    'dockerfile': 'dockerfile',
    'txt': 'plaintext'
  }
  return languageMap[extension] || 'plaintext'
}

// File system access using modern File System Access API
let currentDirectoryHandle: FileSystemDirectoryHandle | null = null

// Type declarations for File System Access API
declare global {
  interface Window {
    showDirectoryPicker: (options?: {
      mode?: 'read' | 'readwrite'
    }) => Promise<FileSystemDirectoryHandle>
  }
}

interface FileSystemDirectoryHandle {
  entries(): AsyncIterableIterator<[string, FileSystemFileHandle | FileSystemDirectoryHandle]>
  getFileHandle(name: string): Promise<FileSystemFileHandle>
  getDirectoryHandle(name: string): Promise<FileSystemDirectoryHandle>
  kind: 'directory'
  name: string
}

interface FileSystemFileHandle {
  getFile(): Promise<File>
  kind: 'file'
  name: string
}

// Directories to exclude from scanning (similar to .gitignore)
const EXCLUDED_DIRS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '.nuxt',
  '.vscode',
  '.idea',
  'coverage',
  '__pycache__',
  '.pytest_cache',
  'vendor',
  'target',
  'bin',
  'obj'
]

// File extensions to exclude
const EXCLUDED_EXTENSIONS = [
  'log',
  'tmp',
  'cache',
  'lock'
]

const shouldExcludeDirectory = (name: string): boolean => {
  return EXCLUDED_DIRS.includes(name) || name.startsWith('.')
}

const shouldExcludeFile = (name: string): boolean => {
  const ext = getFileExtension(name)
  return EXCLUDED_EXTENSIONS.includes(ext) || name.startsWith('.')
}

// Check if File System Access API is supported
const supportsFileSystemAccess = (): boolean => {
  return 'showDirectoryPicker' in window
}

// Open directory using File System Access API
const openDirectory = async (): Promise<FileSystemDirectoryHandle | null> => {
  if (!supportsFileSystemAccess()) {
    console.warn('File System Access API not supported')
    return null
  }

  try {
    const directoryHandle = await window.showDirectoryPicker({
      mode: 'read'
    })
    currentDirectoryHandle = directoryHandle
    return directoryHandle
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Error opening directory:', error)
    }
    return null
  }
}

// Build file tree structure without loading content (for performance)
const buildVirtualFileTree = async (
  directoryHandle: FileSystemDirectoryHandle,
  maxDepth: number = 3,
  currentDepth: number = 0
): Promise<Record<string, FileNode>> => {
  const tree: Record<string, FileNode> = {}
  
  if (currentDepth >= maxDepth) {
    return tree
  }

  try {
    for await (const [name, handle] of directoryHandle.entries()) {
      if (handle.kind === 'directory') {
        if (shouldExcludeDirectory(name)) continue
        
        tree[name] = {
          type: 'folder',
          children: currentDepth < maxDepth - 1 ? 
            await buildVirtualFileTree(handle, maxDepth, currentDepth + 1) : {},
          path: name,
          handle: handle
        }
      } else if (handle.kind === 'file') {
        if (shouldExcludeFile(name)) continue
        
        const file = await handle.getFile()
        tree[name] = {
          type: 'file',
          size: file.size,
          lastModified: new Date(file.lastModified),
          path: name,
          handle: handle,
          // Don't load content immediately
          content: undefined
        }
      }
    }
  } catch (error) {
    console.error('Error reading directory:', error)
  }

  return tree
}

// Load file content on demand
const loadFileContent = async (fileHandle: FileSystemFileHandle): Promise<string> => {
  try {
    const file = await fileHandle.getFile()
    
    // Check file size - don't load very large files
    if (file.size > 1024 * 1024) { // 1MB limit
      return `File too large to display (${Math.round(file.size / 1024 / 1024)}MB). Open in external editor.`
    }
    
    const text = await file.text()
    return text
  } catch (error) {
    console.error('Error loading file content:', error)
    return `Error loading file: ${error}`
  }
}

// Helpers for ZIP import (GitHub clone)
const shouldExcludePath = (path: string): boolean => {
  const segments = path.split('/')
  if (segments.some((seg) => shouldExcludeDirectory(seg))) return true
  const name = segments[segments.length - 1]
  return shouldExcludeFile(name)
}

const setNested = (tree: Record<string, FileNode>, parts: string[], content: string) => {
  let cursor = tree
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    const isLast = i === parts.length - 1
    if (isLast) {
      cursor[part] = { type: 'file', content, path: parts.join('/') }
    } else {
      if (!cursor[part]) cursor[part] = { type: 'folder', children: {}, path: parts.slice(0, i + 1).join('/') }
      if (!cursor[part].children) cursor[part].children = {}
      cursor = cursor[part].children as Record<string, FileNode>
    }
  }
}

const buildTreeFromZip = async (zip: JSZip): Promise<Record<string, FileNode>> => {
  const tree: Record<string, FileNode> = {}
  // Detect top-level folder prefix (GitHub zips have repo-branch/ prefix)
  const allPaths = Object.keys(zip.files)
  let prefix = ''
  if (allPaths.length > 0) {
    const first = allPaths[0]
    const firstSeg = first.split('/')[0]
    if (firstSeg && allPaths.every((p) => p.startsWith(firstSeg + '/'))) {
      prefix = firstSeg + '/'
    }
  }
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue
    let trimmed = prefix && path.startsWith(prefix) ? path.slice(prefix.length) : path
    if (!trimmed || shouldExcludePath(trimmed)) continue
    try {
      const text = await entry.async('string')
      const parts = trimmed.split('/')
      setNested(tree, parts, text)
    } catch {}
  }
  return tree
}

// Remove mock files - only show user-uploaded files

// Vulnerability message interface
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

interface FileNode {
  type: 'file' | 'folder'
  content?: string
  children?: Record<string, FileNode>
  size?: number
  lastModified?: Date
  path?: string
  handle?: FileSystemFileHandle | FileSystemDirectoryHandle
}

interface FileExplorerProps {
  files: Record<string, FileNode>
  onFileSelect: (path: string, content: string) => void
  selectedFile: string
  level?: number
  onFilesLoad?: (files: Record<string, FileNode>) => void
}

function FileExplorer({ files, onFileSelect, selectedFile, level = 0, onFilesLoad }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
  }

  const handleDirectoryOpen = async () => {
    if (!supportsFileSystemAccess()) {
      alert('Your browser does not support the File System Access API. Please use a modern browser like Chrome, Edge, or Opera.')
      return
    }

    setIsLoading(true)
    try {
      const directoryHandle = await openDirectory()
      if (directoryHandle) {
        const fileTree = await buildVirtualFileTree(directoryHandle)
        onFilesLoad?.(fileTree)
        
        // Auto-expand the first level of directories
        const firstLevelDirs = Object.keys(fileTree).filter(key => fileTree[key].type === 'folder')
        setExpandedFolders(new Set(firstLevelDirs))
      }
    } catch (error) {
      console.error('Error opening directory:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle lazy loading of folder contents
  const handleFolderExpand = async (path: string, node: FileNode) => {
    if (node.type === 'folder' && node.handle && (!node.children || Object.keys(node.children).length === 0)) {
      try {
        const children = await buildVirtualFileTree(node.handle as FileSystemDirectoryHandle, 2, 0)
        // Update the node with loaded children
        const updatedFiles = { ...files }
        const pathParts = path.split('/')
        let current = updatedFiles
        
        for (let i = 0; i < pathParts.length - 1; i++) {
          current = current[pathParts[i]].children!
        }
        
        current[pathParts[pathParts.length - 1]].children = children
        onFilesLoad?.(updatedFiles)
      } catch (error) {
        console.error('Error loading folder contents:', error)
      }
    }
  }

  const renderFileTree = (files: Record<string, FileNode>, basePath = '') => {
    return Object.entries(files).map(([name, node]) => {
      const fullPath = basePath ? `${basePath}/${name}` : name
      const isExpanded = expandedFolders.has(fullPath)
      const isSelected = selectedFile === fullPath

      if (node.type === 'folder') {
        return (
          <div key={fullPath}>
            <motion.div
              className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-all duration-200 hover:bg-white/5 ${level > 0 ? 'ml-4' : ''}`}
              onClick={async () => {
                await handleFolderExpand(fullPath, node)
                toggleFolder(fullPath)
              }}
              whileHover={{ x: 1 }}
              whileTap={{ scale: 0.98 }}
            >
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 text-white/70" />
              ) : (
                <Folder className="w-4 h-4 text-white/70" />
              )}
              <span className="text-sm text-white/80">{name}</span>
              {node.children && Object.keys(node.children).length > 0 && (
                <span className="text-xs text-white/40 ml-auto">
                  {Object.keys(node.children).length}
                </span>
              )}
            </motion.div>
            <AnimatePresence>
              {isExpanded && node.children && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderFileTree(node.children, fullPath)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      } else {
        return (
          <motion.div
            key={fullPath}
            className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-all duration-200 ${
              isSelected 
                ? 'bg-white/10' 
                : 'hover:bg-white/5'
            } ${level > 0 ? 'ml-4' : ''}`}
            onClick={async () => {
              let content = node.content || ''
              
              // If content is not loaded and we have a file handle, load it
              if (!content && node.handle) {
                try {
                  content = await loadFileContent(node.handle as FileSystemFileHandle)
                  // Update the node with loaded content
                  node.content = content
                } catch (error) {
                  content = 'Error loading file content'
                }
              }
              
              onFileSelect(fullPath, content)
            }}
            whileHover={{ x: 1 }}
            whileTap={{ scale: 0.98 }}
          >
            <FileText className="w-4 h-4 text-white/60" />
            <span className={`text-sm ${isSelected ? 'text-white' : 'text-white/80'} flex-1`}>{name}</span>
            {node.size && (
              <span className="text-xs text-white/40">
                {node.size > 1024 ? `${Math.round(node.size / 1024)}KB` : `${node.size}B`}
              </span>
            )}
          </motion.div>
        )
      }
    })
  }

  return (
    <div className="space-y-1">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"
          />
          <span className="ml-2 text-sm text-gray-400">Loading directory...</span>
        </div>
      ) : Object.keys(files).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Folder className="w-12 h-12 text-gray-600 mb-4" />
          <p className="text-gray-400 text-sm">No folder opened</p>
          <p className="text-gray-500 text-xs mt-1">Click "Open Folder" to browse your files</p>
        </div>
      ) : (
        renderFileTree(files)
      )}
    </div>
  )
}

// Collect all files from the directory handle recursively
const collectAllFiles = async (
  directoryHandle: FileSystemDirectoryHandle, 
  basePath: string = '',
  maxDepth: number = 10,
  currentDepth: number = 0
): Promise<{ path: string; content: string }[]> => {
  const files: { path: string; content: string }[] = []
  
  if (currentDepth >= maxDepth) {
    return files
  }

  try {
    for await (const [name, handle] of directoryHandle.entries()) {
      const fullPath = basePath ? `${basePath}/${name}` : name
      
      if (handle.kind === 'directory') {
        if (shouldExcludeDirectory(name)) continue
        
        // Recursively collect files from subdirectories
        const subFiles = await collectAllFiles(handle, fullPath, maxDepth, currentDepth + 1)
        files.push(...subFiles)
      } else if (handle.kind === 'file') {
        if (shouldExcludeFile(name)) continue
        
        try {
          const fileContent = await loadFileContent(handle)
          files.push({
            path: fullPath,
            content: fileContent
          })
        } catch (error) {
          console.warn(`Failed to load file ${fullPath}:`, error)
          // Include the file with an error message as content
          files.push({
            path: fullPath,
            content: `Error loading file: ${error}`
          })
        }
      }
    }
  } catch (error) {
    console.error('Error collecting files:', error)
  }

  return files
}

// Vulnerability scanner integration
const runVulnerabilityScanner = async (directoryHandle: FileSystemDirectoryHandle): Promise<VulnerabilityMessage[]> => {
  try {
    console.log(`🔍 Collecting files from uploaded directory...`)
    
    // Collect all files and their contents
    const files = await collectAllFiles(directoryHandle)
    
    if (files.length === 0) {
      throw new Error('No files found to scan')
    }
    
    console.log(`📁 Collected ${files.length} files, sending to scanner...`)
    
    const response = await fetch('/api/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files }),
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Scan request failed')
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.message || 'Scan failed')
    }
    
    console.log(`✅ Scan completed. Summary:`, data.summary)
    
    return data.vulnerabilities || []
  } catch (error) {
    console.error('Scanner error:', error)
    throw error // Re-throw the error instead of using demo results
  }
}

// Vulnerability scanner for GitHub imported files
const runVulnerabilityScannerFromFiles = async (fileTree: Record<string, FileNode>): Promise<VulnerabilityMessage[]> => {
  try {
    console.log(`🔍 Collecting files from GitHub repository...`)
    
    // Convert file tree to format expected by scanner
    const files: { path: string; content: string }[] = []
    
    const collectFiles = (tree: Record<string, FileNode>, basePath = '') => {
      for (const [name, node] of Object.entries(tree)) {
        const fullPath = basePath ? `${basePath}/${name}` : name
        if (node.type === 'file' && node.content) {
          files.push({
            path: fullPath,
            content: node.content
          })
        } else if (node.type === 'folder' && node.children) {
          collectFiles(node.children, fullPath)
        }
      }
    }
    
    collectFiles(fileTree)
    
    if (files.length === 0) {
      throw new Error('No files found to scan')
    }
    
    console.log(`📁 Collected ${files.length} files, sending to scanner...`)
    
    const response = await fetch('/api/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files }),
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Scan request failed')
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.message || 'Scan failed')
    }
    
    console.log(`✅ Scan completed. Summary:`, data.summary)
    
    return data.vulnerabilities || []
  } catch (error) {
    console.error('Scanner error:', error)
    throw error
  }
}



export default function CodeSageInterface() {
  const [files, setFiles] = useState<Record<string, FileNode>>({})
  const [selectedFile, setSelectedFile] = useState('')
  const [selectedContent, setSelectedContent] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [isFixingId, setIsFixingId] = useState<number | null>(null)
  const [hasUserFiles, setHasUserFiles] = useState(false)
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false)
  const [scanResults, setScanResults] = useState<VulnerabilityMessage[]>([])
  const [currentDirectoryPath, setCurrentDirectoryPath] = useState('')
  const [currentDirectoryHandle, setCurrentDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>('gemini-1.5-flash')
  const editorRef = useRef<any>(null)
  const [pendingRevealLine, setPendingRevealLine] = useState<number | null>(null)
  const [showLogin, setShowLogin] = useState(true)
  const [showLanding, setShowLanding] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showGitHubBrowser, setShowGitHubBrowser] = useState(false)

  const handleFileSelect = (path: string, content: string) => {
    setSelectedFile(path)
    setSelectedContent(content)
  }

  const handleFilesLoad = (newFiles: Record<string, FileNode>) => {
    setFiles(newFiles)
    setHasUserFiles(true)
    
    // Clear current selection and set to first file found
    const firstFile = findFirstFile(newFiles)
    if (firstFile) {
      setSelectedFile(firstFile.path)
      setSelectedContent(firstFile.content)
    } else {
      setSelectedFile('')
      setSelectedContent('')
    }

    // Save to project history
    if (currentDirectoryPath && (window as any).addProjectToHistory) {
      const projectData = {
        name: currentDirectoryPath,
        type: currentDirectoryHandle ? 'local' : 'github',
        path: currentDirectoryHandle ? currentDirectoryPath : undefined,
        repoUrl: !currentDirectoryHandle ? `https://github.com/${currentDirectoryPath}` : undefined,
        branch: 'main'
      }
      ;(window as any).addProjectToHistory(projectData)
    }
  }

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const entered = localStorage.getItem('entered_workspace')
        const loggedIn = localStorage.getItem('temp_logged_in')
        if (loggedIn === '1') {
          setShowLogin(false)
          setIsAuthenticated(true)
          if (entered === '1') setShowLanding(false)
        }
      }
    } catch {}
  }, [])

  const handleCloneRepo = async (repoUrl: string, branch: string = 'main') => {
    try {
      // Use the new git services library for enhanced support
      const result = await cloneRepository(repoUrl, branch)
      
      if (!result.success) {
        alert(result.error || 'Failed to clone repository')
        return
      }

      const { blob, service, owner, repo } = result.data
      const zip = await JSZip.loadAsync(blob)
      const tree = await buildTreeFromZip(zip)
      
      handleFilesLoad(tree)
      setCurrentDirectoryPath(`${owner}/${repo}`)
      setCurrentDirectoryHandle(null)
      setScanResults([])
      setShowLanding(false)
      try { localStorage.setItem('entered_workspace', '1') } catch {}
      
      console.log(`✅ Successfully cloned ${owner}/${repo} from ${service} (${branch} branch)`)
    } catch (e) {
      console.error('Clone repo failed:', e)
      alert(`Clone failed: ${e}`)
    }
  }

  const findFirstFile = (tree: Record<string, FileNode>, basePath = ''): { path: string; content: string } | null => {
    for (const [name, node] of Object.entries(tree)) {
      const fullPath = basePath ? `${basePath}/${name}` : name
      if (node.type === 'file' && node.content) {
        return { path: fullPath, content: node.content }
      } else if (node.type === 'folder' && node.children) {
        const found = findFirstFile(node.children, fullPath)
        if (found) return found
      }
    }
    return null
  }

  const handleRunScan = async () => {
    if (!hasUserFiles) {
      alert('Please open a folder or clone a repository first before running a scan.')
      return
    }

    setIsScanning(true)
    setScanResults([])
    
    try {
      console.log('🔍 Starting vulnerability scan...')
      let results: VulnerabilityMessage[]
      
      if (currentDirectoryHandle) {
        // Local directory scan
        results = await runVulnerabilityScanner(currentDirectoryHandle)
      } else {
        // GitHub repo scan - convert files to format expected by scanner
        results = await runVulnerabilityScannerFromFiles(files)
      }
      
      setScanResults(results)
      console.log(`✅ Scan completed. Found ${results.length} vulnerabilities.`)
    } catch (error) {
      console.error('❌ Scan failed:', error)
      alert(`Scan failed: ${error}`)
    } finally {
      setIsScanning(false)
    }
  }

  const handleAutoFix = async (msg: VulnerabilityMessage) => {
    if (!selectedFile) return
    setIsFixingId(msg.id)
    try {
      const res = await fetch('/api/autofix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          filePath: selectedFile,
          fileContent: selectedContent,
          finding: {
            message: msg.message,
            suggestion: msg.suggestion,
            line: msg.line,
            type: msg.type,
            riskLevel: msg.riskLevel
          }
        })
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || data.message || 'Autofix failed')

      if (data.fixedFile && typeof data.fixedFile === 'string') {
        setSelectedContent(data.fixedFile)
      }
    } catch (e:any) {
      console.error('Autofix failed:', e)
      alert(`Autofix failed: ${e.message || e}`)
    } finally {
      setIsFixingId(null)
    }
  }

  const handleCodeApply = async (filePath: string, newContent: string) => {
    try {
      const pathParts = filePath.split('/')
      const updatedFiles = { ...files }
      let current: any = updatedFiles
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]] || !current[pathParts[i]].children) {
          console.warn('Path not found while applying code:', filePath)
          return
        }
        current = current[pathParts[i]].children!
      }
      const fileName = pathParts[pathParts.length - 1]
      if (current[fileName] && current[fileName].type === 'file') {
        current[fileName].content = newContent
        setFiles(updatedFiles)
        if (filePath === selectedFile) {
          setSelectedContent(newContent)
        }
        console.log(`✅ Applied code fix to ${filePath}`)
      } else {
        console.warn('Target is not a file or was not found:', filePath)
      }
    } catch (error) {
      console.error('Failed to apply code:', error)
      throw new Error(`Failed to apply code: ${error}`)
    }
  }

  const handleOpenDirectory = async () => {
    if (!supportsFileSystemAccess()) {
      alert('Your browser does not support the File System Access API. Please use a modern browser like Chrome, Edge, or Opera.')
      return
    }

    setIsLoadingDirectory(true)
    try {
      const directoryHandle = await openDirectory()
      if (directoryHandle) {
        const fileTree = await buildVirtualFileTree(directoryHandle)
        handleFilesLoad(fileTree)
        setCurrentDirectoryPath(directoryHandle.name) // Store directory name for display
        setCurrentDirectoryHandle(directoryHandle) // Store directory handle for scanning
        setScanResults([]) // Clear previous scan results
      }
    } catch (error) {
      console.error('Error opening directory:', error)
    } finally {
      setIsLoadingDirectory(false)
    }
  }

  // Helper: normalize path
  const normalizePath = (p: string) => p.replace(/\\/g, '/').replace(/^\/.*/, (m) => m)

  // Helper: find file node by suffix path and return { path, node }
  const findFileBySuffix = (tree: Record<string, FileNode>, suffixPath: string, basePath = ''): { path: string; node: FileNode } | null => {
    const normalizedSuffix = normalizePath(suffixPath)
    for (const [name, node] of Object.entries(tree)) {
      const currentPath = basePath ? `${basePath}/${name}` : name
      if (node.type === 'file') {
        const full = normalizePath(currentPath)
        if (full === normalizedSuffix || full.endsWith(`/${normalizedSuffix}`) || normalizedSuffix.endsWith(`/${full}`)) {
          return { path: currentPath, node }
        }
      } else if (node.type === 'folder' && node.children) {
        const found = findFileBySuffix(node.children, normalizedSuffix, currentPath)
        if (found) return found
      }
    }
    return null
  }

  // Open file and optionally reveal line in editor
  const openLocation = async (filePath: string, line?: number) => {
    try {
      const found = findFileBySuffix(files, filePath)
      if (!found) {
        alert(`File not found in opened folder: ${filePath}`)
        return
      }
      let content = found.node.content || ''
      if (!content && found.node.handle && 'getFile' in (found.node.handle as any)) {
        try {
          const file = await (found.node.handle as any).getFile()
          if (file && typeof file.text === 'function') {
            content = await file.text()
            found.node.content = content
          }
        } catch {}
      }
      setSelectedFile(found.path)
      setSelectedContent(typeof content === 'string' ? content : '')
      if (typeof line === 'number') {
        setTimeout(() => {
          try {
            if (editorRef.current && typeof editorRef.current.revealLineInCenter === 'function') {
              editorRef.current.revealLineInCenter(line)
              editorRef.current.setPosition({ lineNumber: line, column: 1 })
              editorRef.current.focus()
            } else {
              setPendingRevealLine(line)
            }
          } catch {}
        }, 50)
      }
    } catch (e) {
      console.error('openLocation error:', e)
    }
  }

  // If editor ref becomes available later, reveal pending line
  useEffect(() => {
    if (editorRef.current && pendingRevealLine) {
      try {
        editorRef.current.revealLineInCenter(pendingRevealLine)
        editorRef.current.setPosition({ lineNumber: pendingRevealLine, column: 1 })
        editorRef.current.focus()
      } catch {}
      setPendingRevealLine(null)
    }
  }, [editorRef.current, pendingRevealLine])

  const handleLogin = async (credentials: { username: string; password: string }) => {
    // Simple temporary authentication (for demo purposes)
    if (credentials.username === 'admin' && credentials.password === 'password') {
      try {
        localStorage.setItem('temp_logged_in', '1')
      } catch {}
      setIsAuthenticated(true)
      setShowLogin(false)
    } else {
      alert('Invalid credentials. Use admin/password for demo.')
    }
  }

  const handleSkipLogin = () => {
    try {
      localStorage.setItem('temp_logged_in', '1')
    } catch {}
    setIsAuthenticated(true)
    setShowLogin(false)
  }

  if (showLogin && !isAuthenticated) {
    return (
      <TempLogin
        onLogin={handleLogin}
        onSkip={handleSkipLogin}
      />
    )
  }

  if (showGitHubBrowser) {
    return (
      <div className="h-screen bg-[#000000] text-white">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold">Browse GitHub Repositories</h1>
            <Button onClick={() => setShowGitHubBrowser(false)} variant="ghost">
              Back to workspace
            </Button>
          </div>
          <GitHubBrowser onCloneRepo={async (repoUrl, branch) => {
            await handleCloneRepo(repoUrl, branch)
            setShowGitHubBrowser(false)
          }} />
        </div>
      </div>
    )
  }

  if (showLanding) {
    return (
      <Landing
        onContinue={() => { try { localStorage.setItem('entered_workspace', '1') } catch {}; setShowLanding(false) }}
        onOpenFolder={async () => { await handleOpenDirectory(); setShowLanding(false); try { localStorage.setItem('entered_workspace', '1') } catch {} }}
        onCloneRepo={async (repoUrl, branch) => {
          await handleCloneRepo(repoUrl, branch)
          setShowLanding(false)
          try { localStorage.setItem('entered_workspace', '1') } catch {}
        }}
        onBrowseGitHub={() => setShowGitHubBrowser(true)}
      />
    )
  }

  return (
    <div className="h-screen bg-[#000000] text-white overflow-hidden font-sans">
      {/* Top Bar */}
      <motion.div 
        className="h-14 bg-black/80 backdrop-blur-3xl border-b border-white/5 flex items-center justify-between px-6"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-medium text-white tracking-tight">
            VibeCheck
          </span>
          <div className="ml-4">
            <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v)}>
              <SelectTrigger className="w-[260px] h-8 bg-white/5 border-white/10 text-white">
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
        
        <div className="flex items-center gap-2">
          <ProjectManager 
            onOpenProject={(projectData) => {
              // Handle opening a saved project
              if (projectData.files) {
                handleFilesLoad(projectData.files)
              }
            }}
            onCloneRepo={handleCloneRepo}
            currentProject={currentDirectoryPath}
          />
          <GitHubBrowser onCloneRepo={handleCloneRepo} />
          <Button
            onClick={() => {
              try {
                localStorage.removeItem('temp_logged_in')
                localStorage.removeItem('entered_workspace')
              } catch {}
              setIsAuthenticated(false)
              setShowLogin(true)
              setShowLanding(true)
            }}
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
          <Button
          onClick={handleRunScan}
          disabled={isScanning}
          className="h-8 px-4 bg-white/10 hover:bg-white/15 text-white border-0 rounded-full text-sm font-medium transition-all duration-200 disabled:opacity-50"
        >
          <motion.div
            animate={isScanning ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 1, repeat: isScanning ? Infinity : 0, ease: "linear" }}
          >
            <Play className="w-3 h-3 mr-2" />
          </motion.div>
          {isScanning ? 'Analyzing' : 'Analyze'}
          </Button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="h-[calc(100vh-3.5rem)] flex">
        {/* Left + Center in a resizable group */}
        <div className="flex-1 min-w-0 h-full">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={20} minSize={12} maxSize={40}>
              <motion.div 
                className="h-full bg-black/40 backdrop-blur-2xl border-r border-white/5 flex flex-col"
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
              >
                <ScrollArea className="flex-1">
                  <div className="p-4">
                    <RepoInfoPanel
                      currentRepo={currentDirectoryPath}
                      onBranchChange={async (branch) => {
                        // Re-clone with new branch if it's a GitHub repo
                        if (currentDirectoryPath.includes('/') && !currentDirectoryHandle) {
                          const repoUrl = `https://github.com/${currentDirectoryPath}`
                          await handleCloneRepo(repoUrl, branch)
                        }
                      }}
                      onRefresh={() => {
                        // Refresh current view
                        if (currentDirectoryHandle) {
                          handleOpenDirectory()
                        }
                      }}
                    />
                  </div>
                  <ImportingFileExplorer
                    files={files}
                    rootName={currentDirectoryPath || 'project-root'}
                    onImportProject={handleOpenDirectory}
                    onCloneRepo={handleCloneRepo}
                    onRequestContent={async (path) => {
                      try {
                        const root = currentDirectoryPath || 'project-root'
                        let parts = path.split('/')
                        if (parts[0] === root) parts = parts.slice(1)
                        
                        let cursor: any = files
                        for (let i = 0; i < parts.length; i++) {
                          const part = parts[i]
                          
                          if (!cursor[part]) {
                            return undefined
                          }
                          
                          if (i === parts.length - 1) {
                            const node = cursor[part]
                            if (node && node.type === 'file') {
                              if (typeof node.content === 'string') return node.content
                              if (node.handle && 'getFile' in node.handle) {
                                try {
                                  const file = await (node.handle as any).getFile()
                                  if (file && typeof file.text === 'function') {
                                    const text = await file.text()
                                    node.content = text
                                    return text
                                  }
                                } catch {}
                              }
                            }
                            return undefined
                          }
                          cursor = cursor[part].children
                        }
                      } catch (e) {
                        return undefined
                      }
                    }}
                    onOpenFile={(path, content) => {
                      setSelectedFile(path)
                      if (typeof content === 'string') setSelectedContent(content)
                    }}
                  />
                </ScrollArea>
              </motion.div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel>
              {/* Middle Panel - Editor + Bottom Panel (vertical resizable) */}
              <ResizablePanelGroup direction="vertical" className="h-full">
                <ResizablePanel defaultSize={70} minSize={40}>
                  <motion.div 
                    className="h-full bg-black/20 backdrop-blur-2xl border-r border-white/5"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                  >
                    <div className="h-full">
                      <div className="h-12 bg-black/40 border-b border-white/5 flex items-center px-4">
                        <FileText className="w-4 h-4 text-white/60 mr-3" />
                        <span className="text-sm text-white/80">
                          {selectedFile || 'No file selected'}
                        </span>
                      </div>
                      <div className="h-[calc(100%-3rem)]">
                        {selectedFile ? (
                          <MonacoEditor
                            height="100%"
                            language={getLanguageFromExtension(getFileExtension(selectedFile))}
                            value={selectedContent}
                            theme="vs-dark"
                            options={{
                              readOnly: false,
                              minimap: { enabled: true },
                              scrollBeyondLastLine: false,
                              fontSize: 14,
                              lineNumbers: 'on',
                              renderWhitespace: 'selection',
                              smoothScrolling: true,
                              cursorBlinking: 'smooth',
                              fontFamily: 'SF Mono, Monaco, Consolas, monospace',
                              wordWrap: 'on',
                              automaticLayout: true
                            }}
                            onChange={(value) => {
                              if (value !== undefined) {
                                setSelectedContent(value)
                              }
                            }}
                            onMount={(editor) => { editorRef.current = editor }}
                          />
                        ) : (
                          <div className="h-full flex items-center justify-center text-center">
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                            >
                              <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
                              <p className="text-white/40 text-sm">Select a file to view</p>
                            </motion.div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={30} minSize={18}>
                  <motion.div 
                    className="h-full bg-black/30 backdrop-blur-2xl border-t border-r border-white/5"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
                  >
                    <BottomPanel 
                      vulnerabilities={scanResults}
                      onOpenLocation={openLocation}
                      onRunScan={handleRunScan}
                      currentModel={selectedModel}
                      onSetModel={(m) => setSelectedModel(m)}
                    />
                  </motion.div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Right Panel - AI Security Assistant (kept independent so left resize doesn't affect it) */}
        <motion.div 
          className="bg-black/40 backdrop-blur-2xl flex-none"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
        >
          <CursorLikeSidebar
            vulnerabilities={scanResults}
            selectedFile={selectedFile}
            fileContent={selectedContent}
            isScanning={isScanning}
            onAutoFix={handleAutoFix}
            isFixingId={isFixingId}
            onCodeApply={handleCodeApply}
            allFiles={files}
            currentModel={selectedModel}
            onSetModel={(m) => setSelectedModel(m)}
          />
        </motion.div>
      </div>
    </div>
  )
}
