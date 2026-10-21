'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Role } from '@/types/api';
import { api } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: Role | null;
  login: (email: string, password: string, walletAddress: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { useQueryClient } from '@tanstack/react-query';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('vc_token');
    localStorage.removeItem('vc_user');
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    const handleAuthLogout = () => {
      logout();
    };
    window.addEventListener('vc:auth:logout', handleAuthLogout);
    return () => window.removeEventListener('vc:auth:logout', handleAuthLogout);
  }, [logout]);

  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem('vc_token');
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    setToken(storedToken);

    try {
      const res = await api.me();
      setUser(res.data.user);
      localStorage.setItem('vc_user', JSON.stringify(res.data.user));
    } catch {
      // If fetching me fails, try using cached user or clear
      const cached = localStorage.getItem('vc_user');
      if (cached) {
        try {
          setUser(JSON.parse(cached));
        } catch {
          logout();
        }
      } else {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (
    email: string,
    password: string,
    walletAddress: string
  ): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await api.login(email, password, walletAddress);
      const { token: receivedToken, user: loggedInUser } = res.data;
      localStorage.setItem('vc_token', receivedToken);
      localStorage.setItem('vc_user', JSON.stringify(loggedInUser));
      setToken(receivedToken);
      setUser(loggedInUser);
      return loggedInUser;
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    role: user?.role ?? null,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
