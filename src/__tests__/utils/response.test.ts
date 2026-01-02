import {sendError, sendResponse, sendSuccess} from '@/utils/response';
import type {Response} from 'express';

describe('Response Utilities', () => {
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnValue({json: jsonMock});

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    } as Partial<Response>;
  });

  describe('sendResponse', () => {
    it('should send response with all parameters', () => {
      const testData = {id: 1, name: 'Test'};

      sendResponse(mockResponse as Response, 200, 'Success', testData, '');

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        meta: {
          status: 200,
          message: 'Success',
          error: '',
        },
        results: testData,
      });
    });

    it('should send response with null results by default', () => {
      sendResponse(mockResponse as Response, 404, 'Not Found');

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        meta: {
          status: 404,
          message: 'Not Found',
          error: '',
        },
        results: null,
      });
    });

    it('should send response with empty error string by default', () => {
      sendResponse(mockResponse as Response, 200, 'Success', {data: 'test'});

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.meta.error).toBe('');
    });

    it('should send response with error message', () => {
      sendResponse(mockResponse as Response, 500, 'Server Error', null, 'Internal error occurred');

      expect(jsonMock).toHaveBeenCalledWith({
        meta: {
          status: 500,
          message: 'Server Error',
          error: 'Internal error occurred',
        },
        results: null,
      });
    });

    it('should handle different status codes', () => {
      const statuses = [200, 201, 400, 401, 403, 404, 500];

      statuses.forEach(status => {
        sendResponse(mockResponse as Response, status, 'Message', null, '');
        expect(statusMock).toHaveBeenCalledWith(status);
      });
    });

    it('should handle array results', () => {
      const arrayData = [1, 2, 3, 4, 5];

      sendResponse(mockResponse as Response, 200, 'Array data', arrayData, '');

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.results).toEqual(arrayData);
    });

    it('should handle complex nested objects', () => {
      const complexData = {
        user: {
          id: 1,
          profile: {
            name: 'John',
            settings: {theme: 'dark'},
          },
        },
      };

      sendResponse(mockResponse as Response, 200, 'Complex data', complexData, '');

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.results).toEqual(complexData);
    });

    it('should handle boolean results', () => {
      sendResponse(mockResponse as Response, 200, 'Boolean', true, '');

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.results).toBe(true);
    });

    it('should handle number results', () => {
      sendResponse(mockResponse as Response, 200, 'Number', 42, '');

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.results).toBe(42);
    });

    it('should handle string results', () => {
      sendResponse(mockResponse as Response, 200, 'String', 'test string', '');

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.results).toBe('test string');
    });

    it('should return the response object', () => {
      const result = sendResponse(mockResponse as Response, 200, 'Success', null, '');
      expect(result).toBeDefined();
    });
  });

  describe('sendSuccess', () => {
    it('should send success response with default status 200', () => {
      const data = {id: 1, name: 'Test'};

      sendSuccess(mockResponse as Response, 'Operation successful', data);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        meta: {
          status: 200,
          message: 'Operation successful',
          error: '',
        },
        results: data,
      });
    });

    it('should send success response with custom status', () => {
      const data = {id: 2, created: true};

      sendSuccess(mockResponse as Response, 'Resource created', data, 201);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        meta: {
          status: 201,
          message: 'Resource created',
          error: '',
        },
        results: data,
      });
    });

    it('should include error as empty string', () => {
      sendSuccess(mockResponse as Response, 'Success', {data: 'test'});

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.meta.error).toBe('');
    });

    it('should handle null results', () => {
      sendSuccess(mockResponse as Response, 'Success', null);

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.results).toBeNull();
    });

    it('should handle empty object', () => {
      sendSuccess(mockResponse as Response, 'Success', {});

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.results).toEqual({});
    });

    it('should handle empty array', () => {
      sendSuccess(mockResponse as Response, 'No items found', []);

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.results).toEqual([]);
    });

    it('should accept 2xx status codes', () => {
      [200, 201, 202, 204].forEach(status => {
        sendSuccess(mockResponse as Response, 'Success', {data: 'test'}, status);
        expect(statusMock).toHaveBeenCalledWith(status);
      });
    });

    it('should return the response object', () => {
      const result = sendSuccess(mockResponse as Response, 'Success', {data: 'test'});
      expect(result).toBeDefined();
    });
  });

  describe('sendError', () => {
    it('should send error response with all parameters', () => {
      sendError(mockResponse as Response, 404, 'Resource not found', 'NotFoundError');

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        meta: {
          status: 404,
          message: 'Resource not found',
          error: 'NotFoundError',
        },
        results: null,
      });
    });

    it('should always set results to null', () => {
      sendError(mockResponse as Response, 500, 'Server error', 'InternalError');

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.results).toBeNull();
    });

    it('should handle 400 Bad Request', () => {
      sendError(mockResponse as Response, 400, 'Invalid input', 'ValidationError');

      expect(statusMock).toHaveBeenCalledWith(400);
      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.meta.message).toBe('Invalid input');
    });

    it('should handle 401 Unauthorized', () => {
      sendError(mockResponse as Response, 401, 'Authentication required', 'UnauthorizedError');

      expect(statusMock).toHaveBeenCalledWith(401);
      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.meta.error).toBe('UnauthorizedError');
    });

    it('should handle 403 Forbidden', () => {
      sendError(mockResponse as Response, 403, 'Access denied', 'ForbiddenError');

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should handle 500 Internal Server Error', () => {
      sendError(mockResponse as Response, 500, 'Something went wrong', 'InternalServerError');

      expect(statusMock).toHaveBeenCalledWith(500);
    });

    it('should handle detailed error messages', () => {
      const detailedError = 'Database connection failed: timeout after 30s';
      sendError(mockResponse as Response, 500, 'Database error', detailedError);

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.meta.error).toBe(detailedError);
    });

    it('should handle empty error string', () => {
      sendError(mockResponse as Response, 400, 'Bad request', '');

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.meta.error).toBe('');
    });

    it('should return the response object', () => {
      const result = sendError(mockResponse as Response, 404, 'Not found', 'NotFoundError');
      expect(result).toBeDefined();
    });
  });

  describe('response format consistency', () => {
    it('should have consistent structure across all response functions', () => {
      sendSuccess(mockResponse as Response, 'Success', {data: 'test'});
      const successCall = jsonMock.mock.calls[0][0];

      jsonMock.mockClear();

      sendError(mockResponse as Response, 400, 'Error', 'TestError');
      const errorCall = jsonMock.mock.calls[0][0];

      expect(successCall).toHaveProperty('meta');
      expect(successCall).toHaveProperty('results');
      expect(errorCall).toHaveProperty('meta');
      expect(errorCall).toHaveProperty('results');

      expect(successCall.meta).toHaveProperty('status');
      expect(successCall.meta).toHaveProperty('message');
      expect(successCall.meta).toHaveProperty('error');
      expect(errorCall.meta).toHaveProperty('status');
      expect(errorCall.meta).toHaveProperty('message');
      expect(errorCall.meta).toHaveProperty('error');
    });

    it('should ensure meta and results are always present', () => {
      const functions = [
        () => sendSuccess(mockResponse as Response, 'Success', {data: 'test'}),
        () => sendError(mockResponse as Response, 404, 'Not found', 'Error'),
        () => sendResponse(mockResponse as Response, 200, 'OK', null, ''),
      ];

      functions.forEach((fn, _index) => {
        jsonMock.mockClear();
        fn();
        const call = jsonMock.mock.calls[0][0];
        expect(call).toHaveProperty('meta');
        expect(call).toHaveProperty('results');
      });
    });
  });
});


