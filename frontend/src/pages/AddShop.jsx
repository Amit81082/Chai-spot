import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function AddShop() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', address: '', description: '', photoUrl: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/shops', form);
      navigate('/');
    } catch (err) {
      // Surfaces backend geocoding errors, e.g. "No location found for address: ..."
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '40px auto' }}>
      <h2>Add a chai shop</h2>
      <form onSubmit={handleSubmit}>
        <input placeholder="Shop name" value={form.name} onChange={update('name')} required style={{ width: '100%', marginBottom: 8, padding: 8 }} />
        <input placeholder="Address (we'll geocode this for you)" value={form.address} onChange={update('address')} required style={{ width: '100%', marginBottom: 8, padding: 8 }} />
        <textarea placeholder="Description" value={form.description} onChange={update('description')} style={{ width: '100%', marginBottom: 8, padding: 8 }} />
        <input placeholder="Photo URL (optional)" value={form.photoUrl} onChange={update('photoUrl')} style={{ width: '100%', marginBottom: 8, padding: 8 }} />
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10 }}>
          {loading ? 'Locating address...' : 'Add shop'}
        </button>
      </form>
    </div>
  );
}
