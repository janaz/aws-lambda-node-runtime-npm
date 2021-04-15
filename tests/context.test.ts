import { Config } from '../src/config';
import Context, { TimeProvider } from '../src/context';
import { LambdaHeaders } from '../src/types';

const config: () => Config = () => ({
  AWS_LAMBDA_FUNCTION_MEMORY_SIZE: 128,
  _HANDLER: 'index.handler',
  LAMBDA_TASK_ROOT: '/tmp',
  AWS_LAMBDA_FUNCTION_NAME: 'function-name',
  AWS_LAMBDA_FUNCTION_VERSION: 'function-version',
  AWS_LAMBDA_LOG_GROUP_NAME: 'log-group',
  AWS_LAMBDA_LOG_STREAM_NAME: 'log-stream',
  AWS_LAMBDA_RUNTIME_API: 'runtime-api',
})

const headers: () => LambdaHeaders = () => ({
  'lambda-runtime-aws-request-id': 'request-id',
  'lambda-runtime-client-context': JSON.stringify({foo: 'bar'}),
  'lambda-runtime-cognito-identity': JSON.stringify({bar: 'foo'}),
  'lambda-runtime-deadline-ms': '2000',
  'lambda-runtime-invoked-function-arn': 'function-arn',
  'lambda-runtime-trace-id': 'trace-id',
})

describe('Context', () => {
  it('provides data from headers and config', () => {
    const timeProvider: TimeProvider = {
      getTime: () => 1500
    }
    const ctx = new Context(headers(), config(), timeProvider)
    expect(ctx.getRemainingTimeInMillis()).toEqual(500)
    expect(ctx.awsRequestId).toEqual('request-id')
    expect(ctx.clientContext).toEqual({foo: 'bar'})
    expect(ctx.functionName).toEqual('function-name')
    expect(ctx.functionVersion).toEqual('function-version')
    expect(ctx.identity).toEqual({bar: 'foo'})
    expect(ctx.invokedFunctionArn).toEqual('function-arn')
    expect(ctx.logGroupName).toEqual('log-group')
    expect(ctx.logStreamName).toEqual('log-stream')
    expect(ctx.memoryLimitInMB).toEqual(128)
  })

  describe('callbackWaitsForEmptyEventLoop', () => {
    it('returns true by default', () => {
      const ctx = new Context(headers(), config())
      expect(ctx.callbackWaitsForEmptyEventLoop).toEqual(true)
    })

    it('can be set to false', () => {
      const ctx = new Context(headers(), config())
      ctx.callbackWaitsForEmptyEventLoop = false
      expect(ctx.callbackWaitsForEmptyEventLoop).toEqual(false)
    })
  })
})
