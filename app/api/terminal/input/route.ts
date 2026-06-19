import { NextRequest } from 'next/server'
import { getSession } from '@/lib/terminal'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { sessionId: string, data: string }
    const session = getSession(body.sessionId)
    if (!session) return new Response(JSON.stringify({ success: false, error: 'Session not found' }), { status: 404 })
    session.proc.stdin.write(body.data)
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || 'Failed to send input' }), { status: 500 })
  }
}


