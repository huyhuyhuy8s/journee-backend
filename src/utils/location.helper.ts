import type {ICoordinates} from '@/types';

export const calculateDistance = (point1: ICoordinates, point2: ICoordinates): number => {
  const R = 6371; // Earth radius in km
  const lat1Rad = toRadians(point1.latitude);
  const lat2Rad = toRadians(point2.latitude);
  const deltaLat = toRadians(point2.latitude - point1.latitude);
  const deltaLon = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
    Math.cos(lat2Rad) *
    Math.sin(deltaLon / 2) *
    Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const isSameLocation = (
  point1: ICoordinates,
  point2: ICoordinates,
  threshold = 0.05
): boolean => {
  const distance = calculateDistance(point1, point2);
  return distance <= threshold;
};

export const isValidCoordinate = (latitude: number, longitude: number): boolean => {
  return (
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
  );
};

export const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};
