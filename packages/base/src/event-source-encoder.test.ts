import { encodeEventSource, encodeEventSourceData } from './event-source-encoder'

it('encodeEventSourceData', () => {
  expect(encodeEventSourceData(undefined)).toBe('data: \n')
  expect(encodeEventSourceData('hello\nworld')).toBe('data: hello\ndata: world\n')
  expect(encodeEventSourceData('hello\nworld\n')).toBe('data: hello\ndata: world\ndata: \n')
})

describe('encodeEventSource', () => {
  it('on success', () => {
    expect(encodeEventSource({})).toEqual('data: \n\n')
    expect(encodeEventSource({ event: 'message', data: 'hello\nworld' })).toEqual('event: message\ndata: hello\ndata: world\n\n')
    expect(encodeEventSource({ event: 'message', id: '123', retry: 10000 }))
      .toEqual('event: message\nretry: 10000\nid: 123\ndata: \n\n')
  })

  it('invalid event', () => {
    expect(() => encodeEventSource({ event: 'hi\n' }))
      .toThrowError('EventSourceMessage.event must not contain a newline character')
  })

  it('invalid id', () => {
    expect(() => encodeEventSource({ event: 'message', id: 'hi\n' }))
      .toThrowError('EventSourceMessage.id must not contain a newline character')
  })

  it('invalid retry', () => {
    expect(() => encodeEventSource({ event: 'message', retry: Number.NaN }))
      .toThrowError('EventSourceMessage.retry must be a integer and >= 0')

    expect(() => encodeEventSource({ event: 'message', retry: -1 }))
      .toThrowError('EventSourceMessage.retry must be a integer and >= 0')

    expect(() => encodeEventSource({ event: 'message', retry: 1.5 }))
      .toThrowError('EventSourceMessage.retry must be a integer and >= 0')
  })
})
