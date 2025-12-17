/**
 * AppError = "expected" errors intentionally returned to the client properly.
 * Example: invalid credentials (401), duplicate email (409), not found (404).
 */
export class AppError extends Error {
  
    constructor(message: string, public statusCode: number) {
    super(message);
    this.name = "AppError";
  }
}
