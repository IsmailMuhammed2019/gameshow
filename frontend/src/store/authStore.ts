import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, User } from '@/types';
import api from '@/lib/api';

interface AuthStore extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  isInitialized: boolean;
  initialize: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,

      login: async (username: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/login', { username, password });
          const { access_token, user } = response.data;
          
          set({
            user,
            token: access_token,
            isAuthenticated: true,
            isLoading: false,
          });
          
          // Also store in localStorage for immediate access
          localStorage.setItem('token', access_token);
          localStorage.setItem('user', JSON.stringify(user));
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (username: string, email: string, password: string, role: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/register', {
            username,
            email,
            password,
            role,
          });
          
          set({ isLoading: false });
          return response.data;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('auth-storage');
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },

      setToken: (token: string) => {
        set({ token });
      },

      initialize: () => {
        set({ isInitialized: true });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
