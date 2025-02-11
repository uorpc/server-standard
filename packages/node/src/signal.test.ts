import type { IncomingMessage, ServerResponse } from 'node:http'
import request from 'supertest'
import { toAbortSignal } from './signal'

it('toAbortSignal', async () => {
  let signal: AbortSignal = {} as any

  await request((req: IncomingMessage, res: ServerResponse) => {
    signal = toAbortSignal(res)
    expect(signal.aborted).toBe(false)
    res.end()
  }).get('/')

  expect(signal.aborted).toBe(true)
  expect(signal.reason).toBe('Server closed the connection.')
})
