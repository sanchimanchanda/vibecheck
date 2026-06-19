'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Shield, Lock, User, Key } from 'lucide-react'

interface TempLoginProps {
  onLogin: (credentials: { username: string; password: string }) => void
  onSkip?: () => void
}

export default function TempLogin({ onLogin, onSkip }: TempLoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) return
    
    setIsLoading(true)
    try {
      await onLogin({ username, password })
    } finally {
      setIsLoading(false)
    }
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Brand */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-semibold tracking-tight">VibeCheck</div>
              <div className="text-sm text-white/50">Secure Access</div>
            </div>
          </div>

          {/* Login Form */}
          <motion.div
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl p-8 shadow-2xl"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="text-center mb-6">
              <Lock className="w-8 h-8 text-white/60 mx-auto mb-3" />
              <h2 className="text-lg font-medium text-white">Authentication Required</h2>
              <p className="text-sm text-white/60 mt-1">Please login to access the workspace</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-white/70 block mb-2">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="bg-white/5 border-white/10 text-white pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-white/70 block mb-2">Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="bg-white/5 border-white/10 text-white pl-10"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isLoading || !username || !password}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white border-0"
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                    />
                  ) : (
                    <Lock className="w-4 h-4 mr-2" />
                  )}
                  {isLoading ? 'Authenticating...' : 'Login'}
                </Button>
                
                {onSkip && (
                  <Button
                    type="button"
                    onClick={onSkip}
                    variant="ghost"
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    Skip for now
                  </Button>
                )}
              </div>
            </form>

            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              <p className="text-xs text-white/40">
                Temporary login system for development
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
