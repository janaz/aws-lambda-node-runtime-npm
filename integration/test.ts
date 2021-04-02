import {runtime} from '../src/runtime'

process.env._HANDLER = "hello.handler";
process.env.LAMBDA_TASK_ROOT = __dirname
process.env.AWS_LAMBDA_RUNTIME_API='localhost:3000'
process.env.AWS_LAMBDA_FUNCTION_NAME='test'
process.env.AWS_LAMBDA_FUNCTION_VERSION='test'
process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE='128'
process.env.AWS_LAMBDA_LOG_GROUP_NAME='test'
process.env.AWS_LAMBDA_LOG_STREAM_NAME='test'

const done = (err: Error | null) => {
  if (err) {
    console.warn('Runtime exiting due to an error', err)
  }
}

runtime(done)
