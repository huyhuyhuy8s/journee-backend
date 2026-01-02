import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import type {NextFunction, Request, Response} from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, {recursive: true});
}

const getTime = (): string => {
  return new Date().toISOString();
};

const getLogFileName = (type = 'access'): string => {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(logsDir, `${type}-${date}.log`);
};

const writeToLogFile = (message: string, type = 'access'): void => {
  const logFile = getLogFileName(type);
  const logEntry = `${getTime()} - ${message}\n`;

  fs.appendFile(logFile, logEntry, (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
    }
  });
};

const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const start = Date.now();

  const requestInfo = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('User-Agent') || 'Unknown',
    time: getTime(),
  };

  const requestMessage = `${requestInfo.method} ${requestInfo.url} - IP: ${requestInfo.ip} - UserAgent: ${requestInfo.userAgent}`;
  console.info(`📥 [REQUEST] ${requestMessage}`);
  writeToLogFile(`[REQUEST] ${requestMessage}`);

  const originalSend = res.send;
  res.send = function (data: Buffer | string): Response {
    const duration = Date.now() - start;
    const responseInfo = {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: data ? Buffer.byteLength(data, 'utf8') : 0,
    };

    const responseMessage = `${requestInfo.method} ${requestInfo.url} - ${responseInfo.statusCode} - ${responseInfo.duration} - ${responseInfo.contentLength} bytes`;

    let logLevel;
    if (res.statusCode >= 400) {
      logLevel = '❌';
      writeToLogFile(`[ERROR] ${responseMessage}`, 'error');
    } else if (res.statusCode >= 300) {
      logLevel = '📝';
    } else {
      logLevel = '✅';
    }

    console.info(`${logLevel} [RESPONSE] ${responseMessage}`);
    writeToLogFile(`[RESPONSE] ${responseMessage}`);

    return originalSend.call(this, data);
  };

  next();
};

const errorLogger = (
  err: Error,
  req: Request,
  _: Response,
  next: NextFunction,
): void => {
  const errorInfo = {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.socket.remoteAddress,
    time: getTime(),
  };

  console.error(
    `💥 [ERROR] ${errorInfo.method} ${errorInfo.url} - ${errorInfo.message}`,
  );
  console.error(errorInfo.stack);

  // Log error to file
  const errorMessage = `[ERROR] ${errorInfo.method} ${errorInfo.url} - IP: ${errorInfo.ip} - Message: ${errorInfo.message} - Stack: ${errorInfo.stack}`;
  writeToLogFile(errorMessage, 'error');

  next(err);
};

const authLogger = {
  logLogin: (
    email: string,
    success: boolean,
    ip: string | undefined,
    userAgent: string | undefined,
  ): void => {
    const status = success ? 'SUCCESS' : 'FAILED';
    const message = `[AUTH] Login ${status} - Email: ${email} - IP: ${ip} - UserAgent: ${userAgent}`;

    console.info(`🔐 ${message}`);
    writeToLogFile(message, 'auth');
  },

  logRegister: (
    email: string,
    success: boolean,
    ip: string | undefined,
    userAgent: string | undefined,
  ): void => {
    const status = success ? 'SUCCESS' : 'FAILED';
    const message = `[AUTH] Register ${status} - Email: ${email} - IP: ${ip} - UserAgent: ${userAgent}`;

    console.info(`📝 ${message}`);
    writeToLogFile(message, 'auth');
  },

  logLogout: (
    email: string,
    ip: string | undefined,
    userAgent: string | undefined,
  ): void => {
    const message = `[AUTH] Logout - Email: ${email} - IP: ${ip} - UserAgent: ${userAgent}`;

    console.info(`🚪 ${message}`);
    writeToLogFile(message, 'auth');
  },
};

const cleanupOldLogs = (daysToKeep = 30): void => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  fs.readdir(logsDir, (err, files) => {
    if (err) return;

    files.forEach((file) => {
      const filePath = path.join(logsDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;

        if (stats.mtime < cutoffDate) {
          fs.unlink(filePath, (err) => {
            if (!err) {
              console.info(`🗑️ Cleaned up old log file: ${file}`);
            }
          });
        }
      });
    });
  });
};

export {requestLogger, errorLogger, authLogger, cleanupOldLogs};
