/**
 * AppError = "expected" errors intentionally returned to the client properly.
 * Example: invalid credentials (401), duplicate email (409), not found (404).
 */
export class AppError extends Error {

  public code?: string;
  
  constructor(message: string, public statusCode: number, code?: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}
