import { Response } from "express";

interface SuccessResponse {
  status: "success";
  message?: string;
  data?: any;
}

interface ErrorResponse {
  status: "error";
  message: string;
  errors?: any;
}

export class ResponseUtil {
  static success(
    res: Response,
    data: any = null,
    message: string = "Success",
    statusCode: number = 200
  ): Response {
    const response: SuccessResponse = {
      status: "success",
      message,
      data,
    };

    return res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    message: string = "An error occurred",
    statusCode: number = 500,
    errors: any = null
  ): Response {
    const response: ErrorResponse = {
      status: "error",
      message,
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  static notFound(
    res: Response,
    message: string = "Resource not found"
  ): Response {
    return this.error(res, message, 404);
  }

  static badRequest(
    res: Response,
    message: string = "Bad request",
    errors: any = null
  ): Response {
    return this.error(res, message, 400, errors);
  }

  static unauthorized(
    res: Response,
    message: string = "Unauthorized"
  ): Response {
    return this.error(res, message, 401);
  }

  static forbidden(res: Response, message: string = "Forbidden"): Response {
    return this.error(res, message, 403);
  }
}
