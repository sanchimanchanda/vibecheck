import { NextRequest, NextResponse } from 'next/server'

interface ApplyFixRequest {
  filePath: string
  originalCode: string
  fixedCode: string
  startLine?: number
  endLine?: number
}

export async function POST(req: NextRequest) {
  try {
    const { filePath, originalCode, fixedCode, startLine, endLine }: ApplyFixRequest = await req.json()

    if (!filePath || !originalCode || !fixedCode) {
      return NextResponse.json(
        { error: 'File path, original code, and fixed code are required' },
        { status: 400 }
      )
    }

    // In a real implementation, you would apply the fix to the actual file
    // For now, we'll return the fixed content for the frontend to handle
    return NextResponse.json({
      success: true,
      filePath,
      fixedContent: fixedCode,
      originalContent: originalCode,
      appliedAt: new Date().toISOString(),
      linesAffected: startLine && endLine ? { start: startLine, end: endLine } : null
    })

  } catch (error) {
    console.error('Apply fix error:', error)
    return NextResponse.json(
      { error: 'Failed to apply fix' },
      { status: 500 }
    )
  }
}
