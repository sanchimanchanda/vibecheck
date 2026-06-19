import { NextRequest } from 'next/server'
import { killSession } from '@/lib/terminal'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { sessionId: string }
    if (body?.sessionId) killSession(body.sessionId)
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || 'Failed to kill session' }), { status: 500 })
  }
}


