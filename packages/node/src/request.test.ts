import type { IncomingMessage, ServerResponse } from 'node:http'
import request from 'supertest'
import * as Body from './body'
import { toStandardRequest } from './request'
import * as Signal from './signal'

const toStandardBodySpy = vi.spyOn(Body, 'toStandardBody')
const toAbortSignalSpy = vi.spyOn(Signal, 'toAbortSignal')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('toStandardRequest', () => {
  it('works', async () => {
    let standardRequest: any

    await request(async (req: IncomingMessage, res: ServerResponse) => {
      standardRequest = toStandardRequest(req, res)
      expect(toStandardBodySpy).not.toBeCalled()
      await standardRequest.body() // ensure body is load before sending response
      expect(standardRequest.headers).toBe(req.headers)
      expect(toStandardBodySpy).toBeCalledTimes(1)
      expect(toStandardBodySpy).toBeCalledWith(req)
      expect(toAbortSignalSpy).toBeCalledTimes(1)
      expect(toAbortSignalSpy).toBeCalledWith(res)
      res.end()
    }).post('/hello').send({ foo: 'bar' })

    expect(standardRequest.url).toBeInstanceOf(URL)
    expect(standardRequest.url.toString()).toMatch(/http:\/\/.*\/hello/)
    expect(standardRequest.method).toBe('POST')
    expect(standardRequest.signal.aborted).toBe(true)
    expect(standardRequest.body()).toBe(toStandardBodySpy.mock.results[0]!.value)
  })
})
