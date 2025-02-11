import type { StandardResponse } from '@orpc/server-standard'
import * as Body from './body'
import * as Headers from './headers'
import { toFetchResponse } from './response'

const toFetchBodySpy = vi.spyOn(Body, 'toFetchBody')
const toFetchHeadersSpy = vi.spyOn(Headers, 'toFetchHeaders')

beforeEach(() => {
  vi.clearAllMocks()
})

it('toFetchResponse', async () => {
  const standardResponse: StandardResponse = {
    body: { value: 123 },
    headers: {
      'x-custom-header': 'custom-value',
    },
    status: 206,
  }

  const fetchResponse = toFetchResponse(standardResponse)

  expect(fetchResponse.status).toBe(206)
  expect([...fetchResponse.headers]).toEqual([
    ['content-type', 'application/json'],
    ['x-custom-header', 'custom-value'],
  ])
  expect(fetchResponse.headers).toEqual(toFetchHeadersSpy.mock.results[0]!.value)
  expect(await fetchResponse.text()).toBe(toFetchBodySpy.mock.results[0]!.value)

  expect(toFetchHeadersSpy).toBeCalledTimes(1)
  expect(toFetchHeadersSpy).toBeCalledWith(standardResponse.headers)

  expect(toFetchBodySpy).toBeCalledTimes(1)
  expect(toFetchBodySpy).toBeCalledWith(standardResponse.body, fetchResponse.headers)
})
