import { Config } from "./config";
import { LambdaHeaders } from "./types";

export interface TimeProvider {
  getTime: () => number
}

const dateTimeProvider: TimeProvider = {
  getTime: () => new Date().getTime()
}

class Context {
  private waitForEmptyEventLoop: boolean = true;
  private deadlineMs: number;
  private clientContextObj: object | undefined;
  private identityObj: object | undefined;
  constructor(private headers: LambdaHeaders, private config: Config, private timeProvider: TimeProvider = dateTimeProvider) {
    this.deadlineMs = Number.parseInt(
      headers["lambda-runtime-deadline-ms"],
      10
    );
    this.clientContextObj = parseJson(headers["lambda-runtime-client-context"]);
    this.identityObj = parseJson(headers["lambda-runtime-cognito-identity"]);
  }
  getRemainingTimeInMillis(): number {
    return this.deadlineMs - this.timeProvider.getTime();
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

export default Context
