import { isAsyncIteratorObject, once, parseEmptyableJSON } from './utils'

it('once', () => {
  const fn = vi.fn(() => ({}))
  const onceFn = once(fn)

  expect(onceFn()).toBe(fn.mock.results[0]!.value)
  expect(onceFn()).toBe(fn.mock.results[0]!.value)
  expect(onceFn()).toBe(fn.mock.results[0]!.value)
  expect(onceFn()).toBe(fn.mock.results[0]!.value)
  expect(onceFn()).toBe(fn.mock.results[0]!.value)

  expect(fn).toHaveBeenCalledTimes(1)
})

it('parseEmptyableJSON', () => {
  expect(parseEmptyableJSON('')).toBeUndefined()
  expect(parseEmptyableJSON('{}')).toEqual({})
  expect(parseEmptyableJSON('{"foo":"bar"}')).toEqual({ foo: 'bar' })
})

it('isAsyncIteratorObject', () => {
  expect(isAsyncIteratorObject(null)).toBe(false)
  expect(isAsyncIteratorObject({})).toBe(false)
  expect(isAsyncIteratorObject(() => {})).toBe(false)
  expect(isAsyncIteratorObject({ [Symbol.asyncIterator]: 123 })).toBe(false)

  expect(isAsyncIteratorObject({ [Symbol.asyncIterator]: () => { } })).toBe(true)

  async function* gen() { }
  expect(isAsyncIteratorObject(gen())).toBe(true)

  function* gen2() { }
  expect(isAsyncIteratorObject(gen2())).toBe(false)
})
