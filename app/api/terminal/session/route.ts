import { NextRequest } from 'next/server'
import { createSession } from '@/lib/terminal'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { cwd?: string }
    const session = createSession(body.cwd)
    return new Response(JSON.stringify({ success: true, sessionId: session.id }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || 'Failed to create terminal session' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}


