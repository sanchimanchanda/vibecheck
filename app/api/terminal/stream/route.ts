import { NextRequest } from 'next/server'
import { getSession } from '@/lib/terminal'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId') || ''
  const session = getSession(sessionId)
  if (!session) return new Response('Session not found', { status: 404 })

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (data: Buffer) => controller.enqueue(new Uint8Array(data))
      const onExit = () => controller.close()
      session.proc.stdout.on('data', send)
      session.proc.stderr.on('data', send)
      session.proc.on('exit', onExit)
      session.proc.on('close', onExit)
    },
    cancel() {},
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}


