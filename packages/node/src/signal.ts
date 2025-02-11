import type { NodeHttpResponse } from './types'

export function toAbortSignal(res: NodeHttpResponse): AbortSignal {
  const controller = new AbortController()

  res.on('close', () => {
    if (res.errored) {
      controller.abort(res.errored.toString())
    }

    else if (!res.writableFinished) {
      controller.abort('Client connection prematurely closed.')
    }

    else {
      controller.abort('Server closed the connection.')
    }
  })

  return controller.signal
}
