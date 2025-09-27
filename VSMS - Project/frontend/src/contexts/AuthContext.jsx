import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!initialized) {
      checkAuth();
      setInitialized(true);
    }
  }, [initialized]);

  const checkAuth = async () => {
    try {
      // First, check if we have a token cookie
      const cookies = document.cookie.split(';');
      const hasToken = cookies.some(cookie => cookie.trim().startsWith('token='));
      
      if (!hasToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      const response = await api.get('/api/auth/me');
      if (response.data.success) {
        setUser(response.data.user);
      } else {
        // If response is not successful, clear the invalid token
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear invalid token on error
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('Attempting login with:', { email });
      const response = await api.post('/api/auth/login', { email, password });
      console.log('Login response:', response.data);
      if (response.data.success) {
        setUser(response.data.user);
        redirectBasedOnRole(response.data.user.role);
        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const redirectBasedOnRole = (role) => {
    switch (role) {
      case 'admin':
        navigate('/admin');
        break;
      case 'mechanic':
        navigate('/mechanic');
        break;
      case 'customer':
        navigate('/customer');
        break;
      default:
        navigate('/login');
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear token even if logout API fails
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
      setUser(null);
      navigate('/login');
    }
  };

  const value = {
    user,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};