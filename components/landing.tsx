'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  FolderOpen,
  GitBranch,
  TerminalSquare,
  Shield,
  Lock,
  ArrowRight,
  Search
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface LandingProps {
  onContinue: () => void
  onOpenFolder: () => void
  onCloneRepo: (repoUrl: string, branch?: string) => Promise<void>
  onBrowseGitHub?: () => void
}

export default function Landing({ onContinue, onOpenFolder, onCloneRepo, onBrowseGitHub }: LandingProps) {
  const [show, setShow] = useState(true)
  const [showClone, setShowClone] = useState(false)
  const [repoUrl, setRepoUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [isCloning, setIsCloning] = useState(false)
  const [recentRepos, setRecentRepos] = useState<string[]>([])
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle')
  const [repoInfo, setRepoInfo] = useState<any>(null)

  // Load recent repos from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentRepos')
      if (saved) {
        setRecentRepos(JSON.parse(saved).slice(0, 5)) // Show last 5 repos
      }
    } catch {}
  }, [])

  // Validate repository URL when it changes
  useEffect(() => {
    if (!repoUrl) {
      setValidationStatus('idle')
      setRepoInfo(null)
      return
    }

    const validateRepo = async () => {
      setValidationStatus('validating')
      try {
        const response = await fetch('/api/github/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl })
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.valid) {
            setValidationStatus('valid')
            setRepoInfo(data.repoInfo)
            setBranch(data.repoInfo.defaultBranch)
            return
          }
        }

        // Fallback: call GitHub API directly from browser (CORS-allowed) if local API not available
        try {
          const githubMatch = repoUrl.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/#\?]+)(?:\.git)?(?:\/.*)?$/i)
          if (!githubMatch) throw new Error('Invalid GitHub URL')
          const owner = githubMatch[1]
          const repo = githubMatch[2].replace(/\.git$/i, '')
          const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`)
          if (!ghRes.ok) throw new Error('Repo not found')
          const repoData = await ghRes.json()
          setValidationStatus('valid')
          setRepoInfo({
            name: repoData.name,
            description: repoData.description,
            language: repoData.language,
            stars: repoData.stargazers_count,
            forks: repoData.forks_count,
            defaultBranch: repoData.default_branch,
            isPrivate: repoData.private
          })
          setBranch(repoData.default_branch)
        } catch {
          setValidationStatus('invalid')
          setRepoInfo(null)
        }
      } catch {
        setValidationStatus('invalid')
        setRepoInfo(null)
      }
    }

    const timer = setTimeout(validateRepo, 800) // Debounce validation
    return () => clearTimeout(timer)
  }, [repoUrl])

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const handleClone = async () => {
    if (!repoUrl) return
    setIsCloning(true)
    try {
      await onCloneRepo(repoUrl, repoInfo?.defaultBranch || 'main')
      
      // Save to recent repos
      try {
        const newRecent = [repoUrl, ...recentRepos.filter(r => r !== repoUrl)].slice(0, 5)
        setRecentRepos(newRecent)
        localStorage.setItem('recentRepos', JSON.stringify(newRecent))
      } catch {}
      
      setShowClone(false)
    } finally {
      setIsCloning(false)
    }
  }

  const handleRecentRepoClick = (url: string) => {
    setRepoUrl(url)
  }

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] text-white overflow-hidden relative">
      {/* Ambient animated grid */}
      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_70%)]">
        <motion.div
          className="absolute inset-0 opacity-20"
          initial={{ backgroundPosition: '0px 0px' }}
          animate={{ backgroundPosition: ['0px 0px', '100px 100px', '0px 0px'] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          style={{
            backgroundImage: 'radial-gradient(#1f2937 1px, transparent 1px)',
            backgroundSize: '22px 22px'
          }}
        />
      </div>

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6">
        <AnimatePresence>
          {show && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6 }}
              className="w-full max-w-4xl"
            >
              {/* Brand */}
              <div className="flex items-center justify-center gap-3 mb-10">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-semibold tracking-tight">VibeCheck</div>
                  <div className="text-sm text-white/50">Secure Coding Workspace</div>
                </div>
              </div>

              {/* Glass panel */}
              <motion.div
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl p-8 shadow-2xl"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <div className="space-y-6">
                  {/* Popular repositories section */}

                  {/* Manual options */}
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Or start manually</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Open project */}
                  <motion.button
                    onClick={onOpenFolder}
                    className="group h-28 rounded-xl border border-white/10 bg-black/40 hover:bg-black/30 transition-all flex flex-col items-start justify-center p-5 text-left"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium">Open project</div>
                        <div className="text-xs text-white/60">Browse a local folder</div>
                      </div>
                    </div>
                  </motion.button>

                  {/* Clone repo */}
                  <motion.button
                    onClick={() => setShowClone(true)}
                    className="group h-28 rounded-xl border border-white/10 bg-black/40 hover:bg-black/30 transition-all flex flex-col items-start justify-center p-5 text-left"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                        <GitBranch className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium">Clone repo</div>
                        <div className="text-xs text-white/60">GitHub ZIP import</div>
                      </div>
                    </div>
                  </motion.button>

                  {/* Browse GitHub */}
                  <motion.button
                    onClick={onBrowseGitHub}
                    className="group h-28 rounded-xl border border-white/10 bg-black/40 hover:bg-black/30 transition-all flex flex-col items-start justify-center p-5 text-left"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                        <Search className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium">Browse GitHub</div>
                        <div className="text-xs text-white/60">Search & clone repos</div>
                      </div>
                    </div>
                  </motion.button>

                  {/* Connect via SSH (disabled for now) */}
                  <div className="relative">
                    <motion.button
                      disabled
                      className="group h-28 w-full rounded-xl border border-white/10 bg-black/40 opacity-70 transition-all flex flex-col items-start justify-center p-5 text-left"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                          <TerminalSquare className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium">Connect via SSH</div>
                          <div className="text-xs text-white/60">Coming soon</div>
                        </div>
                      </div>
                    </motion.button>
                    <div className="absolute -top-2 -right-2 text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10">Beta</div>
                  </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/60">
                    <Lock className="w-4 h-4" />
                    <span className="text-xs">Local-first. Nothing is uploaded until you choose to scan.</span>
                  </div>
                  <Button onClick={onContinue} className="bg-white/10 hover:bg-white/20 rounded-full h-9 px-4 text-sm">
                    Enter workspace
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Clone repo dialog */}
      <Dialog open={showClone} onOpenChange={setShowClone}>
        <DialogContent className="bg-black/90 text-white border-white/10">
          <DialogHeader>
            <DialogTitle>Clone repository</DialogTitle>
            <DialogDescription className="text-white/60">Paste a GitHub URL. We will download the ZIP of the selected branch and open it here.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-white/70 block mb-2">Repository URL</label>
              <div className="relative">
                <Input
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className={`bg-white/5 border-white/10 text-white pr-10 ${
                    validationStatus === 'valid' ? 'border-green-500/50' :
                    validationStatus === 'invalid' ? 'border-red-500/50' : ''
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {validationStatus === 'validating' && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                  )}
                  {validationStatus === 'valid' && (
                    <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                    </div>
                  )}
                  {validationStatus === 'invalid' && (
                    <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                    </div>
                  )}
                </div>
              </div>
              {repoInfo && (
                <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-sm font-medium text-white">{repoInfo.name}</div>
                  {repoInfo.description && (
                    <div className="text-xs text-white/60 mt-1">{repoInfo.description}</div>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
                    {repoInfo.language && <span>📝 {repoInfo.language}</span>}
                    <span>⭐ {repoInfo.stars}</span>
                    <span>🍴 {repoInfo.forks}</span>
                    {repoInfo.isPrivate && <span className="text-yellow-400">🔒 Private</span>}
                  </div>
                </div>
              )}
              {recentRepos.length > 0 && (
                <div className="mt-2">
                  <label className="text-xs text-white/50 block mb-1">Recent repositories:</label>
                  <div className="flex flex-wrap gap-1">
                    {recentRepos.map((url, idx) => (
                      <Button
                        key={idx}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRecentRepoClick(url)}
                        className="h-6 px-2 text-xs bg-white/5 hover:bg-white/10 text-white/70"
                      >
                        {url.split('/').slice(-2).join('/')}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
          <DialogFooter>
            <Button disabled={!repoUrl || isCloning} onClick={handleClone} className="bg-white/10 hover:bg-white/20">
              {isCloning ? 'Cloning…' : 'Clone and open'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


