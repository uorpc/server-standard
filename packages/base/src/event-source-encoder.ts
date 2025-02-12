import type { EventSourceMessage } from './types'

export class EventSourceEncoderError extends TypeError { }

export function encodeEventSourceData(data: string | undefined): string {
  const lines = data ? data.split(/\n/) : ['']

  let output = ''

  for (const line of lines) {
    output += `data: ${line}\n`
  }

  return output
}

export function encodeEventSource(message: Partial<EventSourceMessage>): string {
  let output = ''

  if (message.event !== undefined) {
    if (message.event.includes('\n')) {
      throw new EventSourceEncoderError('EventSourceMessage.event must not contain a newline character')
    }

    output += `event: ${message.event}\n`
  }

  if (message.retry !== undefined) {
    if (!Number.isInteger(message.retry) || message.retry < 0) {
      throw new EventSourceEncoderError('EventSourceMessage.retry must be a integer and >= 0')
    }

    output += `retry: ${message.retry}\n`
  }

  if (message.id !== undefined) {
    if (message.id.includes('\n')) {
      throw new EventSourceEncoderError('EventSourceMessage.id must not contain a newline character')
    }

    output += `id: ${message.id}\n`
  }

  output += encodeEventSourceData(message.data)
  output += '\n'

  return output
}
