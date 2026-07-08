import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api';

// Simple emoji marker so we don't have to fight Leaflet's default-icon
// asset-path issues under Vite's bundler.
const chaiIcon = L.divIcon({
  html: '<div style="font-size: 28px; line-height: 1;">📍</div>',
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

// Recenters the map whenever the given center changes (e.g. once shops load)
function RecenterOnData({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function MapView() {
  const [shops, setShops] = useState([]);
  const [error, setError] = useState('');
  const [route, setRoute] = useState(null);
  const [directionsError, setDirectionsError] = useState('');
  const [manualStart, setManualStart] = useState({ lat: '', lng: '' });
  const [useManual, setUseManual] = useState(false);
  const [center, setCenter] = useState(null);

  const loadShops = useCallback(async () => {
    try {
      const { data } = await api.get('/shops');
      setShops(data);
      if (data.length > 0) {
        const [lng, lat] = data[0].location.coordinates;
        setCenter([lat, lng]);
      }
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadShops();
  }, [loadShops]);

  const getDirectionsTo = async (shop) => {
    setDirectionsError('');
    setRoute(null);

    const runWithStart = async (startLat, startLng) => {
      try {
        const { data } = await api.post(`/shops/${shop._id}/directions`, { startLat, startLng });
        setRoute(data.geometry);
      } catch (err) {
        setDirectionsError(err.message);
      }
    };

    if (useManual) {
      if (!manualStart.lat || !manualStart.lng) {
        setDirectionsError('Enter a manual start latitude and longitude');
        return;
      }
      runWithStart(manualStart.lat, manualStart.lng);
      return;
    }

    if (!navigator.geolocation) {
      setDirectionsError('Browser geolocation is unavailable. Use manual start point instead.');
      setUseManual(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => runWithStart(pos.coords.latitude, pos.coords.longitude),
      () => {
        setDirectionsError('Could not get your location. Try entering a start point manually.');
        setUseManual(true);
      },
      { timeout: 8000 }
    );
  };

  const initialCenter = center || [20.5937, 78.9629]; // fallback: center of India
  const initialZoom = center ? 12 : 4;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 53px)' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        {error && (
          <p style={{ color: 'crimson', position: 'absolute', top: 8, left: 8, zIndex: 1000, background: 'white', padding: 6 }}>
            {error}
          </p>
        )}
        <MapContainer center={initialCenter} zoom={initialZoom} style={{ height: '100%', width: '100%' }}>
          <RecenterOnData center={center} zoom={12} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {shops.map((shop) => {
            const [lng, lat] = shop.location.coordinates;
            return (
              <Marker key={shop._id} position={[lat, lng]} icon={chaiIcon}>
                <Tooltip direction="top" offset={[0, -28]} opacity={0.95}>
                  {shop.name}
                </Tooltip>
                <Popup>
                  <div style={{ minWidth: 200 }}>
                    <h4 style={{ margin: '4px 0' }}>{shop.name}</h4>
                    <p style={{ margin: '4px 0' }}>
                      ⭐ {shop.avgRating || 'No ratings yet'} ({shop.reviewCount} reviews)
                    </p>
                    <p style={{ margin: '4px 0', fontSize: 12 }}>{shop.address}</p>
                    <Link to={`/shops/${shop._id}`}>View details &amp; reviews</Link>

                    <div style={{ marginTop: 8, borderTop: '1px solid #eee', paddingTop: 8 }}>
                      <label style={{ fontSize: 12 }}>
                        <input
                          type="checkbox"
                          checked={useManual}
                          onChange={(e) => setUseManual(e.target.checked)}
                        />{' '}
                        Enter start point manually
                      </label>
                      {useManual && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                          <input
                            placeholder="lat"
                            value={manualStart.lat}
                            onChange={(e) => setManualStart((s) => ({ ...s, lat: e.target.value }))}
                            style={{ width: 60 }}
                          />
                          <input
                            placeholder="lng"
                            value={manualStart.lng}
                            onChange={(e) => setManualStart((s) => ({ ...s, lng: e.target.value }))}
                            style={{ width: 60 }}
                          />
                        </div>
                      )}
                      <button style={{ marginTop: 6, width: '100%' }} onClick={() => getDirectionsTo(shop)}>
                        Get Directions
                      </button>
                      {directionsError && <p style={{ color: 'crimson', fontSize: 12 }}>{directionsError}</p>}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {route && (
            <GeoJSON
              key={JSON.stringify(route)}
              data={{ type: 'Feature', geometry: route, properties: {} }}
              style={{ color: '#c0392b', weight: 4 }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
