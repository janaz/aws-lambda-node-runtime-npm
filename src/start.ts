import runtime from './runtime'

const done = (err: Error | null) => {
  if (err) {
    console.warn('Runtime exiting due to an error', err)
  }
}

console.warn('Runtime starting...')
runtime(done);
