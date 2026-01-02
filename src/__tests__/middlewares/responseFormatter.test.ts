import {responseFormatter} from '@/middlewares/responseFormatter';
import type {NextFunction, Request, Response} from 'express';

describe('Response Formatter Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnValue({json: jsonMock});

    mockRequest = {} as Partial<Request>;
    mockResponse = {
      status: statusMock,
      headersSent: false,
    } as Partial<Response>;
    mockNext = jest.fn();
  });

  it('should call next middleware', () => {
    responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  describe('apiResponse', () => {
    it('should add apiResponse method to response object', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.apiResponse).toBeDefined();
      expect(typeof mockResponse.apiResponse).toBe('function');
    });

    it('should send response with meta and results', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      mockResponse.apiResponse?.({status: 200, message: 'Success'}, {data: 'test'});

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        meta: {
          status: 200,
          message: 'Success',
          error: null,
        },
        results: {data: 'test'},
      });
    });

    it('should use default status 200 when not provided', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      mockResponse.apiResponse?.({message: 'Success'}, {data: 'test'});

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should set error to null when not provided', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      mockResponse.apiResponse?.({status: 200, message: 'Success'}, {data: 'test'});

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.meta.error).toBeNull();
    });

    it('should include error when provided', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      mockResponse.apiResponse?.({status: 400, message: 'Error', error: 'ValidationError'}, null);

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.meta.error).toBe('ValidationError');
    });

    it('should handle null results', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      mockResponse.apiResponse?.({status: 200, message: 'Success'}, null);

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.results).toBeNull();
    });

    it('should handle different status codes', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      const statuses = [200, 201, 400, 401, 403, 404, 500];

      statuses.forEach(status => {
        statusMock.mockClear();
        mockResponse.apiResponse?.({status, message: 'Test'}, null);
        expect(statusMock).toHaveBeenCalledWith(status);
      });
    });
  });

  describe('apiSuccess', () => {
    it('should add apiSuccess method to response object', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.apiSuccess).toBeDefined();
      expect(typeof mockResponse.apiSuccess).toBe('function');
    });

    it('should send success response with default status 200', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      mockResponse.apiSuccess?.({message: 'Success'}, {data: 'test'});

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        meta: {
          status: 200,
          message: 'Success',
        },
        results: {data: 'test'},
      });
    });

    it('should send success response with custom status', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      mockResponse.apiSuccess?.({message: 'Created', status: 201}, {id: 1});

      expect(statusMock).toHaveBeenCalledWith(201);
      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.meta.status).toBe(201);
    });

    it('should not include error field in meta', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      mockResponse.apiSuccess?.({message: 'Success'}, {data: 'test'});

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.meta).not.toHaveProperty('error');
    });

    it('should handle null results', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      mockResponse.apiSuccess?.({message: 'Success'}, null);

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.results).toBeNull();
    });

    it('should handle empty object results', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      mockResponse.apiSuccess?.({message: 'Success'}, {});

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.results).toEqual({});
    });

    it('should handle array results', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      mockResponse.apiSuccess?.({message: 'Success'}, [1, 2, 3]);

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.results).toEqual([1, 2, 3]);
    });
  });

  describe('apiError', () => {
    it('should add apiError method to response object', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.apiError).toBeDefined();
      expect(typeof mockResponse.apiError).toBe('function');
    });

    it('should send error response', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      mockResponse.apiError?.({status: 400, message: 'Bad Request', error: 'ValidationError'});

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        meta: {
          status: 400,
          message: 'Bad Request',
          error: 'ValidationError',
        },
        results: null,
      });
    });

    it('should always set results to null', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      mockResponse.apiError?.({status: 404, message: 'Not Found', error: 'NotFoundError'});

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.results).toBeNull();
    });

    it('should handle different error status codes', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      const errorStatuses = [400, 401, 403, 404, 500, 503];

      errorStatuses.forEach(status => {
        statusMock.mockClear();
        mockResponse.apiError?.({status, message: 'Error', error: 'TestError'});
        expect(statusMock).toHaveBeenCalledWith(status);
      });
    });

    it('should not send response if headers already sent', () => {
      mockResponse.headersSent = true;
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      const result = mockResponse.apiError?.({status: 400, message: 'Error', error: 'TestError'});

      expect(statusMock).not.toHaveBeenCalled();
      expect(jsonMock).not.toHaveBeenCalled();
      expect(result).toBe(mockResponse);
    });

    it('should return response object', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      const result = mockResponse.apiError?.({status: 400, message: 'Error', error: 'TestError'});

      expect(result).toBeDefined();
    });

    it('should handle empty error string', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      mockResponse.apiError?.({status: 500, message: 'Internal Error', error: ''});

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.meta.error).toBe('');
    });

    it('should handle detailed error messages', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      const detailedError = 'Database connection failed: timeout after 30s';
      mockResponse.apiError?.({status: 500, message: 'Database Error', error: detailedError});

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.meta.error).toBe(detailedError);
    });
  });

  describe('integration', () => {
    it('should allow chaining of multiple response methods', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.apiResponse).toBeDefined();
      expect(mockResponse.apiSuccess).toBeDefined();
      expect(mockResponse.apiError).toBeDefined();
    });

    it('should maintain consistent response structure across all methods', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      mockResponse.apiSuccess?.({message: 'Success'}, {data: 'test'});
      const successCall = jsonMock.mock.calls[0][0];

      jsonMock.mockClear();

      mockResponse.apiError?.({status: 400, message: 'Error', error: 'TestError'});
      const errorCall = jsonMock.mock.calls[0][0];

      jsonMock.mockClear();

      mockResponse.apiResponse?.({status: 200, message: 'Response'}, {data: 'test'});
      const responseCall = jsonMock.mock.calls[0][0];

      // All should have meta and results
      expect(successCall).toHaveProperty('meta');
      expect(successCall).toHaveProperty('results');
      expect(errorCall).toHaveProperty('meta');
      expect(errorCall).toHaveProperty('results');
      expect(responseCall).toHaveProperty('meta');
      expect(responseCall).toHaveProperty('results');
    });

    it('should not interfere with other response methods', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toBe(statusMock);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined message', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      mockResponse.apiSuccess?.({message: undefined as never}, {data: 'test'});

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.meta.message).toBeUndefined();
    });

    it('should handle complex nested results', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      const complexData = {
        user: {
          id: 1,
          profile: {
            name: 'Test',
            settings: {theme: 'dark', notifications: true},
          },
        },
        metadata: {timestamp: Date.now()},
      };

      mockResponse.apiSuccess?.({message: 'Success'}, complexData);

      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.results).toEqual(complexData);
    });

    it('should handle very large status codes', () => {
      responseFormatter(mockRequest as Request, mockResponse as Response, mockNext);

      mockResponse.apiError?.({status: 599, message: 'Error', error: 'TestError'});

      expect(statusMock).toHaveBeenCalledWith(599);
    });
  });
});

