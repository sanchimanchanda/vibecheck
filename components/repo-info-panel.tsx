'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  GitBranch,
  Star,
  GitFork,
  Clock,
  ExternalLink,
  RefreshCw,
  Info
} from 'lucide-react'

interface RepoInfoPanelProps {
  currentRepo: string
  onBranchChange: (branch: string) => void
  onRefresh: () => void
}

interface GitHubRepoInfo {
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

interface GitHubBranch {
  name: string
  commit: {
    sha: string
    url: string
  }
  protected: boolean
}

export default function RepoInfoPanel({ currentRepo, onBranchChange, onRefresh }: RepoInfoPanelProps) {
  const [repoInfo, setRepoInfo] = useState<GitHubRepoInfo | null>(null)
  const [branches, setBranches] = useState<GitHubBranch[]>([])
  const [selectedBranch, setSelectedBranch] = useState('main')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (currentRepo && currentRepo.includes('/')) {
      fetchRepoInfo()
    }
  }, [currentRepo])

  const fetchRepoInfo = async () => {
    if (!currentRepo) return
    
    setIsLoading(true)
    try {
      // Extract owner/repo from path
      const parts = currentRepo.split('/')
      if (parts.length >= 2) {
        const owner = parts[0]
        const repo = parts[1]
        
        // Fetch repository information
        const [repoResponse, branchesResponse] = await Promise.all([
          fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'VibeCheck-Dashboard'
            }
          }),
          fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'VibeCheck-Dashboard'
            }
          })
        ])

        if (repoResponse.ok) {
          const repoData = await repoResponse.json()
          setRepoInfo(repoData)
          setSelectedBranch(repoData.default_branch)
        }

        if (branchesResponse.ok) {
          const branchesData = await branchesResponse.json()
          setBranches(branchesData)
        }
      }
    } catch (error) {
      console.error('Failed to fetch repository info:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBranchSelect = (branch: string) => {
    setSelectedBranch(branch)
    onBranchChange(branch)
  }

  if (!currentRepo || !currentRepo.includes('/')) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-white/60" />
          <span className="text-sm font-medium text-white">Repository Info</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { onRefresh(); fetchRepoInfo() }}
          disabled={isLoading}
          className="h-6 w-6 p-0 text-white/60 hover:text-white"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {repoInfo ? (
        <div className="space-y-3">
          {/* Repository details */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-white text-sm">{repoInfo.name}</h4>
              <a
                href={repoInfo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
              {repoInfo.private && (
                <Badge variant="secondary" className="text-xs">Private</Badge>
              )}
            </div>
            
            {repoInfo.description && (
              <p className="text-xs text-white/60 mb-2">{repoInfo.description}</p>
            )}
            
            <div className="flex items-center gap-3 text-xs text-white/50">
              {repoInfo.language && (
                <span className="flex items-center gap-1">
                  📝 {repoInfo.language}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                {repoInfo.stargazers_count.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <GitFork className="w-3 h-3" />
                {repoInfo.forks_count.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(repoInfo.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Branch selector */}
          {branches.length > 0 && (
            <div>
              <label className="text-xs text-white/60 block mb-1">Branch:</label>
              <Select value={selectedBranch} onValueChange={handleBranchSelect}>
                <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/90 text-white border-white/10">
                  {branches.map((branch) => (
                    <SelectItem key={branch.name} value={branch.name} className="text-xs">
                      <div className="flex items-center justify-between w-full">
                        <span>{branch.name}</span>
                        {branch.protected && (
                          <Badge variant="outline" className="ml-2 text-xs">Protected</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      ) : isLoading ? (
        <div className="flex items-center gap-2 text-white/60">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
          />
          <span className="text-sm">Loading repository info...</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-white/40">
          <Info className="w-4 h-4" />
          <span className="text-sm">Repository information unavailable</span>
        </div>
      )}
    </motion.div>
  )
}
