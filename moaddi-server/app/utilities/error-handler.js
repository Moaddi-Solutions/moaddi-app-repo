'use strict';

const handle = (err) => {
  // console.log('err:', err)
  // MongoDb duplicate key error.
  if (err.code == 11000) {
    return {
      statusCode: 409,
      message: 'Duplicate Key error.'
    }
  }

  // Passport invalid token error.
  if (err.name && err.name === 'JsonWebTokenError') {
    return {
      statusCode: 401,
      message: 'Invalid token.'
    }
  }

  // Passport token expired.
  if (err.name && err.name === 'TokenExpiredError') {
    return {
      statusCode: 401,
      message: 'JWT expired.'
    }
  }

  // Passport token not found error.
  if (err.toString().startsWith('Error: File is not supported')) {
    return {
      statusCode: 415,
      message: 'File is not supported.'
    }
  }

  // Passport token not found error.
  if (err.toString().startsWith('Error: No auth token')) {
    return {
      statusCode: 401,
      message: 'No authentication token provided.'
    }
  }

  // Default.
  return {
    statusCode: err.statusCode || 500,
    message: err.message || 'Internal server error.'
  }
}

module.exports = {
  handle
}