# AWS Lambda NodeJS Custom Runtime

AWS Lambda runtime API implemented in Node.js.

This library can be used to implement

- a custom runtime Lambda layer for any Node.js version
- a container runtime with Node.js as the execution environment
- to test your Node.js lambda functions locally

## Goals

- Provide a robust custom Node.js execution environment
- Make sure that it's compatible with the official `node12.x` and `node14.x` environments

## How to install?

```sh
npm install aws-lambda-node-runtime --save
```

## How to use it?

The following examples assume that

- your lambda function code is in the `/var/task` folder.
- There's `/var/task/index.js` file that exports the Lambda `handler` function

You need to set the following environment variables

```sh
export LAMBDA_TASK_ROOT=/var/task

export AWS_LAMBDA_FUNCTION_NAME=my-function-name
export AWS_LAMBDA_FUNCTION_VERSION=v1
export AWS_LAMBDA_FUNCTION_MEMORY_SIZE=128
export AWS_LAMBDA_LOG_GROUP_NAME=test-log-group-name
export AWS_LAMBDA_LOG_STREAM_NAME=test-log-stream-name
```

### Use it from your JS code

```js
const runtime = require('aws-lambda-node-runtime');

const done = (err) => {
  if (err) {
    console.warn('Runtime exiting due to an error', err)
  }
}

process.env._HANDLER = 'index.handler';

console.warn('Runtime starting...')
runtime(done);
```

### Execute it directly from a script or command line

```sh
# The follow command assumes that there's /path/to/your/app/index.js file that exports the `handler` functions
npx aws-lambda-node-runtime index.handler
```

## Integration tests

Execute the Lambda API test server

```sh
npx ts-node runtime-api/server
```

In another terminal execute the runtime with `hello.js` as the Lambda source

```sh
npx ts-node integration/test
```
