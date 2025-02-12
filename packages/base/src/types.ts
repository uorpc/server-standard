import type { JsonValue } from 'type-fest'

export { JsonValue }

export interface EventSourceMessage {
  event: string | undefined
  id: string | undefined
  data: string
  retry: number | undefined
}

export interface StandardHeaders {
  [key: string]: string | string[] | undefined
}

export type StandardBody =
  | undefined
  | JsonValue
  | Blob
  | URLSearchParams
  | FormData
  | AsyncIterator<JsonValue | void, JsonValue | void, undefined>

export interface StandardRequest {
  /**
   * Can be { request: Request } or { request: IncomingMessage, response: ServerResponse } based on the adapter.
   */
  raw: Record<string, unknown>

  method: string
  url: URL
  headers: StandardHeaders

  /**
   * The body has been parsed base on the content-type header.
   * This method can safely call multiple times (cached).
   */
  body: () => Promise<StandardBody>

  signal: AbortSignal | undefined
}

export interface StandardResponse {
  status: number
  headers: StandardHeaders
  body: StandardBody
}
