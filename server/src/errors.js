class AppError extends Error {
  constructor(name, message, options = {}) {
    super(message);
    this.name = name;
    this.code = options.code || name;
    this.cause = options.cause;
  }
}

class ValidationError extends AppError {
  constructor(message, options) {
    super("ValidationError", message, options);
  }
}

class NotFoundError extends AppError {
  constructor(message, options) {
    super("NotFoundError", message, options);
  }
}

class ConflictError extends AppError {
  constructor(message, options) {
    super("ConflictError", message, options);
  }
}

class AuthError extends AppError {
  constructor(message, options) {
    super("AuthError", message, options);
  }
}

class DbError extends AppError {
  constructor(message, options) {
    super("DbError", message, options);
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthError,
  DbError
};
