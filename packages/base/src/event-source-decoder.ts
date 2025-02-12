import type { EventSourceMessage } from './types'

export class EventSourceDecoderError extends TypeError { }

export function decodeEventSource(encoded: string): EventSourceMessage {
  const lines = encoded.replace(/\n+$/, '').split(/\n/)

  const message: EventSourceMessage = {
    data: '',
    event: undefined,
    id: undefined,
    retry: undefined,
  }

  for (const line of lines) {
    const [key, value] = line.split(': ')

    if (!key || !value) {
      throw new EventSourceDecoderError(`Invalid EventSource message line: ${line}`)
    }

    if (!(key in message)) {
      throw new EventSourceDecoderError(`Unknown EventSource message key: ${key}`)
    }

    if (key !== 'data' && message[key as keyof EventSourceMessage] !== undefined) {
      throw new EventSourceDecoderError(`Duplicate EventSource message key: ${key}`)
    }

    if (key === 'data') {
      message.data += value
    }
    else if (key === 'event') {
      message.event = value
    }
    else if (key === 'id') {
      message.id = value
    }
    else if (key === 'retry') {
      const maybeNumber = Number.parseInt(value)

      if (!Number.isFinite(maybeNumber)) {
        throw new EventSourceDecoderError(`Invalid EventSource message retry value: ${value}`)
      }

      message.retry = maybeNumber
    }
    else {
      throw new EventSourceDecoderError(`Unknown EventSource message key: ${key}`)
    }
  }

  message.data = message.data.replace(/\n$/, '')

  return message
}

export class EventSourceDecoderOptions {
  onEvent?: (event: EventSourceMessage) => void
}

export class EventSourceDecoder {
  private incomplete: string = ''

  constructor(private options: EventSourceDecoderOptions = {}) {
  }

  feed(chunk: string): void {
    this.incomplete += chunk

    if (!this.incomplete.endsWith('\n\n')) {
      return
    }

    const encodedMessages = this.incomplete.split(/\n{2,}/)

    for (const encoded of encodedMessages) {
      if (!encoded) {
        continue
      }

      const message = decodeEventSource(`${encoded}\n\n`)

      if (this.options.onEvent) {
        this.options.onEvent(message)
      }
    }

    this.incomplete = ''
  }

  end(): void {
    this.feed('\n\n')
  }
}

export class EventSourceDecoderStream extends TransformStream<string, EventSourceMessage> {
  constructor() {
    let decoder!: EventSourceDecoder

    super({
      start(controller) {
        decoder = new EventSourceDecoder({
          onEvent: (event) => {
            controller.enqueue(event)
          },
        })
      },
      transform(chunk) {
        decoder.feed(chunk)
      },
      flush() {
        decoder.end()
      },
    })
  }
}
