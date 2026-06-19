import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { repoUrl, branch = 'main' } = await request.json()
    
    if (!repoUrl) {
      return NextResponse.json({ error: 'Repository URL is required' }, { status: 400 })
    }

    // Validate GitHub URL format
    const githubMatch = repoUrl.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/\#\?]+)(?:\.git)?(?:\/.*)?$/i)
    if (!githubMatch) {
      return NextResponse.json({ error: 'Invalid GitHub repository URL' }, { status: 400 })
    }

    const owner = githubMatch[1]
    const repo = githubMatch[2].replace(/\.git$/i, '')

    // Check if repository exists using GitHub API
    try {
      const apiResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'VibeCheck-Dashboard'
        }
      })

      if (!apiResponse.ok) {
        if (apiResponse.status === 404) {
          return NextResponse.json({ error: 'Repository not found or is private' }, { status: 404 })
        }
        throw new Error(`GitHub API error: ${apiResponse.status}`)
      }

      const repoData = await apiResponse.json()
      
      // Check if branch exists (fallback to default branch if not)
      let branchExists = true
      let actualBranch = branch
      try {
        const branchResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/${branch}`, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'VibeCheck-Dashboard'
          }
        })
        if (!branchResponse.ok && branch !== repoData.default_branch) {
          // Try default branch if specified branch doesn't exist
          actualBranch = repoData.default_branch
          const defaultBranchResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/${actualBranch}`, {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'VibeCheck-Dashboard'
            }
          })
          branchExists = defaultBranchResponse.ok
        } else {
          branchExists = branchResponse.ok
        }
      } catch {
        branchExists = false
        actualBranch = repoData.default_branch
      }

      return NextResponse.json({
        valid: true,
        owner,
        repo,
        branch: actualBranch,
        branchExists,
        repoInfo: {
          name: repoData.name,
          description: repoData.description,
          language: repoData.language,
          stars: repoData.stargazers_count,
          forks: repoData.forks_count,
          defaultBranch: repoData.default_branch,
          isPrivate: repoData.private
        }
      })

    } catch (error) {
      console.error('GitHub API validation error:', error)
      return NextResponse.json({ error: 'Failed to validate repository' }, { status: 500 })
    }

  } catch (error) {
    console.error('Repository validation error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
