import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function ShopDetail() {
  const { id } = useParams();
  const { user, updatePoints } = useAuth();
  const [shop, setShop] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [myReview, setMyReview] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const [shopRes, reviewsRes] = await Promise.all([
        api.get(`/shops/${id}`),
        api.get(`/reviews/shop/${id}`),
      ]);
      setShop(shopRes.data);
      setReviews(reviewsRes.data);
      if (user) {
        const mine = reviewsRes.data.find((r) => r.user?._id === user.id);
        setMyReview(mine || null);
        if (mine) {
          setRating(mine.rating);
          setText(mine.text);
        }
      }
    } catch (err) {
      setError(err.message);
    }
  }, [id, user]);

  useEffect(() => { load(); }, [load]);

  const submitReview = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      if (myReview) {
        await api.put(`/reviews/${myReview._id}`, { rating, text });
        setMessage('Review updated.');
      } else {
        const { data } = await api.post('/reviews', { shopId: id, rating, text });
        setMessage(`Review submitted! You earned ${data.pointsAwarded} points.`);
        updatePoints(data.newPointsBalance);
      }
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!shop) return <p style={{ padding: 20 }}>{error || 'Loading...'}</p>;

  return (
    <div style={{ maxWidth: 600, margin: '20px auto', padding: '0 16px' }}>
      <Link to="/">&larr; Back to map</Link>
      <h2>{shop.name}</h2>
      <p>{shop.address}</p>
      {shop.description && <p>{shop.description}</p>}
      <p>⭐ {shop.avgRating || 'No ratings yet'} ({shop.reviewCount} reviews)</p>

      {user ? (
        <form onSubmit={submitReview} style={{ margin: '20px 0', padding: 12, border: '1px solid #eee' }}>
          <h4>{myReview ? 'Edit your review' : 'Leave a review'}</h4>
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
          </select>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Short review..." style={{ width: '100%', marginTop: 8, padding: 8 }} />
          {error && <p style={{ color: 'crimson' }}>{error}</p>}
          {message && <p style={{ color: 'green' }}>{message}</p>}
          <button type="submit" style={{ marginTop: 8 }}>{myReview ? 'Update review' : 'Submit review'}</button>
        </form>
      ) : (
        <p><Link to="/login">Log in</Link> to leave a review and earn points.</p>
      )}

      <h4>Reviews</h4>
      {reviews.length === 0 && <p>No reviews yet — be the first!</p>}
      {reviews.map((r) => (
        <div key={r._id} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>
          <strong>{r.user?.name || r.user?.email || 'Anonymous'}</strong> — {r.rating}⭐
          <p style={{ margin: '4px 0' }}>{r.text}</p>
        </div>
      ))}
    </div>
  );
}
