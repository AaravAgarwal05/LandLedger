import * as turf from '@turf/turf';
import crypto from 'crypto';

/**
 * Compute area from GeoJSON polygon in square meters
 */
export function computeAreaFromGeo(geo: any): number {
  if (!geo || !geo.coordinates) {
    throw new Error('Invalid GeoJSON: missing coordinates');
  }

  const polygon = turf.polygon(geo.coordinates);
  const area = turf.area(polygon); // Returns area in square meters
  return area;
}

/**
 * Compute bounding box from GeoJSON polygon
 * Returns [minLon, minLat, maxLon, maxLat]
 */
export function computeGeoBBox(geo: any): number[] {
  if (!geo || !geo.coordinates) {
    throw new Error('Invalid GeoJSON: missing coordinates');
  }

  const polygon = turf.polygon(geo.coordinates);
  const bbox = turf.bbox(polygon); // Returns [minLon, minLat, maxLon, maxLat]
  return bbox;
}

/**
 * Convert area from square meters to specified unit
 */
export function convertArea(areaInSqMeters: number, toUnit: string): number {
  const conversions: Record<string, number> = {
    sqm: 1,
    sqft: 10.7639, // 1 sqm = 10.7639 sqft
    acres: 0.000247105, // 1 sqm = 0.000247105 acres
    hectares: 0.0001, // 1 sqm = 0.0001 hectares
  };

  const factor = conversions[toUnit] || 1;
  return areaInSqMeters * factor;
}

/**
 * Validate area: check if computed area is within tolerance of user input
 * @param computedArea - Area in square meters from geo polygon
 * @param userArea - User input area
 * @param userUnit - Unit of user input (sqft, sqm, acres, hectares)
 * @param tolerancePercent - Allowed difference percentage (default 30%)
 * @returns { valid: boolean, difference: number, message: string }
 */
export function validateArea(
  computedArea: number,
  userArea: number,
  userUnit: string,
  tolerancePercent: number = 30
): { valid: boolean; difference: number; message: string } {
  // Convert user area to square meters
  const conversions: Record<string, number> = {
    sqm: 1,
    sqft: 0.092903, // 1 sqft = 0.092903 sqm
    acres: 4046.86, // 1 acre = 4046.86 sqm
    hectares: 10000, // 1 hectare = 10000 sqm
  };

  const userAreaInSqMeters = userArea * (conversions[userUnit] || 1);
  
  const difference = Math.abs(computedArea - userAreaInSqMeters);
  const percentDifference = (difference / userAreaInSqMeters) * 100;

  const valid = percentDifference <= tolerancePercent;

  return {
    valid,
    difference: percentDifference,
    message: valid
      ? `Area validated successfully (${percentDifference.toFixed(2)}% difference)`
      : `Area validation failed: ${percentDifference.toFixed(2)}% difference exceeds ${tolerancePercent}% tolerance`,
  };
}

/**
 * Create canonical object and generate SHA256 hash
 * Canonical object includes: ownerClerkId, surveyNo, geo, computedArea
 */
export function createCanonicalHash(data: {
  ownerClerkId: string;
  surveyNo: string;
  geo: any;
  computedArea: number;
}): string {
  // Create canonical object with sorted keys
  const canonical = {
    area: data.computedArea,
    geo: data.geo,
    ownerClerkId: data.ownerClerkId,
    surveyNo: data.surveyNo,
  };

  // Convert to JSON string with sorted keys
  const canonicalString = JSON.stringify(canonical, Object.keys(canonical).sort());

  // Generate SHA256 hash
  const hash = crypto.createHash('sha256').update(canonicalString).digest('hex');

  return hash;
}
