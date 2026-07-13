//Custom error class, ServerErrors, which encapsulates error details.
export class ServerErrors extends Error {
  statusCode: number;
  details: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, ServerErrors);
    console.warn("ERROR Stack to debug : ", {
      message: message,
      statusCode: statusCode,
      details: details,
    });
  }
}
