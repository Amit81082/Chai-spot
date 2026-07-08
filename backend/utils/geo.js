const fetch = require('node-fetch');

// Nominatim (OpenStreetMap) - free geocoding, no API key required.
// Usage policy requires a descriptive User-Agent and no more than ~1 req/sec,
// which is more than fine for this app's scale.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'ChaiSpot-App/1.0 (student project; contact: chaispot@example.com)';

// Photon (komoot) - free, keyless OSM-based geocoder used as a fallback.
// Nominatim sometimes 403s requests from cloud/shared IPs (Render, college
// networks, VPNs, etc.) even with a valid User-Agent, so we fall back here
// rather than making the whole feature depend on one provider's IP policy.
const PHOTON_URL = 'https://photon.komoot.io/api/';

// OSRM public demo server - free routing, no API key required.
// Note: it's a shared demo server (rate-limited, not for heavy production
// traffic), which is appropriate for a prototype like this.
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

async function geocodeWithNominatim(address) {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(address)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' } });
  if (!res.ok) {
    throw new Error(`Nominatim returned status ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return { lat: Number(data[0].lat), lng: Number(data[0].lon), placeName: data[0].display_name };
}

async function geocodeWithPhoton(address) {
  const url = `${PHOTON_URL}?q=${encodeURIComponent(address)}&limit=1`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    throw new Error(`Photon returned status ${res.status}`);
  }
  const data = await res.json();
  if (!data.features || data.features.length === 0) return null;
  const feature = data.features[0];
  const [lng, lat] = feature.geometry.coordinates;
  const props = feature.properties || {};
  const placeName = [props.name, props.street, props.city, props.state, props.country].filter(Boolean).join(', ');
  return { lat, lng, placeName: placeName || address };
}

/**
 * Converts a free-text address into { lat, lng }.
 * Tries Nominatim first, falls back to Photon if Nominatim errors out
 * (e.g. a 403 from an IP-based block). Throws a descriptive error only if
 * both providers fail or find nothing.
 */
async function geocodeAddress(address) {
  if (!address || !address.trim()) throw new Error('Address is required');

  let result = null;
  let nominatimError = null;

  try {
    result = await geocodeWithNominatim(address);
  } catch (err) {
    nominatimError = err;
  }

  if (!result) {
    try {
      result = await geocodeWithPhoton(address);
    } catch (err) {
      // Both providers failed outright (as opposed to just finding nothing)
      throw new Error(
        `Could not reach the geocoding service (${nominatimError ? nominatimError.message + '; ' : ''}${err.message}). Try again shortly.`
      );
    }
  }

  if (!result) {
    throw new Error(`No location found for address: "${address}"`);
  }

  return result;
}

/**
 * Gets a driving route between two { lat, lng } points using OSRM.
 */
async function getDirections(start, end) {
  const coords = `${start.lng},${start.lat};${end.lng},${end.lat}`;
  const url = `${OSRM_URL}/${coords}?overview=full&geometries=geojson`;

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
  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
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
