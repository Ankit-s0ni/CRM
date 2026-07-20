export class GeoPoint {
  private constructor(
    readonly latitude: number,
    readonly longitude: number,
    readonly accuracyMeters?: number,
  ) {}

  static create(latitude: number, longitude: number, accuracyMeters?: number) {
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180 ||
      (accuracyMeters !== undefined &&
        (!Number.isFinite(accuracyMeters) || accuracyMeters < 0))
    ) {
      throw new Error('GEO_POINT_INVALID');
    }
    return new GeoPoint(latitude, longitude, accuracyMeters);
  }
}
