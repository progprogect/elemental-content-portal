import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Skip rate limiting for internal requests (from main backend)
const skipRateLimit = (req: Request): boolean => {
  // Skip if request comes from localhost or internal network
  const ip = req.ip || req.socket.remoteAddress || '';
  const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  const isInternal = ip.startsWith('10.') || ip.startsWith('172.') || ip.startsWith('192.168.');
  
  // Skip if request has internal header (set by main backend)
  const isInternalRequest = req.headers['x-internal-request'] === 'true';
  
  return isLocalhost || isInternal || isInternalRequest;
};

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs (increased for status checks)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit, // Skip for internal requests
});

export const generateRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 generation requests per hour (increased)
  message: 'Too many generation requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit, // Skip for internal requests
});

