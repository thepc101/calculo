export class CalculoError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 400,
  ) {
    super(message);
    this.name = 'CalculoError';
  }
}

export class ParseError extends CalculoError {
  constructor(message: string) {
    super(message, 'PARSE_ERROR', 400);
    this.name = 'ParseError';
  }
}

export class EvaluationError extends CalculoError {
  constructor(message: string) {
    super(message, 'EVALUATION_ERROR', 400);
    this.name = 'EvaluationError';
  }
}

export class ValidationError extends CalculoError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 422);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends CalculoError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class AuthError extends CalculoError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'AuthError';
  }
}

export class RateLimitError extends CalculoError {
  constructor() {
    super('Rate limit exceeded', 'RATE_LIMIT', 429);
    this.name = 'RateLimitError';
  }
}
