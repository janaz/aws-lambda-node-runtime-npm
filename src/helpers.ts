import Context from "./context";
import { Callback, ContextBasedFunctionExecutor, LambdaApi, LambdaHeaders, LambdaResponseValue } from "./types";

export const processNextRequest = (
  lambdaApi: LambdaApi,
  contextProvider: (header: LambdaHeaders) => Context,
  caller: (event: any, ctx: Context) => Promise<LambdaResponseValue>,
  executor: ContextBasedFunctionExecutor,
  done: Callback
): void => {
  lambdaApi.fetchNext().then(({ status, headers: _headers, body }) => {
    const next = () => processNextRequest(lambdaApi, contextProvider, caller, executor, done);
    if (status !== 200) {
      console.warn(
        `Expected response with status 200, but received ${status}. Retrying...`
      );
      return next()
    }
    const headers = (_headers as unknown) as LambdaHeaders;
    const event = JSON.parse(body.toString());
    if (headers["lambda-runtime-trace-id"]) {
      process.env['_X_AMZN_TRACE_ID'] = headers["lambda-runtime-trace-id"];
    } else {
      delete process.env['_X_AMZN_TRACE_ID']
    }

    const ctx = contextProvider(headers);
    caller(event, ctx)
      .then(
        (val) => () => lambdaApi.sendSuccessResponse(ctx.awsRequestId, val).then(next, done),
        (err) => () => lambdaApi.sendErrorResponse(ctx.awsRequestId, err).then(next, done),
      )
      .then(executor.execute(ctx))
      .catch(done)
  }, done);
};
