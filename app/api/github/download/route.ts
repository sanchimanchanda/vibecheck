import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { owner, repo, branch = 'main' } = await request.json()
    
    if (!owner || !repo) {
      return NextResponse.json({ error: 'Owner and repo are required' }, { status: 400 })
    }

    // Try multiple GitHub download URLs as fallbacks
    const downloadUrls = [
      `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${branch}`,
      `https://api.github.com/repos/${owner}/${repo}/zipball/${branch}`,
      `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`
    ]
    
    for (const downloadUrl of downloadUrls) {
      try {
        const response = await fetch(downloadUrl, {
          headers: {
            'User-Agent': 'VibeCheck-Dashboard'
          }
        })
        
        if (response.ok) {
          const buffer = await response.arrayBuffer()
          
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': 'application/zip',
              'Content-Disposition': `attachment; filename="${repo}-${branch}.zip"`
            }
          })
        }
      } catch (error) {
        console.warn(`Failed to download from ${downloadUrl}:`, error)
        continue
      }
    }

    return NextResponse.json({ error: `Repository not found or branch '${branch}' does not exist` }, { status: 404 })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}
