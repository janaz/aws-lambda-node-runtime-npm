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
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}
export interface LambdaHeaders {
  "lambda-runtime-aws-request-id": string;
  "lambda-runtime-deadline-ms": string;
  "lambda-runtime-trace-id": string;
  "lambda-runtime-invoked-function-arn": string;
  "lambda-runtime-cognito-identity": string;
  "lambda-runtime-client-context": string;
}
