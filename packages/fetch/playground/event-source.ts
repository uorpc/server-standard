import { isAsyncIteratorObject } from '@orpc/server-standard'
import { toStandardRequest } from '../src/request'
import { toFetchResponse } from '../src/response'

Bun.serve({
  async fetch(request, server) {
    const body = await toStandardRequest(request).body()

    if (isAsyncIteratorObject(body)) {
      while (true) {
        const value = await body.next()

        console.log(value)

        if (value.done) {
          break
        }
      }
    }

    async function* gen() {
      try {
        while (true) {
          yield `hello${Date.now()}`
          console.log('yield')
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      catch (e) {
        console.log('---------------------error')
      }
      finally {
        console.log('---------------------done')
      }
    }

    return toFetchResponse({
      headers: {},
      status: 200,
      body: gen(),
    })
  },
  port: 3000,
})

console.log('Serve at http://localhost:3000')
