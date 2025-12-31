export interface ILocation {
  place?: string;
  street?: string;
  city?: string;
  region?: string;
  country?: string;
  value?: string;
  coordinate: ICoordinates;
}

export interface ICoordinates {
  latitude: number;
  longitude: number;
}
