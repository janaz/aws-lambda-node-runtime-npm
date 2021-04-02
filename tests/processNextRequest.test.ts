import { Config } from '../src/config';
import Context from '../src/context';
import {ContextBasedFunctionExecutor, LambdaApi, processNextRequest} from '../src/runtime';
import { LambdaHeaders, LambdaResponseValue } from '../src/types';

const getTestLambdaApi = (responseRecorder: (id: string, obj: LambdaResponseValue) => void): LambdaApi => {
  let firstInvocation = true;
  return {
    fetchNext: () => {
      if (firstInvocation) {
        firstInvocation = false
        return Promise.resolve({
          status: 200,
          headers: {
            'lambda-runtime-aws-request-id': 'test-request-id'
          },
          body: Buffer.from(JSON.stringify({
            foo: 'bar'
          })),
        });
      } else {
        return Promise.reject(new Error('stopping the loop'))
      }
    },
    sendSuccessResponse: (id, obj) => {
      responseRecorder(id, obj);
      return Promise.resolve({status: 200, headers: {}, body: Buffer.from("")});
    },
    sendErrorResponse: (_err) => Promise.resolve({status: 200, headers: {}, body: Buffer.from("")}),
    sendErrorInit: () => Promise.resolve({status: 200, headers: {}, body: Buffer.from("")}),
  }
};

const contextProvider = (headers: LambdaHeaders): Context => {
  const timeProvider = {
    getTime: (): number => 0,
  }
  const cfg: Config = {
    AWS_LAMBDA_FUNCTION_MEMORY_SIZE: 128,
    _HANDLER: 'index.handler',
    LAMBDA_TASK_ROOT: '/tmp',
    AWS_LAMBDA_FUNCTION_NAME: 'test',
    AWS_LAMBDA_FUNCTION_VERSION: 'test',
    AWS_LAMBDA_LOG_GROUP_NAME: 'test',
    AWS_LAMBDA_LOG_STREAM_NAME: 'test',
    AWS_LAMBDA_RUNTIME_API: 'test',
  }
  return new Context(headers, cfg, timeProvider)
}

const getCaller = () => (event: any, _ctx: Context): Promise<LambdaResponseValue> => {
  console.log("Executing Lambda function")
  return Promise.resolve({event: event})
}

const getExecutor = (): ContextBasedFunctionExecutor => {
  return {
    execute: (_ctx) => (f) => f()
  }
}

describe('processNextRequest', () => {
  it('works end-to-end', (done) => {
    let actualId: string | undefined
    let actualObj: LambdaResponseValue | undefined
    const responseRecorder = (id: string, obj: LambdaResponseValue) => {
      actualId = id;
      actualObj = obj;
    }
    const cb = (err: Error | null): void => {
      expect(actualId).toEqual("test-request-id");
      expect(actualObj).toEqual({event: {foo: 'bar'}});
      if (err) {
        expect(err.message).toEqual('stopping the loop')
      } else {
        fail("Expected err object to be set")
      }
      done()
    }
    processNextRequest(getTestLambdaApi(responseRecorder), contextProvider, getCaller(), getExecutor(), cb)
  })
})
