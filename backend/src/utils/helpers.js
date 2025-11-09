const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Response helpers
const successResponse = (res, data, message = 'Success', statusCode = 200, pagination = null) => {
  const response = {
    success: true,
    message,
    data,
  };

  if (pagination) {
    response.pagination = pagination;
  }

  return res.status(statusCode).json(response);
};

const errorResponse = (res, message, statusCode = 400, errors = null) => {
  const response = {
    success: false,
    message,
    errors,
  };

  return res.status(statusCode).json(response);
};

// Password helpers
const hashPassword = async (password) => {
  return await bcrypt.hash(password, config.bcrypt.rounds);
};

const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Token helpers
const generateToken = (payload, secret = config.jwt.secret, expiresIn = config.jwt.expire) => {
  return jwt.sign(payload, secret, { expiresIn });
};

const verifyToken = (token, secret = config.jwt.secret) => {
  return jwt.verify(token, secret);
};

// User sanitization
const sanitizeUser = (user) => {
  const { password_hash, ...sanitizedUser } = user;
  return sanitizedUser;
};

// Pagination helper
const getPaginationParams = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
};

module.exports = {
  successResponse,
  errorResponse,
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  sanitizeUser,
  getPaginationParams,
};