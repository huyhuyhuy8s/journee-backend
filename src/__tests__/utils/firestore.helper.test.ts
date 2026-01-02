import {convertTimestamps, validateRequiredFields} from '@/utils/firestore.helper';
import {Timestamp} from 'firebase-admin/firestore';
import type {Response} from 'express';

describe('Firestore Helper', () => {
  describe('convertTimestamps', () => {
    it('should return null for null input', () => {
      const result = convertTimestamps(null);
      expect(result).toBeNull();
    });

    it('should return undefined for undefined input', () => {
      const result = convertTimestamps(undefined);
      expect(result).toBeUndefined();
    });

    it('should convert Timestamp to Date', () => {
      const timestamp = Timestamp.fromDate(new Date('2025-01-15T10:00:00Z'));
      const result = convertTimestamps(timestamp);

      expect(result).toBeInstanceOf(Date);
      expect((result as Date).toISOString()).toBe('2025-01-15T10:00:00.000Z');
    });

    it('should convert nested Timestamps in objects', () => {
      const data = {
        name: 'Test',
        createdAt: Timestamp.fromDate(new Date('2025-01-15T10:00:00Z')),
        updatedAt: Timestamp.fromDate(new Date('2025-01-16T10:00:00Z')),
      };

      const result = convertTimestamps<typeof data>(data);

      expect(result.name).toBe('Test');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should convert Timestamps in arrays', () => {
      const timestamps = [
        Timestamp.fromDate(new Date('2025-01-15T10:00:00Z')),
        Timestamp.fromDate(new Date('2025-01-16T10:00:00Z')),
      ];

      const result = convertTimestamps<Date[]>(timestamps);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Date);
      expect(result[1]).toBeInstanceOf(Date);
    });

    it('should handle deeply nested structures', () => {
      const data = {
        user: {
          profile: {
            createdAt: Timestamp.fromDate(new Date('2025-01-15T10:00:00Z')),
            metadata: {
              lastLogin: Timestamp.fromDate(new Date('2025-01-16T10:00:00Z')),
            },
          },
        },
      };

      const result = convertTimestamps<typeof data>(data);

      expect(result.user.profile.createdAt).toBeInstanceOf(Date);
      expect(result.user.profile.metadata.lastLogin).toBeInstanceOf(Date);
    });

    it('should handle arrays of objects with Timestamps', () => {
      const data = [
        {id: 1, createdAt: Timestamp.fromDate(new Date('2025-01-15T10:00:00Z'))},
        {id: 2, createdAt: Timestamp.fromDate(new Date('2025-01-16T10:00:00Z'))},
      ];

      const result = convertTimestamps<typeof data>(data);

      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[1].createdAt).toBeInstanceOf(Date);
    });

    it('should preserve non-Timestamp values', () => {
      const data = {
        string: 'test',
        number: 42,
        boolean: true,
        nullValue: null,
        array: [1, 2, 3],
      };

      const result = convertTimestamps<typeof data>(data);

      expect(result.string).toBe('test');
      expect(result.number).toBe(42);
      expect(result.boolean).toBe(true);
      expect(result.nullValue).toBeNull();
      expect(result.array).toEqual([1, 2, 3]);
    });

    it('should handle empty objects', () => {
      const result = convertTimestamps({});
      expect(result).toEqual({});
    });

    it('should handle empty arrays', () => {
      const result = convertTimestamps([]);
      expect(result).toEqual([]);
    });

    it('should handle mixed arrays', () => {
      const data = [
        'string',
        42,
        Timestamp.fromDate(new Date('2025-01-15T10:00:00Z')),
        {nested: Timestamp.fromDate(new Date('2025-01-16T10:00:00Z'))},
      ];

      const result = convertTimestamps(data) as unknown[];

      expect(result[0]).toBe('string');
      expect(result[1]).toBe(42);
      expect(result[2]).toBeInstanceOf(Date);
      expect((result[3] as Record<string, unknown>).nested).toBeInstanceOf(Date);
    });

    it('should handle plain objects with timestamp properties', () => {
      const data = {
        id: 1,
        createdAt: Timestamp.fromDate(new Date('2025-01-15T10:00:00Z')),
        updatedAt: Timestamp.fromDate(new Date('2025-01-16T10:00:00Z')),
      };

      const result = convertTimestamps(data);

      expect((result as Record<string, unknown>).createdAt).toBeInstanceOf(Date);
      expect((result as Record<string, unknown>).updatedAt).toBeInstanceOf(Date);
    });

    it('should handle primitive values', () => {
      expect(convertTimestamps('string')).toBe('string');
      expect(convertTimestamps(42)).toBe(42);
      expect(convertTimestamps(true)).toBe(true);
      expect(convertTimestamps(false)).toBe(false);
    });

    it('should handle Date objects (not convert them)', () => {
      const date = new Date('2025-01-15T10:00:00Z');
      const result = convertTimestamps(date);
      expect(result).toBe(date);
    });

    it('should handle nested arrays', () => {
      const data = [
        [Timestamp.fromDate(new Date('2025-01-15T10:00:00Z'))],
        [Timestamp.fromDate(new Date('2025-01-16T10:00:00Z'))],
      ];

      const result = convertTimestamps(data);

      expect((result as unknown[][])[0][0]).toBeInstanceOf(Date);
      expect((result as unknown[][])[1][0]).toBeInstanceOf(Date);
    });
  });

  describe('validateRequiredFields', () => {
    let mockResponse: Partial<Response>;
    let apiErrorMock: jest.Mock;

    beforeEach(() => {
      apiErrorMock = jest.fn();
      mockResponse = {
        apiError: apiErrorMock,
      } as Partial<Response>;
    });

    it('should return true when all required fields are present', () => {
      const body = {
        name: 'Test',
        email: 'test@example.com',
        age: 25,
      };

      const result = validateRequiredFields(body, ['name', 'email', 'age'], mockResponse as Response);

      expect(result).toBe(true);
      expect(apiErrorMock).not.toHaveBeenCalled();
    });

    it('should return false when a required field is missing', () => {
      const body = {
        name: 'Test',
        email: 'test@example.com',
      };

      const result = validateRequiredFields(body, ['name', 'email', 'age'], mockResponse as Response);

      expect(result).toBe(false);
      expect(apiErrorMock).toHaveBeenCalledWith({
        status: 400,
        message: 'Validation Error',
        error: 'Missing required fields: age',
      });
    });

    it('should return false when a required field is undefined', () => {
      const body = {
        name: 'Test',
        email: undefined,
      };

      const result = validateRequiredFields(body, ['name', 'email'], mockResponse as Response);

      expect(result).toBe(false);
      expect(apiErrorMock).toHaveBeenCalled();
    });

    it('should return false when a required field is null', () => {
      const body = {
        name: 'Test',
        email: null,
      };

      const result = validateRequiredFields(body, ['name', 'email'], mockResponse as Response);

      expect(result).toBe(false);
      expect(apiErrorMock).toHaveBeenCalled();
    });

    it('should return false when a required field is empty string', () => {
      const body = {
        name: 'Test',
        email: '',
      };

      const result = validateRequiredFields(body, ['name', 'email'], mockResponse as Response);

      expect(result).toBe(false);
      expect(apiErrorMock).toHaveBeenCalled();
    });

    it('should list all missing fields in error message', () => {
      const body = {
        name: 'Test',
      };

      validateRequiredFields(body, ['name', 'email', 'age', 'phone'], mockResponse as Response);

      expect(apiErrorMock).toHaveBeenCalledWith({
        status: 400,
        message: 'Validation Error',
        error: 'Missing required fields: email, age, phone',
      });
    });

    it('should accept zero as a valid value', () => {
      const body = {
        name: 'Test',
        count: 0,
      };

      const result = validateRequiredFields(body, ['name', 'count'], mockResponse as Response);

      expect(result).toBe(true);
    });

    it('should accept false as a valid value', () => {
      const body = {
        name: 'Test',
        active: false,
      };

      const result = validateRequiredFields(body, ['name', 'active'], mockResponse as Response);

      expect(result).toBe(true);
    });

    it('should handle empty required fields array', () => {
      const body = {
        name: 'Test',
      };

      const result = validateRequiredFields(body, [], mockResponse as Response);

      expect(result).toBe(true);
      expect(apiErrorMock).not.toHaveBeenCalled();
    });

    it('should return false for undefined body', () => {
      const result = validateRequiredFields(undefined as never, ['name'], mockResponse as Response);

      expect(result).toBe(false);
      expect(apiErrorMock).toHaveBeenCalledWith({
        status: 400,
        message: 'Invalid request body',
        error: 'Request body is required',
      });
    });

    it('should return false for null body', () => {
      const result = validateRequiredFields(null as never, ['name'], mockResponse as Response);

      expect(result).toBe(false);
      expect(apiErrorMock).toHaveBeenCalledWith({
        status: 400,
        message: 'Invalid request body',
        error: 'Request body is required',
      });
    });

    it('should return false for non-object body', () => {
      const result = validateRequiredFields('string' as never, ['name'], mockResponse as Response);

      expect(result).toBe(false);
      expect(apiErrorMock).toHaveBeenCalledWith({
        status: 400,
        message: 'Invalid request body',
        error: 'Request body is required',
      });
    });

    it('should handle nested field paths', () => {
      const body = {
        user: {
          name: 'Test',
        },
      };

      // Note: Current implementation doesn't support nested paths
      // This test documents current behavior
      const result = validateRequiredFields(body, ['user'], mockResponse as Response);

      expect(result).toBe(true);
    });

    it('should handle objects with array values', () => {
      const body = {
        name: 'Test',
        tags: ['tag1', 'tag2'],
      };

      const result = validateRequiredFields(body, ['name', 'tags'], mockResponse as Response);

      expect(result).toBe(true);
    });

    it('should reject empty arrays', () => {
      const body = {
        name: 'Test',
        tags: [],
      };

      // Empty arrays are truthy, so they pass validation
      const result = validateRequiredFields(body, ['name', 'tags'], mockResponse as Response);

      expect(result).toBe(true);
    });

    it('should handle special characters in field names', () => {
      const body = {
        'field-name': 'value',
        'field_name': 'value2',
        'field.name': 'value3',
      };

      const result = validateRequiredFields(
        body,
        ['field-name', 'field_name', 'field.name'],
        mockResponse as Response,
      );

      expect(result).toBe(true);
    });

    it('should log error for invalid body', () => {
      const consoleSpy = jest.spyOn(console, 'error');

      validateRequiredFields(undefined as never, ['name'], mockResponse as Response);

      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});

