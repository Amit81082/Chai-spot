import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav style={{ display: 'flex', gap: 16, padding: '12px 20px', borderBottom: '1px solid #eee', alignItems: 'center' }}>
      <Link to="/" style={{ fontWeight: 700, textDecoration: 'none', color: '#5b3a29' }}>🍵 ChaiSpot</Link>
      <Link to="/">Map</Link>
      {user && <Link to="/add-shop">Add Shop</Link>}
      {user && <Link to="/points">Points ({user.points})</Link>}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
        {user ? (
          <>
            <span>{user.name || user.email}</span>
            <button onClick={() => { logout(); navigate('/login'); }}>Log out</button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/signup">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
