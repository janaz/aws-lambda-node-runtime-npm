import Context from "./context";
import http from "http";

export type LambdaHandler = (
  event: object,
  context: Context,
  callback: Callback
) => Promise<object> | void;

export type LambdaResponseValue = object | string | number | undefined;

export type Callback = (err: null | Error, value?: LambdaResponseValue) => void;

export interface LambdaApiResponse {
  readonly status: number;
  readonly headers: http.IncomingHttpHeaders;
  readonly body: Buffer;
}
export interface LambdaHeaders {
  readonly "lambda-runtime-aws-request-id": string;
  readonly "lambda-runtime-deadline-ms": string;
  readonly "lambda-runtime-trace-id": string;
  readonly "lambda-runtime-invoked-function-arn": string;
  readonly "lambda-runtime-cognito-identity": string;
  readonly "lambda-runtime-client-context": string;
}

export interface ContextBasedFunctionExecutor {
  execute: (ctx: Context) => (fn: () => void) => void
}

export interface LambdaApi {
  fetchNext: () => Promise<LambdaApiResponse>,
  sendSuccessResponse: (id: string, obj: LambdaResponseValue) => Promise<LambdaApiResponse>,
  sendErrorResponse: (id: string, err: Error) => Promise<LambdaApiResponse>,
  sendErrorInit: (err: Error) => Promise<LambdaApiResponse>,
}
