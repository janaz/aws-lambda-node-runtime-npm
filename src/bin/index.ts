#!/usr/bin/env node

import runtime from '../runtime'

if (process.argv.length < 3) {
  throw new Error("No handler specified");
}
const handler = process.argv[2];
process.env._HANDLER = handler;

const done = (err: Error | null) => {
  if (err) {
    console.warn('Runtime exiting due to an error', err)
  }
}

console.warn('Runtime starting...')

runtime(done);
