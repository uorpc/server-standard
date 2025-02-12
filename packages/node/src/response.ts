import type { StandardHeaders, StandardResponse } from '@orpc/server-standard'
import type { NodeHttpResponse } from './types'
import { toNodeHttpBody } from './body'

export function sendStandardResponse(
  res: NodeHttpResponse,
  standardResponse: StandardResponse,
): Promise<void> {
  return new Promise((resolve, reject) => {
    res.on('error', reject)
    res.on('finish', resolve)

    const resHeaders: StandardHeaders = standardResponse.headers

    const resBody = toNodeHttpBody(standardResponse.body, resHeaders)

    res.writeHead(standardResponse.status, resHeaders)

    if (resBody === undefined) {
      res.end(resBody)
    }
    else if (typeof resBody === 'string') {
      res.end(resBody)
    }
    else {
      res.on('close', () => {
        if (!resBody.closed) {
          resBody.destroy(res.errored ?? undefined)
        }
      })

      resBody.pipe(res)
    }
  })
}
