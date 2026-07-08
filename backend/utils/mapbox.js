const fetch = require('node-fetch');

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

/**
 * Converts a free-text address into [lng, lat] using Mapbox Geocoding API.
 * Throws a descriptive error if the address can't be resolved.
 */
async function geocodeAddress(address) {
  if (!MAPBOX_TOKEN) throw new Error('MAPBOX_TOKEN is not configured on the server');
  if (!address || !address.trim()) throw new Error('Address is required');

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    address
  )}.json?access_token=${MAPBOX_TOKEN}&limit=1`;

  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error('Could not reach the geocoding service. Try again shortly.');
  }

  if (!res.ok) {
    throw new Error(`Geocoding service error (status ${res.status})`);
  }

  const data = await res.json();
  if (!data.features || data.features.length === 0) {
    throw new Error(`No location found for address: "${address}"`);
  }

  const [lng, lat] = data.features[0].center;
  return { lng, lat, placeName: data.features[0].place_name };
}

/**
 * Gets a driving route between two [lng, lat] points using Mapbox Directions API.
 */
async function getDirections(start, end) {
  if (!MAPBOX_TOKEN) throw new Error('MAPBOX_TOKEN is not configured on the server');

  const coords = `${start.lng},${start.lat};${end.lng},${end.lat}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;

  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error('Could not reach the directions service. Try again shortly.');
  }

  if (!res.ok) {
    throw new Error(`Directions service error (status ${res.status})`);
  }

  const data = await res.json();
  if (!data.routes || data.routes.length === 0) {
    throw new Error('No route could be found between those two points.');
  }

  const route = data.routes[0];
  return {
    geometry: route.geometry, // GeoJSON LineString
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
}

module.exports = { geocodeAddress, getDirections };
