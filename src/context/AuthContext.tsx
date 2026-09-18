'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface UserMember {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatarColor?: string;
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  avatarColor?: string;
  householdId: string;
  householdName?: string;
  inviteCode?: string;
  currency?: string;
  members?: UserMember[];
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  viewMode: 'household' | 'personal';
  setViewMode: (mode: 'household' | 'personal') => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  viewMode: 'personal',
  setViewMode: () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

const STORAGE_KEY = 'family_finance_cached_user';
const VIEW_STORAGE_KEY = 'family_finance_view_mode';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewModeState] = useState<'household' | 'personal'>('personal');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY) as 'household' | 'personal' | null;
      if (saved === 'household' || saved === 'personal') {
        setViewModeState(saved);
      }
    }
  }, []);

  const setViewMode = (mode: 'household' | 'personal') => {
    setViewModeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(VIEW_STORAGE_KEY, mode);
    }
  };

  const effectiveViewMode = (user && user.role !== 'ADMIN') ? 'personal' : viewMode;

  const isPublicRoute = pathname === '/login' || pathname === '/register';

  const fetchSession = useCallback(async (isInitial = false) => {
    try {
      // Check session storage first for instant non-blocking hydration
      if (isInitial && typeof window !== 'undefined') {
        const cached = sessionStorage.getItem(STORAGE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setUser(parsed);
            setLoading(false);
          } catch {
            sessionStorage.removeItem(STORAGE_KEY);
          }
        }
      }

      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
          }
        } else {
          setUser(null);
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem(STORAGE_KEY);
          }
          if (!isPublicRoute) {
            router.push('/login');
          }
        }
      } else {
        setUser(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(STORAGE_KEY);
        }
        if (!isPublicRoute) {
          router.push('/login');
        }
      }
    } catch {
      setUser(null);
      if (!isPublicRoute) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [isPublicRoute, router]);

  useEffect(() => {
    fetchSession(true);
  }, [fetchSession]);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setUser(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(STORAGE_KEY);
      }
      router.push('/login');
      router.refresh();
    }
  };

  const refreshUser = async () => {
    await fetchSession(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        viewMode: effectiveViewMode,
        setViewMode,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
