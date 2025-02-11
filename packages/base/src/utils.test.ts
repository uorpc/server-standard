import { once, parseEmptyableJSON } from './utils'

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
