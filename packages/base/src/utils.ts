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
  if (text === '') {
    return undefined
  }

  return JSON.parse(text)
}

export { contentDisposition, parse as parseContentDisposition } from '@tinyhttp/content-disposition'
