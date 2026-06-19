export interface GitService {
  name: string
  icon: string
  detectUrl: (url: string) => boolean
  extractInfo: (url: string) => { owner: string; repo: string } | null
  getDownloadUrls: (owner: string, repo: string, branch: string) => string[]
  validateRepo: (owner: string, repo: string) => Promise<any>
}

export const gitServices: GitService[] = [
  {
    name: 'GitHub',
    icon: '🐙',
    detectUrl: (url: string) => {
      return /github\.com/i.test(url)
    },
    extractInfo: (url: string) => {
      const match = url.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/\#\?]+)(?:\.git)?(?:\/.*)?$/i)
      if (!match) return null
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/i, '')
      }
    },
    getDownloadUrls: (owner: string, repo: string, branch: string) => [
      `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${branch}`,
      `https://api.github.com/repos/${owner}/${repo}/zipball/${branch}`,
      `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`
    ],
    validateRepo: async (owner: string, repo: string) => {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'VibeCheck-Dashboard'
        }
      })
      return response.ok ? await response.json() : null
    }
  },
  {
    name: 'GitLab',
    icon: '🦊',
    detectUrl: (url: string) => {
      return /gitlab\.com/i.test(url)
    },
    extractInfo: (url: string) => {
      const match = url.match(/(?:https?:\/\/)?(?:www\.)?gitlab\.com\/([^\/]+)\/([^\/\#\?]+)(?:\.git)?(?:\/.*)?$/i)
      if (!match) return null
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/i, '')
      }
    },
    getDownloadUrls: (owner: string, repo: string, branch: string) => [
      `https://gitlab.com/${owner}/${repo}/-/archive/${branch}/${repo}-${branch}.zip`
    ],
    validateRepo: async (owner: string, repo: string) => {
      const response = await fetch(`https://gitlab.com/api/v4/projects/${encodeURIComponent(`${owner}/${repo}`)}`)
      return response.ok ? await response.json() : null
    }
  },
  {
    name: 'Bitbucket',
    icon: '🪣',
    detectUrl: (url: string) => {
      return /bitbucket\.org/i.test(url)
    },
    extractInfo: (url: string) => {
      const match = url.match(/(?:https?:\/\/)?(?:www\.)?bitbucket\.org\/([^\/]+)\/([^\/\#\?]+)(?:\.git)?(?:\/.*)?$/i)
      if (!match) return null
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/i, '')
      }
    },
    getDownloadUrls: (owner: string, repo: string, branch: string) => [
      `https://bitbucket.org/${owner}/${repo}/get/${branch}.zip`
    ],
    validateRepo: async (owner: string, repo: string) => {
      const response = await fetch(`https://api.bitbucket.org/2.0/repositories/${owner}/${repo}`)
      return response.ok ? await response.json() : null
    }
  }
]

export function detectGitService(url: string): GitService | null {
  return gitServices.find(service => service.detectUrl(url)) || null
}

export async function cloneRepository(url: string, branch: string = 'main'): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const service = detectGitService(url)
    if (!service) {
      return { success: false, error: 'Unsupported git service. Currently supports GitHub, GitLab, and Bitbucket.' }
    }

    const info = service.extractInfo(url)
    if (!info) {
      return { success: false, error: 'Invalid repository URL format' }
    }

    // For GitHub, use our server-side proxy to bypass CORS
    if (service.name === 'GitHub') {
      try {
        const response = await fetch('/api/github/download', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            owner: info.owner,
            repo: info.repo,
            branch
          })
        })

        if (response.ok) {
          const blob = await response.blob()
          return { 
            success: true, 
            data: { 
              blob, 
              service: service.name,
              owner: info.owner, 
              repo: info.repo, 
              branch 
            } 
          }
        } else {
          // If server route not available or returns JSON error, surface readable error
          let errorMessage = 'Download failed'
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } catch {}
          return { success: false, error: `${errorMessage}. Ensure the app server is running and the /api/github/download route is reachable.` }
        }
      } catch (error) {
        return { success: false, error: `GitHub download failed: ${error}. Direct browser downloads from GitHub are blocked by CORS; the server route must handle it.` }
      }
    }

    // For other services, try direct downloads (they may work)
    const downloadUrls = service.getDownloadUrls(info.owner, info.repo, branch)
    
    for (const downloadUrl of downloadUrls) {
      try {
        const response = await fetch(downloadUrl)
        if (response.ok) {
          const blob = await response.blob()
          return { 
            success: true, 
            data: { 
              blob, 
              service: service.name,
              owner: info.owner, 
              repo: info.repo, 
              branch 
            } 
          }
        }
      } catch (error) {
        console.warn(`Failed to download from ${downloadUrl}:`, error)
        continue
      }
    }

    return { success: false, error: `Repository not found or branch '${branch}' does not exist` }
  } catch (error) {
    return { success: false, error: `Clone failed: ${error}` }
  }
}
