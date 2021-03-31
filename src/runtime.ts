import http from "http";

const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 1,
});

type LambdaHandler = (
  event: object,
  context: Context,
  callback: Callback
) => Promise<object> | void;

type LambdaResponseValue = object | string | number | undefined;

type Callback = (err: null | Error, value?: LambdaResponseValue) => void;

interface Response {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}
interface Config {
  _HANDLER: string;
  LAMBDA_TASK_ROOT: string;
  AWS_LAMBDA_RUNTIME_API: string;
  AWS_LAMBDA_FUNCTION_NAME: string;
  AWS_LAMBDA_FUNCTION_VERSION: string;
  AWS_LAMBDA_FUNCTION_MEMORY_SIZE: number;
  AWS_LAMBDA_LOG_GROUP_NAME: string;
  AWS_LAMBDA_LOG_STREAM_NAME: string;
}
interface LambdaHeaders {
  "lambda-runtime-aws-request-id": string;
  "lambda-runtime-deadline-ms": string;
  "lambda-runtime-trace-id": string;
  "lambda-runtime-invoked-function-arn": string;
  "lambda-runtime-cognito-identity": string;
  "lambda-runtime-client-context": string;
}

class Context {
  private waitForEmptyEventLoop: boolean = true;
  private deadlineMs: number;
  private clientContextObj: object | undefined;
  private identityObj: object | undefined;
  constructor(private headers: LambdaHeaders, private config: Config) {
    this.deadlineMs = Number.parseInt(
      headers["lambda-runtime-deadline-ms"],
      10
    );
    this.clientContextObj = parseJson(headers["lambda-runtime-client-context"]);
    this.identityObj = parseJson(headers["lambda-runtime-cognito-identity"]);
  }
  getRemainingTimeInMillis(): number {
    return this.deadlineMs - new Date().getTime();
  }
  get callbackWaitsForEmptyEventLoop(): boolean {
    return this.waitForEmptyEventLoop;
  }
  set callbackWaitsForEmptyEventLoop(val: boolean) {
    this.waitForEmptyEventLoop = val;
  }
  get identity(): object | undefined {
    return this.identityObj;
  }
  get clientContext(): object | undefined {
    return this.clientContextObj;
  }
  get functionName(): string {
    return this.config.AWS_LAMBDA_FUNCTION_NAME;
  }
  get functionVersion(): string {
    return this.config.AWS_LAMBDA_FUNCTION_VERSION;
  }
  get invokedFunctionArn(): string {
    return this.headers["lambda-runtime-invoked-function-arn"];
  }
  get memoryLimitInMB(): number {
    return this.config.AWS_LAMBDA_FUNCTION_MEMORY_SIZE;
  }
  get awsRequestId(): string {
    return this.headers["lambda-runtime-aws-request-id"];
  }
  get logGroupName(): string {
    return this.config.AWS_LAMBDA_LOG_GROUP_NAME;
  }
  get logStreamName(): string {
    return this.config.AWS_LAMBDA_LOG_STREAM_NAME;
  }
}

const parseJson = (value: string | undefined): object | undefined => {
  if (value) {
    try {
      return JSON.parse(value);
    } catch (e) {
      return undefined;
    }
  }
  return undefined;
};

const getEnv = (item: keyof Config): string => {
  if (typeof process.env[item] === "undefined") {
    throw new Error(`Environment variable ${item} not set`);
  } else {
    return process.env[item] as string;
  }
};

let _invokeBeforeExitFn: (() => void) | null = null;

const setInvokeBeforeExit = (fn: (() => void) | null) => {
  _invokeBeforeExitFn = fn;
};

const beforeExitListener = () => {
  if (_invokeBeforeExitFn) {
    _invokeBeforeExitFn();
  }
};

process.on("beforeExit", beforeExitListener);

const CONFIG = (): Promise<Config> => new Promise((r) => {
  r({
    _HANDLER: getEnv("_HANDLER"),
    LAMBDA_TASK_ROOT: getEnv("LAMBDA_TASK_ROOT"),
    AWS_LAMBDA_RUNTIME_API: getEnv("AWS_LAMBDA_RUNTIME_API"),
    AWS_LAMBDA_FUNCTION_NAME: getEnv("AWS_LAMBDA_FUNCTION_NAME"),
    AWS_LAMBDA_FUNCTION_VERSION: getEnv("AWS_LAMBDA_FUNCTION_VERSION"),
    AWS_LAMBDA_FUNCTION_MEMORY_SIZE: Number.parseInt(
      getEnv("AWS_LAMBDA_FUNCTION_MEMORY_SIZE"),
      10
    ),
    AWS_LAMBDA_LOG_GROUP_NAME: getEnv("AWS_LAMBDA_LOG_GROUP_NAME"),
    AWS_LAMBDA_LOG_STREAM_NAME: getEnv("AWS_LAMBDA_LOG_STREAM_NAME"),
  });
});

