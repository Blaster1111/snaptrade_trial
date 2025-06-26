export class CustomApiError extends Error {
  public statusCode: number;
  public msg: string;

  constructor(message: string, statusCode: number) {
    super(message);
    this.msg = message;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, CustomApiError.prototype);
  }
}