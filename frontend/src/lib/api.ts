import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  // Try to get token from localStorage first, then from Zustand store
  let token = localStorage.getItem('token');
  
  // If no token in localStorage, try to get it from the auth store
  if (!token && typeof window !== 'undefined') {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        token = parsed.state?.token;
      }
    } catch (e) {
      console.warn('Could not parse auth storage:', e);
    }
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect to login if we're not already on the login page
      // and if this is not a protected route that should handle auth errors
      const currentPath = window.location.pathname;
      const isLoginPage = currentPath === '/login';
      const isProtectedRoute = ['/general-admin', '/game-master', '/participant', '/audience'].includes(currentPath);
      
      if (!isLoginPage && isProtectedRoute) {
        // Clear auth data and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
