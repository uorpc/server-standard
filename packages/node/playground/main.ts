import { createServer } from 'node:http'

const server = createServer(async (req, res) => {
  // const standardRequest = toStandardRequest(req, res)

  await new Promise(resolve => setTimeout(resolve, 1000))

  // console.log('hello')

  // console.log(await standardRequest.body())
  // for await (const chunk of req) {
  //   console.log(chunk)
  // }

  // setTimeout(() => {
  //   console.log(standardRequest.signal?.aborted)
  // }, 1000)

  res.end('Hello World!\n')
})

server.listen(3000, '127.0.0.1', () => {
  // eslint-disable-next-line no-console
  console.log('Serve at http://localhost:3000')
})
