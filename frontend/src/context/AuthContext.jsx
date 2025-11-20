import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');

    // Set a timeout to prevent infinite loading (max 5 seconds)
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ Auth check timed out, proceeding anyway');
      setLoading(false);
      // If we have a token but auth check timed out, remove it to be safe
      if (token) {
        localStorage.removeItem('token');
        setUser(null);
      }
    }, 5000);

    if (token) {
      authApi.getMe()
        .then((response) => {
          clearTimeout(timeoutId);
          setUser(response.data);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          console.error('Auth check failed:', error.message);
          localStorage.removeItem('token');
          setUser(null);
        })
        .finally(() => {
          clearTimeout(timeoutId);
          setLoading(false);
        });
    } else {
      clearTimeout(timeoutId);
      setLoading(false);
    }

    return () => clearTimeout(timeoutId);
  }, []);

  const login = async (email, password) => {
    const response = await authApi.login({ email, password });
    localStorage.setItem('token', response.data.token);
    setUser(response.data);
    return response.data;
  };

  const signup = async (email, password, company) => {
    const response = await authApi.signup({ email, password, company });
    localStorage.setItem('token', response.data.token);
    setUser(response.data);
    return response.data;
  };

  // ⚠️ DO NOT MODIFY - Google OAuth Login (Working)
  // Uses oauthApi with 30s timeout to handle slow Google token exchange
  const googleLogin = async (credential) => {
    const response = await authApi.googleAuth(credential);
    localStorage.setItem('token', response.data.token);
    setUser(response.data);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/'; // Redirect to marketing page
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, googleLogin, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
