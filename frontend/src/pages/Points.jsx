import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Points() {
  const { user, updatePoints } = useAuth();
  const [balance, setBalance] = useState(null);
  const [threshold, setThreshold] = useState(50);
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState('');
  const [history, setHistory] = useState([]);
  const [coupon, setCoupon] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [balRes, shopsRes, historyRes] = await Promise.all([
        api.get('/points/balance'),
        api.get('/shops'),
        api.get('/points/history'),
      ]);
      setBalance(balRes.data.points);
      setThreshold(balRes.data.redemptionThreshold);
      setShops(shopsRes.data);
      setHistory(historyRes.data);
      if (shopsRes.data.length) setSelectedShop(shopsRes.data[0]._id);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const redeem = async () => {
    setError('');
    setCoupon(null);
    setLoading(true);
    try {
      const { data } = await api.post('/points/redeem', { shopId: selectedShop });
      setCoupon(data.couponCode);
      setBalance(data.newPointsBalance);
      updatePoints(data.newPointsBalance);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <p style={{ padding: 20 }}>Log in to see your points.</p>;

  return (
    <div style={{ maxWidth: 500, margin: '20px auto', padding: '0 16px' }}>
      <h2>Your points</h2>
      <p style={{ fontSize: 24 }}>{balance ?? '...'} pts</p>
      <p>Redeem threshold: {threshold} points</p>

      <div style={{ margin: '20px 0', padding: 12, border: '1px solid #eee' }}>
        <h4>Redeem a coupon</h4>
        <select value={selectedShop} onChange={(e) => setSelectedShop(e.target.value)} style={{ width: '100%', marginBottom: 8, padding: 6 }}>
          {shops.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <button onClick={redeem} disabled={loading || (balance ?? 0) < threshold} style={{ width: '100%', padding: 10 }}>
          {loading ? 'Redeeming...' : `Redeem ${threshold} points`}
        </button>
        {(balance ?? 0) < threshold && <p style={{ fontSize: 12, color: '#888' }}>You need at least {threshold} points to redeem.</p>}
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        {coupon && <p style={{ color: 'green', fontWeight: 700 }}>Your coupon: {coupon}</p>}
      </div>

      <h4>Redemption history</h4>
      {history.length === 0 && <p>No redemptions yet.</p>}
      {history.map((h) => (
        <div key={h._id} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>
          {h.couponCode} — {h.shop?.name} — {h.pointsSpent} pts — {new Date(h.createdAt).toLocaleDateString()}
        </div>
      ))}
    </div>
  );
}
