# AWS Lambda NodeJS Custom Runtime

AWS Lambda runtime API implemented in Node.js.

## Goals

* Provide a robust Node.js execution environment.
* Make the runtime environment compatible with the default node12.x and node14.x environments

## How to install?

```sh
npm install aws-lambda-node-runtime --save
```

## How to use it?

```js
const runtime = require('aws-lambda-node-runtime');

const done = (err) => {
  if (err) {
    console.warn('Runtime exiting due to an error', err)
  }
}

console.warn('Runtime starting...')
runtime(done);
```