let _lambdaHandler: LambdaHandler | undefined = undefined;

const getLambdaHandler = async (cfg: Config): Promise<LambdaHandler> => {
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

const request = (cfg: Config) => (
  method: string,
  path: string,
  body?: LambdaResponseValue
): Promise<Response> => {
  return new Promise((resolve, reject) => {
    const [host, port] = cfg.AWS_LAMBDA_RUNTIME_API.split(":");
    const headers: http.OutgoingHttpHeaders = {
      Accept: "application/json",
    };
    let payload: Buffer | undefined;
    if (typeof body !== "undefined") {
      payload = Buffer.from(JSON.stringify(body));
      (headers["Content-Type"] = "application/json"),
        (headers["Content-Length"] = String(Buffer.byteLength(payload)));
    }
    const options: http.RequestOptions = {
      hostname: host,
      port: port || 80,
      agent,
      path,
      method,
      headers,
    };
    const req = http.request(options, (response) => {
      const data: Buffer[] = [];

      // A chunk of data has been recieved.
      response.on("data", (chunk) => data.push(chunk));

      // The whole response has been received. Print out the result.
      response.on("end", () => {
        if (response.complete) {
          resolve({
            status: response.statusCode as number,
            headers: response.headers,
            body: Buffer.concat(data),
          });
        } else {
          reject(
            new Error(
              "The connection was terminated while the message was still being sent"
            )
          );
        }
      });
    });
    req.on("error", reject);
    if (typeof payload !== "undefined") {
      req.write(payload);
    }
    req.end();
  });
};

const errObj = (err: Error) => ({
  errorMessage: err.message,
  errorType: err.toString(),
});

const fetchNext = (cfg: Config) =>
  request(cfg)("GET", "/2018-06-01/runtime/invocation/next");

const sendSuccessResponse = (
  cfg: Config,
  id: string,
  obj: LambdaResponseValue
) => request(cfg)("POST", `/2018-06-01/runtime/invocation/${id}/response`, obj);

const sendErrorResponse = (cfg: Config, id: string, err: Error) =>
  request(cfg)(
    "POST",
    `/2018-06-01/runtime/invocation/${id}/error`,
    errObj(err)
  );

const sendErrorInit = (cfg: Config, err: Error) =>
  request(cfg)("POST", `/2018-06-01/runtime/init/error`, errObj(err));

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
    try {
      const cb: Callback = (err, val) => {
        if (err) {
          wrappedReject(err);
        } else {
          wrappedResolve(val);
        }
      };
      const retVal = handler.call(null, event, ctx, cb);
      if (typeof retVal === "object" && typeof retVal.then === "function") {
        retVal.then(wrappedResolve, wrappedReject);
      }
    } catch (e) {
      wrappedReject(e);
    }
  });
};

const processNextRequest = (
  handler: LambdaHandler,
  cfg: Config,
  done: Callback
): void => {
  setInvokeBeforeExit(null);
  fetchNext(cfg).then(({ status, headers: _headers, body }) => {
    if (status !== 200) {
      console.warn(
        `Expected response with status 200, but received ${status}. Retrying...`
      );
      processNextRequest(handler, cfg, done);
    }
    const headers = (_headers as unknown) as LambdaHeaders;
    const json = JSON.parse(body.toString());
    process.env._X_AMZN_TRACE_ID = headers["lambda-runtime-trace-id"];
    const ctx = new Context(headers, cfg);
    callHandler(handler, json, ctx)
      .then(
        //success
        (val) => {
          return () => {
            sendSuccessResponse(cfg, ctx.awsRequestId, val).then(
              () => processNextRequest(handler, cfg, done),
              done
            );
          };
        },
        (err) => {
          //error
          return () => {
            sendErrorResponse(cfg, ctx.awsRequestId, err).then(
              () => processNextRequest(handler, cfg, done),
              done
            );
          };
        }
      )
      .then((scheduleNext) => {
        if (!ctx.callbackWaitsForEmptyEventLoop) {
          scheduleNext();
        } else {
          setInvokeBeforeExit(scheduleNext);
        }
      }, done);
  }, done);
};

//----- start here

const runtime = (done: Callback) => {
  CONFIG().then((cfg) => {
    getLambdaHandler(cfg).then(
      (handler) => processNextRequest(handler, cfg, done),
      (err) => sendErrorInit(cfg, err).then(() => done(err), done)
    );
  }, done);
};

export = runtime;
