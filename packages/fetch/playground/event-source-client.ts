const eventSource = new EventSource('http://localhost:3000')

eventSource.addEventListener('message', (event) => {
  console.log('message', event)
})

eventSource.addEventListener('error', (event) => {
  console.log('error', event)
})

eventSource.addEventListener('done', (event) => {
  console.log('done', event)
})
