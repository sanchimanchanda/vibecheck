'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { GitBranch, Star, GitFork, Eye, Download, Search, Clock } from 'lucide-react'

interface GitHubBrowserProps {
  onCloneRepo: (repoUrl: string, branch?: string) => Promise<void>
}

interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string
  html_url: string
  stargazers_count: number
  forks_count: number
  language: string
  updated_at: string
  default_branch: string
  private: boolean
  owner: {
    login: string
    avatar_url: string
  }
}

export default function GitHubBrowser({ onCloneRepo }: GitHubBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<GitHubRepo[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null)
  const [isCloning, setIsCloning] = useState(false)

  const searchRepositories = async () => {
    if (!searchQuery.trim()) return
    
    setIsSearching(true)
    try {
      const response = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=stars&order=desc&per_page=20`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'VibeCheck-Dashboard'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.items || [])
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleClone = async (repo: GitHubRepo) => {
    setIsCloning(true)
    try {
      await onCloneRepo(repo.html_url, repo.default_branch)
      setSelectedRepo(null)
    } finally {
      setIsCloning(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
          <Search className="w-4 h-4 mr-2" />
          Browse GitHub
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-black/90 text-white border-white/10 max-w-4xl">
        <DialogHeader>
          <DialogTitle>Browse GitHub Repositories</DialogTitle>
          <DialogDescription className="text-white/60">
            Search and clone repositories directly from GitHub
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search repositories (e.g., 'react components', 'nodejs api')"
              className="bg-white/5 border-white/10 text-white"
              onKeyDown={(e) => e.key === 'Enter' && searchRepositories()}
            />
            <Button
              onClick={searchRepositories}
              disabled={isSearching || !searchQuery.trim()}
              className="bg-white/10 hover:bg-white/20"
            >
              {isSearching ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Search results */}
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {searchResults.map((repo) => (
                <motion.div
                  key={repo.id}
                  className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                  onClick={() => setSelectedRepo(repo)}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-white">{repo.name}</h4>
                        {repo.private && <Badge variant="secondary" className="text-xs">Private</Badge>}
                        {repo.language && (
                          <Badge variant="outline" className="text-xs border-white/20 text-white/70">
                            {repo.language}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-white/60 mt-1">{repo.owner.login}</p>
                      {repo.description && (
                        <p className="text-sm text-white/70 mt-2">{repo.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-xs text-white/50">
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {repo.stargazers_count.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitFork className="w-3 h-3" />
                          {repo.forks_count.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(repo.updated_at)}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleClone(repo)
                      }}
                      disabled={isCloning}
                      className="ml-4 bg-white/10 hover:bg-white/20"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Clone
                    </Button>
                  </div>
                </motion.div>
              ))}
              
              {searchResults.length === 0 && !isSearching && searchQuery && (
                <div className="text-center py-8 text-white/40">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No repositories found for "{searchQuery}"</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
