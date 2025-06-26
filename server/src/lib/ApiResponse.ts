export class ApiResponse {
  statusCode: number;
  message?: string | null;
  data?: any | null;

  constructor(statusCode: number, data?: any, message?: string | null) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }
}