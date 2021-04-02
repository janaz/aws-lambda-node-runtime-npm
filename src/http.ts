import http from "http";
import { LambdaApiResponse, LambdaResponseValue } from "./types";
import { Config } from "./config";

const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 1,
});

export const request = (cfg: Config) => (
  method: string,
  path: string,
  body?: LambdaResponseValue
): Promise<LambdaApiResponse> => {
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
