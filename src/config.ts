export interface Config {
  readonly _HANDLER: string;
  readonly LAMBDA_TASK_ROOT: string;
  readonly AWS_LAMBDA_RUNTIME_API: string;
  readonly AWS_LAMBDA_FUNCTION_NAME: string;
  readonly AWS_LAMBDA_FUNCTION_VERSION: string;
  readonly AWS_LAMBDA_FUNCTION_MEMORY_SIZE: number;
  readonly AWS_LAMBDA_LOG_GROUP_NAME: string;
  readonly AWS_LAMBDA_LOG_STREAM_NAME: string;
}

const getEnv = (item: keyof Config): string => {
  if (typeof process.env[item] === "undefined") {
    throw new Error(`Environment variable ${item} not set`);
  } else {
    return process.env[item] as string;
  }
};

const getConfig = (): Promise<Config> => Promise.resolve().then(() => ({
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
}))

export default getConfig
