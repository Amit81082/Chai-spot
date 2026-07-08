import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import MapView from './pages/MapView';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AddShop from './pages/AddShop';
import ShopDetail from './pages/ShopDetail';
import Points from './pages/Points';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<MapView />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/shops/:id" element={<ShopDetail />} />
          <Route path="/add-shop" element={<PrivateRoute><AddShop /></PrivateRoute>} />
          <Route path="/points" element={<PrivateRoute><Points /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
