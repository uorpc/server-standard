import { createServer } from 'node:http'
import { isAsyncIteratorObject } from '@orpc/server-standard'
import { toStandardRequest } from '../src/request'
import { sendStandardResponse } from '../src/response'

const server = createServer(async (req, res) => {
  const body = await toStandardRequest(req, res).body()

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
        // return 1
      }
    }
    catch (e) {
      console.log('---------------------error')
    }
    finally {
      console.log('---------------------done')
    }
  }

  await sendStandardResponse(res, {
    headers: {},
    status: 200,
    body: gen(),
  })
})

server.listen(3000, '127.0.0.1', () => {
  console.log('Serve at http://localhost:3000')
})
