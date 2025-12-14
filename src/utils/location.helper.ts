import { GeoPoint } from "firebase-admin/firestore";

export class LocationHelper {
  /**
   * Calculate distance between two GeoPoints using Haversine formula
   * @returns distance in kilometers
   */
  static calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
    const R = 6371; // Earth radius in km
    const lat1Rad = this.toRadians(point1.latitude);
    const lat2Rad = this.toRadians(point2.latitude);
    const deltaLat = this.toRadians(point2.latitude - point1.latitude);
    const deltaLon = this.toRadians(point2.longitude - point1.longitude);

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1Rad) *
        Math.cos(lat2Rad) *
        Math.sin(deltaLon / 2) *
        Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Check if two locations are the same
   * @param threshold - distance in kilometers (default 0.05km = 50m)
   */
  static isSameLocation(
    point1: GeoPoint,
    point2: GeoPoint,
    threshold: number = 0.05
  ): boolean {
    const distance = this.calculateDistance(point1, point2);
    return distance <= threshold;
  }

  /**
   * Validate coordinate values
   */
  static isValidCoordinate(latitude: number, longitude: number): boolean {
    return (
      latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
    );
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
