import {calculateDistance, isSameLocation, isValidCoordinate, toRadians} from '@/utils/location.helper';
import type {ICoordinates} from '@/types';

describe('Location Helper', () => {
  describe('toRadians', () => {
    it('should convert 0 degrees to 0 radians', () => {
      expect(toRadians(0)).toBe(0);
    });

    it('should convert 180 degrees to π radians', () => {
      expect(toRadians(180)).toBeCloseTo(Math.PI);
    });

    it('should convert 90 degrees to π/2 radians', () => {
      expect(toRadians(90)).toBeCloseTo(Math.PI / 2);
    });

    it('should convert 360 degrees to 2π radians', () => {
      expect(toRadians(360)).toBeCloseTo(2 * Math.PI);
    });

    it('should handle negative degrees', () => {
      expect(toRadians(-90)).toBeCloseTo(-Math.PI / 2);
    });
  });

  describe('isValidCoordinate', () => {
    it('should return true for valid coordinates', () => {
      expect(isValidCoordinate(0, 0)).toBe(true);
      expect(isValidCoordinate(45.5, 122.7)).toBe(true);
      expect(isValidCoordinate(-33.8, 151.2)).toBe(true);
    });

    it('should return true for boundary values', () => {
      expect(isValidCoordinate(90, 180)).toBe(true);
      expect(isValidCoordinate(-90, -180)).toBe(true);
      expect(isValidCoordinate(90, -180)).toBe(true);
      expect(isValidCoordinate(-90, 180)).toBe(true);
    });

    it('should return false for invalid latitude', () => {
      expect(isValidCoordinate(91, 0)).toBe(false);
      expect(isValidCoordinate(-91, 0)).toBe(false);
      expect(isValidCoordinate(100, 50)).toBe(false);
    });

    it('should return false for invalid longitude', () => {
      expect(isValidCoordinate(0, 181)).toBe(false);
      expect(isValidCoordinate(0, -181)).toBe(false);
      expect(isValidCoordinate(45, 200)).toBe(false);
    });

    it('should return false for both invalid', () => {
      expect(isValidCoordinate(100, 200)).toBe(false);
      expect(isValidCoordinate(-100, -200)).toBe(false);
    });
  });

  describe('calculateDistance', () => {
    it('should return 0 for same location', () => {
      const point: ICoordinates = {latitude: 40.7128, longitude: -74.0060};
      expect(calculateDistance(point, point)).toBe(0);
    });

    it('should calculate distance between New York and Los Angeles', () => {
      const newYork: ICoordinates = {latitude: 40.7128, longitude: -74.0060};
      const losAngeles: ICoordinates = {latitude: 34.0522, longitude: -118.2437};
      const distance = calculateDistance(newYork, losAngeles);

      // Distance should be approximately 3944 km
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });

    it('should calculate distance between London and Paris', () => {
      const london: ICoordinates = {latitude: 51.5074, longitude: -0.1278};
      const paris: ICoordinates = {latitude: 48.8566, longitude: 2.3522};
      const distance = calculateDistance(london, paris);

      // Distance should be approximately 344 km
      expect(distance).toBeGreaterThan(330);
      expect(distance).toBeLessThan(360);
    });

    it('should calculate distance across equator', () => {
      const north: ICoordinates = {latitude: 10, longitude: 0};
      const south: ICoordinates = {latitude: -10, longitude: 0};
      const distance = calculateDistance(north, south);

      // Should be approximately 2222 km (20 degrees of latitude)
      expect(distance).toBeGreaterThan(2200);
      expect(distance).toBeLessThan(2250);
    });

    it('should calculate distance across prime meridian', () => {
      const west: ICoordinates = {latitude: 0, longitude: -10};
      const east: ICoordinates = {latitude: 0, longitude: 10};
      const distance = calculateDistance(west, east);

      // Should be approximately 2226 km (20 degrees of longitude at equator)
      expect(distance).toBeGreaterThan(2200);
      expect(distance).toBeLessThan(2250);
    });

    it('should handle negative coordinates', () => {
      const point1: ICoordinates = {latitude: -33.8688, longitude: 151.2093}; // Sydney
      const point2: ICoordinates = {latitude: -37.8136, longitude: 144.9631}; // Melbourne
      const distance = calculateDistance(point1, point2);

      // Distance should be approximately 714 km
      expect(distance).toBeGreaterThan(700);
      expect(distance).toBeLessThan(730);
    });

    it('should be commutative (distance A to B = distance B to A)', () => {
      const point1: ICoordinates = {latitude: 40.7128, longitude: -74.0060};
      const point2: ICoordinates = {latitude: 34.0522, longitude: -118.2437};

      const distance1 = calculateDistance(point1, point2);
      const distance2 = calculateDistance(point2, point1);

      expect(distance1).toBeCloseTo(distance2);
    });
  });

  describe('isSameLocation', () => {
    it('should return true for identical coordinates', () => {
      const point: ICoordinates = {latitude: 40.7128, longitude: -74.0060};
      expect(isSameLocation(point, point)).toBe(true);
    });

    it('should return true for coordinates within default threshold (0.05 km)', () => {
      const point1: ICoordinates = {latitude: 40.7128, longitude: -74.0060};
      const point2: ICoordinates = {latitude: 40.7129, longitude: -74.0061};
      expect(isSameLocation(point1, point2)).toBe(true);
    });

    it('should return false for coordinates beyond default threshold', () => {
      const point1: ICoordinates = {latitude: 40.7128, longitude: -74.0060};
      const point2: ICoordinates = {latitude: 40.7200, longitude: -74.0060};
      expect(isSameLocation(point1, point2)).toBe(false);
    });

    it('should respect custom threshold - same location with higher threshold', () => {
      const point1: ICoordinates = {latitude: 40.7128, longitude: -74.0060};
      const point2: ICoordinates = {latitude: 40.7200, longitude: -74.0060};
      expect(isSameLocation(point1, point2, 1.0)).toBe(true);
    });

    it('should respect custom threshold - different location with lower threshold', () => {
      const point1: ICoordinates = {latitude: 40.7128, longitude: -74.0060};
      const point2: ICoordinates = {latitude: 40.7129, longitude: -74.0061};
      expect(isSameLocation(point1, point2, 0.001)).toBe(false);
    });

    it('should handle zero threshold', () => {
      const point1: ICoordinates = {latitude: 40.7128, longitude: -74.0060};
      const point2: ICoordinates = {latitude: 40.7128, longitude: -74.0060};
      const point3: ICoordinates = {latitude: 40.7129, longitude: -74.0060};

      expect(isSameLocation(point1, point2, 0)).toBe(true);
      expect(isSameLocation(point1, point3, 0)).toBe(false);
    });

    it('should work with negative coordinates', () => {
      const point1: ICoordinates = {latitude: -33.8688, longitude: 151.2093};
      const point2: ICoordinates = {latitude: -33.8689, longitude: 151.2094};
      expect(isSameLocation(point1, point2)).toBe(true);
    });

    it('should handle large threshold', () => {
      const newYork: ICoordinates = {latitude: 40.7128, longitude: -74.0060};
      const losAngeles: ICoordinates = {latitude: 34.0522, longitude: -118.2437};

      expect(isSameLocation(newYork, losAngeles, 5000)).toBe(true);
    });
  });
});

