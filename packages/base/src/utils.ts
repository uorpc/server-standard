import type { JsonValue } from './types'

export function once<T extends () => any>(fn: T): () => ReturnType<T> {
  let cached: { result: ReturnType<T> } | undefined

  return (): ReturnType<T> => {
    if (cached) {
      return cached.result
    }

    const result = fn()
    cached = { result }

    return result
  }
}

export function parseEmptyableJSON(text: string): JsonValue | undefined {
  if (!text) {
    return undefined
  }

  return JSON.parse(text)
}

export function isAsyncIteratorObject(maybe: unknown): maybe is AsyncIteratorObject<any, any, any> {
  if (!maybe || typeof maybe !== 'object') {
    return false
  }

  return Symbol.asyncIterator in maybe && typeof maybe[Symbol.asyncIterator] === 'function'
}

export { contentDisposition, parse as parseContentDisposition } from '@tinyhttp/content-disposition'
