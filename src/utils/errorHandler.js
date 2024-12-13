const logger = require('./logger');

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class APIError extends AppError {
  constructor(message, statusCode = 500, originalError = null) {
    super(message, statusCode);
    this.originalError = originalError;
    this.name = 'APIError';
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

const handleError = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  logger.error({
    error: {
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
      originalError: err.originalError
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      body: req.body,
      user: req.user?.email
    }
  });

  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    // Production: don't leak error details
    res.status(err.statusCode).json({
      status: err.status,
      message: err.isOperational ? err.message : 'Something went wrong'
    });
  }
};

module.exports = {
  AppError,
  APIError,
  ValidationError,
  handleError
}; 