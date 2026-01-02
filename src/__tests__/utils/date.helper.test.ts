import {getDateKey, getEndOfDay, getStartOfDay, isToday} from '@/utils/date.helper';

describe('Date Helper', () => {
  describe('getDateKey', () => {
    it('should return correct date key for a given date', () => {
      const date = new Date('2025-01-15T12:30:45Z');
      const key = getDateKey(date);
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return current date key when no date provided', () => {
      const key = getDateKey();
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should pad single digit months', () => {
      const date = new Date('2025-01-15');
      const key = getDateKey(date);
      expect(key).toContain('-01-');
    });

    it('should pad single digit days', () => {
      const date = new Date('2025-12-05');
      const key = getDateKey(date);
      expect(key).toContain('-05');
    });

    it('should handle double digit months', () => {
      const date = new Date('2025-11-15');
      const key = getDateKey(date);
      expect(key).toContain('-11-');
    });

    it('should handle double digit days', () => {
      const date = new Date('2025-01-25');
      const key = getDateKey(date);
      expect(key).toContain('-25');
    });

    it('should handle leap year dates', () => {
      const date = new Date('2024-02-29');
      const key = getDateKey(date);
      expect(key).toBe('2024-02-29');
    });

    it('should handle year boundaries', () => {
      const newYear = new Date('2025-01-01');
      const endYear = new Date('2025-12-31');
      expect(getDateKey(newYear)).toBe('2025-01-01');
      expect(getDateKey(endYear)).toBe('2025-12-31');
    });

    it('should be consistent for same date', () => {
      const date = new Date('2025-06-15T14:30:00Z');
      const key1 = getDateKey(date);
      const key2 = getDateKey(date);
      expect(key1).toBe(key2);
    });
  });

  describe('isToday', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('without timezoneOffset (local time)', () => {
      it('should return true for current date', () => {
        const now = new Date('2025-06-15T12:00:00');
        jest.setSystemTime(now);
        expect(isToday(now)).toBe(true);
      });

      it('should return true for same day different time', () => {
        jest.setSystemTime(new Date('2025-06-15T10:00:00'));
        const testDate = new Date('2025-06-15T22:30:00');
        expect(isToday(testDate)).toBe(true);
      });

      it('should return false for yesterday', () => {
        jest.setSystemTime(new Date('2025-06-15T12:00:00'));
        const yesterday = new Date('2025-06-14T12:00:00');
        expect(isToday(yesterday)).toBe(false);
      });

      it('should return false for tomorrow', () => {
        jest.setSystemTime(new Date('2025-06-15T12:00:00'));
        const tomorrow = new Date('2025-06-16T12:00:00');
        expect(isToday(tomorrow)).toBe(false);
      });

      it('should return false for different month', () => {
        jest.setSystemTime(new Date('2025-06-15T12:00:00'));
        const differentMonth = new Date('2025-07-15T12:00:00');
        expect(isToday(differentMonth)).toBe(false);
      });

      it('should return false for different year', () => {
        jest.setSystemTime(new Date('2025-06-15T12:00:00'));
        const differentYear = new Date('2024-06-15T12:00:00');
        expect(isToday(differentYear)).toBe(false);
      });

      it('should handle midnight correctly', () => {
        jest.setSystemTime(new Date('2025-06-15T00:00:00'));
        const midnight = new Date('2025-06-15T00:00:00');
        expect(isToday(midnight)).toBe(true);
      });

      it('should handle end of day correctly', () => {
        jest.setSystemTime(new Date('2025-06-15T23:59:59'));
        const endOfDay = new Date('2025-06-15T23:59:59');
        expect(isToday(endOfDay)).toBe(true);
      });
    });

    describe('with timezoneOffset', () => {
      it('should accept timezone offset parameter', () => {
        jest.setSystemTime(new Date('2025-06-15T10:00:00Z'));
        const testDate = new Date('2025-06-15T20:00:00Z');
        const result = isToday(testDate, 7);
        expect(typeof result).toBe('boolean');
      });

      it('should work with negative timezone offset', () => {
        jest.setSystemTime(new Date('2025-06-15T10:00:00Z'));
        const testDate = new Date('2025-06-15T05:00:00Z');
        const result = isToday(testDate, -5);
        expect(typeof result).toBe('boolean');
      });

      it('should work with zero timezone offset', () => {
        jest.setSystemTime(new Date('2025-06-15T10:00:00Z'));
        const testDate = new Date('2025-06-15T15:00:00Z');
        const result = isToday(testDate, 0);
        expect(typeof result).toBe('boolean');
      });
    });
  });

  describe('getStartOfDay', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return a Date object', () => {
      jest.setSystemTime(new Date('2025-06-15T10:30:45Z'));
      const startOfDay = getStartOfDay();

      expect(startOfDay).toBeInstanceOf(Date);
      expect(startOfDay.getUTCMinutes()).toBe(0);
      expect(startOfDay.getUTCSeconds()).toBe(0);
      expect(startOfDay.getUTCMilliseconds()).toBe(0);
    });

    it('should accept custom timezone offset', () => {
      jest.setSystemTime(new Date('2025-06-15T10:30:45Z'));
      const startOfDay = getStartOfDay(5);

      expect(startOfDay).toBeInstanceOf(Date);
      expect(startOfDay.getUTCMinutes()).toBe(0);
      expect(startOfDay.getUTCSeconds()).toBe(0);
    });

    it('should be idempotent - calling multiple times returns same result', () => {
      jest.setSystemTime(new Date('2025-06-15T10:30:45Z'));
      const startOfDay1 = getStartOfDay(7);
      const startOfDay2 = getStartOfDay(7);

      expect(startOfDay1.getTime()).toBe(startOfDay2.getTime());
    });

    it('should work with negative timezone offset', () => {
      jest.setSystemTime(new Date('2025-06-15T10:30:45Z'));
      const startOfDay = getStartOfDay(-5);

      expect(startOfDay).toBeInstanceOf(Date);
      expect(startOfDay.getUTCMinutes()).toBe(0);
    });
  });

  describe('getEndOfDay', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return a Date object', () => {
      jest.setSystemTime(new Date('2025-06-15T10:30:45Z'));
      const endOfDay = getEndOfDay();

      expect(endOfDay).toBeInstanceOf(Date);
      expect(endOfDay.getUTCMinutes()).toBe(59);
      expect(endOfDay.getUTCSeconds()).toBe(59);
      expect(endOfDay.getUTCMilliseconds()).toBe(999);
    });

    it('should accept custom timezone offset', () => {
      jest.setSystemTime(new Date('2025-06-15T10:30:45Z'));
      const endOfDay = getEndOfDay(0);

      expect(endOfDay).toBeInstanceOf(Date);
      expect(endOfDay.getUTCMinutes()).toBe(59);
      expect(endOfDay.getUTCSeconds()).toBe(59);
    });

    it('should be after start of day', () => {
      jest.setSystemTime(new Date('2025-06-15T10:30:45Z'));
      const startOfDay = getStartOfDay(7);
      const endOfDay = getEndOfDay(7);

      expect(endOfDay.getTime()).toBeGreaterThan(startOfDay.getTime());
    });

    it('should be approximately 24 hours after start of day', () => {
      jest.setSystemTime(new Date('2025-06-15T10:30:45Z'));
      const startOfDay = getStartOfDay(7);
      const endOfDay = getEndOfDay(7);

      const diffInHours = (endOfDay.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
      expect(diffInHours).toBeCloseTo(24, 0);
    });

    it('should be idempotent', () => {
      jest.setSystemTime(new Date('2025-06-15T10:30:45Z'));
      const endOfDay1 = getEndOfDay(7);
      const endOfDay2 = getEndOfDay(7);

      expect(endOfDay1.getTime()).toBe(endOfDay2.getTime());
    });

    it('should work with negative timezone offset', () => {
      jest.setSystemTime(new Date('2025-06-15T10:30:45Z'));
      const endOfDay = getEndOfDay(-5);

      expect(endOfDay).toBeInstanceOf(Date);
      expect(endOfDay.getUTCMinutes()).toBe(59);
    });
  });

  describe('integration - date helpers working together', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should work together for date range checks', () => {
      jest.setSystemTime(new Date('2025-06-15T10:00:00Z'));

      const startOfDay = getStartOfDay(7);
      const endOfDay = getEndOfDay(7);

      expect(startOfDay).toBeInstanceOf(Date);
      expect(endOfDay).toBeInstanceOf(Date);
      expect(endOfDay.getTime()).toBeGreaterThan(startOfDay.getTime());
    });

    it('should generate date keys correctly', () => {
      const date1 = new Date('2025-06-15T08:00:00');
      const date2 = new Date('2025-06-15T20:00:00');

      // Both dates have same calendar day
      expect(getDateKey(date1)).toBe(getDateKey(date2));
    });
  });
});
