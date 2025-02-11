import type { StandardResponse } from '@orpc/server-standard'
import { toFetchBody } from './body'
import { toFetchHeaders } from './headers'

export function toFetchResponse(response: StandardResponse): Response {
  const headers = toFetchHeaders(response.headers)
  const body = toFetchBody(response.body, headers)
  return new Response(body, { headers, status: response.status })
}
