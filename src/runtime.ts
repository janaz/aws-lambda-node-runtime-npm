import { Callback, LambdaApiResponse, LambdaHandler, LambdaHeaders, LambdaResponseValue } from "./types";
import Context from "./context";
import getConfig, { Config } from "./config";
import { request } from "./http";

interface ContextBasedFunctionExecutor {
  execute: (ctx: Context) => (fn: () => void) => void
}

const contextBasedExecutor: ContextBasedFunctionExecutor = {
  execute: (ctx) => (fn) => {
    if (ctx.callbackWaitsForEmptyEventLoop) {
      process.once("beforeExit", () => fn());
    } else {
      fn();
    }
  },
};

const getLambdaHandler = (() => {
  let _lambdaHandler: LambdaHandler | undefined = undefined;
  return async (cfg: Config): Promise<LambdaHandler> => {
    if (typeof _lambdaHandler === "undefined") {
      const [modName, handlerName] = cfg._HANDLER.split(".");
      _lambdaHandler = require(`${cfg.LAMBDA_TASK_ROOT}/${modName}`)[handlerName];
    }
    if (typeof _lambdaHandler === "function") {
      return _lambdaHandler;
    } else {
      throw new Error("Can't find the handler");
    }
  };
})();

interface LambdaApi {
  fetchNext: () => Promise<LambdaApiResponse>,
  sendSuccessResponse: (id: string, obj: LambdaResponseValue) => Promise<LambdaApiResponse>,
  sendErrorResponse: (id: string, err: Error) => Promise<LambdaApiResponse>,
  sendErrorInit: (err: Error) => Promise<LambdaApiResponse>,
}

type LambdaApiProvider = (cfg: Config) => LambdaApi
type ContextProvider = (cfg: Config) => (headers: LambdaHeaders) => Context

const getContext: ContextProvider = (cfg) => {
  return (headers) => new Context(headers, cfg)
}
const getLambdaHttpApi: LambdaApiProvider = (cfg) => {
  const r = request(cfg);
  const errObj = (err: Error) => ({
    errorMessage: err.message,
    errorType: err.toString(),
  });
  return {
    fetchNext: () => r("GET", "/2018-06-01/runtime/invocation/next"),
    sendSuccessResponse: (id, obj) => r("POST", `/2018-06-01/runtime/invocation/${id}/response`, obj),
    sendErrorResponse: (id, err) => r("POST", `/2018-06-01/runtime/invocation/${id}/error`, err),
    sendErrorInit: (err) => r("POST", "/2018-06-01/runtime/init/error", errObj(err)),
  }
}

const callHandler = (
  handler: LambdaHandler,
  event: object,
  ctx: Context
): Promise<LambdaResponseValue> => {
  return new Promise((resolve, reject) => {
    let resolveCalled = false;
    let rejectCalled = false;
    const wrappedResolve = (val: LambdaResponseValue) => {
      if (resolveCalled) {
        console.warn("resolve has been already called");
        return;
      }
      if (rejectCalled) {
        console.warn("calling resolve, but reject has been already called");
        return;
      }
      resolveCalled = true;
      resolve(val);
    };
    const wrappedReject = (err: Error) => {
      if (rejectCalled) {
        console.warn("reject has been already called");
        return;
      }
      if (resolveCalled) {
        console.warn("calling reject, but resolve has been already called");
        return;
      }
      rejectCalled = true;
      reject(err);
    };
    const cb: Callback = (err, val) => {
      if (err) {
        return wrappedReject(err);
      }
      wrappedResolve(val);
    };
    try {
      const retVal = handler.call(null, event, ctx, cb);
      if (typeof retVal === "object" && typeof retVal.then === "function") {
        retVal.then(wrappedResolve, wrappedReject);
      }
    } catch (e) {
      wrappedReject(e)
    }
  });
};

const processNextRequest = (
  lambdaApi: LambdaApi,
  handler: LambdaHandler,
  contextProvider: (header: LambdaHeaders) => Context,
  caller: (event: any, ctx:Context) => Promise<LambdaResponseValue>,
  executor: ContextBasedFunctionExecutor,
  done: Callback
): void => {
  lambdaApi.fetchNext().then(({ status, headers: _headers, body }) => {
    const next = () => processNextRequest(lambdaApi, handler, contextProvider, caller, executor, done);
    if (status !== 200) {
      console.warn(
        `Expected response with status 200, but received ${status}. Retrying...`
      );
      return next()
    }
    const headers = (_headers as unknown) as LambdaHeaders;
    const event = JSON.parse(body.toString());
    process.env._X_AMZN_TRACE_ID = headers["lambda-runtime-trace-id"];
    const ctx = contextProvider(headers);
    caller(event, ctx)
      .then(
        (val) => () => lambdaApi.sendSuccessResponse(ctx.awsRequestId, val).then(next, done),
        (err) => () => lambdaApi.sendErrorResponse(ctx.awsRequestId, err).then(next, done),
      )
      .then(executor.execute(ctx), done);
  }, done);
};

//----- start here

const runtime = (done: Callback) => {
  getConfig().then((cfg) => {
    const lambdaApi = getLambdaHttpApi(cfg);
    const lambdaHandler = getLambdaHandler(cfg);
    const contextProvider = getContext(cfg);
    lambdaHandler.then(
      (handler) => {
        const caller = (event: any, ctx: Context) => callHandler(handler, event, ctx);
        processNextRequest(lambdaApi, handler, contextProvider, caller, contextBasedExecutor, done);
      },
      (err) => lambdaApi.sendErrorInit(err).then(() => done(err), done)
    );
  }, done);
};

export = runtime;
