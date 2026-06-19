'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import {
  History,
  GitBranch,
  Star,
  Clock,
  ExternalLink,
  Trash2,
  MoreVertical,
  FolderOpen,
  Download
} from 'lucide-react'

interface ProjectManagerProps {
  onOpenProject: (projectData: any) => void
  onCloneRepo: (repoUrl: string, branch?: string) => Promise<void>
  currentProject: string
}

interface ProjectHistory {
  id: string
  name: string
  type: 'local' | 'github'
  path?: string
  repoUrl?: string
  branch?: string
  lastOpened: Date
  repoInfo?: {
    description: string
    language: string
    stars: number
    forks: number
  }
}

export default function ProjectManager({ onOpenProject, onCloneRepo, currentProject }: ProjectManagerProps) {
  const [projectHistory, setProjectHistory] = useState<ProjectHistory[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    loadProjectHistory()
  }, [])

  const loadProjectHistory = () => {
    try {
      const saved = localStorage.getItem('projectHistory')
      if (saved) {
        const history = JSON.parse(saved).map((p: any) => ({
          ...p,
          lastOpened: new Date(p.lastOpened)
        }))
        setProjectHistory(history.sort((a: ProjectHistory, b: ProjectHistory) => 
          b.lastOpened.getTime() - a.lastOpened.getTime()
        ))
      }
    } catch (error) {
      console.error('Failed to load project history:', error)
    }
  }

  const saveProjectHistory = (history: ProjectHistory[]) => {
    try {
      localStorage.setItem('projectHistory', JSON.stringify(history))
      setProjectHistory(history)
    } catch (error) {
      console.error('Failed to save project history:', error)
    }
  }

  const addToHistory = (project: Omit<ProjectHistory, 'id' | 'lastOpened'>) => {
    const newProject: ProjectHistory = {
      ...project,
      id: Date.now().toString(),
      lastOpened: new Date()
    }
    
    const updatedHistory = [
      newProject,
      ...projectHistory.filter(p => 
        p.name !== project.name || p.type !== project.type
      )
    ].slice(0, 20) // Keep only last 20 projects
    
    saveProjectHistory(updatedHistory)
  }

  const removeFromHistory = (id: string) => {
    const updatedHistory = projectHistory.filter(p => p.id !== id)
    saveProjectHistory(updatedHistory)
  }

  const handleOpenProject = async (project: ProjectHistory) => {
    try {
      if (project.type === 'github' && project.repoUrl) {
        await onCloneRepo(project.repoUrl, project.branch || 'main')
      }
      
      // Update last opened time
      const updatedHistory = projectHistory.map(p => 
        p.id === project.id ? { ...p, lastOpened: new Date() } : p
      )
      saveProjectHistory(updatedHistory)
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to open project:', error)
    }
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Expose addToHistory for external use
  useEffect(() => {
    (window as any).addProjectToHistory = addToHistory
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
          <History className="w-4 h-4 mr-2" />
          Projects
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-black/90 text-white border-white/10 max-w-2xl">
        <DialogHeader>
          <DialogTitle>Project History</DialogTitle>
          <DialogDescription className="text-white/60">
            Recently opened projects and repositories
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-96">
          <div className="space-y-2">
            {projectHistory.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No recent projects</p>
                <p className="text-xs mt-1">Open a folder or clone a repository to get started</p>
              </div>
            ) : (
              projectHistory.map((project) => (
                <motion.div
                  key={project.id}
                  className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all group"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => handleOpenProject(project)}>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-white text-sm">{project.name}</h4>
                        <Badge 
                          variant={project.type === 'github' ? 'default' : 'secondary'} 
                          className="text-xs"
                        >
                          {project.type === 'github' ? 'GitHub' : 'Local'}
                        </Badge>
                        {project.name === currentProject && (
                          <Badge variant="outline" className="text-xs border-green-500/50 text-green-400">
                            Current
                          </Badge>
                        )}
                      </div>
                      
                      {project.repoInfo?.description && (
                        <p className="text-xs text-white/60 mb-2">{project.repoInfo.description}</p>
                      )}
                      
                      <div className="flex items-center gap-3 text-xs text-white/50">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(project.lastOpened)}
                        </span>
                        {project.type === 'github' && project.branch && (
                          <span className="flex items-center gap-1">
                            <GitBranch className="w-3 h-3" />
                            {project.branch}
                          </span>
                        )}
                        {project.repoInfo?.language && (
                          <span>📝 {project.repoInfo.language}</span>
                        )}
                        {project.repoInfo?.stars && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {project.repoInfo.stars.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-black/90 text-white border-white/10">
                        <DropdownMenuItem 
                          onClick={() => handleOpenProject(project)}
                          className="hover:bg-white/10"
                        >
                          <FolderOpen className="w-3 h-3 mr-2" />
                          Open Project
                        </DropdownMenuItem>
                        {project.type === 'github' && project.repoUrl && (
                          <>
                            <DropdownMenuItem 
                              onClick={() => window.open(project.repoUrl, '_blank')}
                              className="hover:bg-white/10"
                            >
                              <ExternalLink className="w-3 h-3 mr-2" />
                              View on GitHub
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onCloneRepo?.(project.repoUrl!, project.branch)}
                              className="hover:bg-white/10"
                            >
                              <Download className="w-3 h-3 mr-2" />
                              Re-clone
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem 
                          onClick={() => removeFromHistory(project.id)}
                          className="hover:bg-red-500/20 text-red-400"
                        >
                          <Trash2 className="w-3 h-3 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
