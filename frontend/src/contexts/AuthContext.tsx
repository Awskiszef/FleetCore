"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import '../lib/api-interceptor'; // Import interceptor

import { User } from '@/types/models';
interface AuthContextType {
  user: User | null;
  login: (token: string, user?: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        if (pathname !== '/login' && !pathname.startsWith('/auth/aws/callback')) {
          router.push('/login');
        }
        return;
      }

      try {
        // Interceptor will automatically attach token
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/auth/me`);
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          if (userData.mustChangePassword) {
            if (pathname !== '/change-password') router.push('/change-password');
          } else if (pathname === '/login') {
            router.push('/');
          } else if (pathname === '/change-password') {
            router.push('/');
          }
        } else if (res.status === 403) {
          // Nie usuwamy tokenu w przypadku 403 (np. konieczność zmiany hasła na innym endpoincie)
          if (pathname !== '/change-password') router.push('/change-password');
        } else {
          throw new Error('Invalid token');
        }
      } catch (e) {
        console.error('Session expired', e);
        localStorage.removeItem('token');
        if (pathname !== '/login' && !pathname.startsWith('/auth/aws/callback')) {
          router.push('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  const login = async (token: string, userData?: User) => {
    localStorage.setItem('token', token);
    if (userData) {
      setUser(userData);
      if (userData.mustChangePassword) {
        router.push('/change-password');
      } else {
        router.push('/');
      }
    } else {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const fetchedData = await res.json();
          setUser(fetchedData);
          if (fetchedData.mustChangePassword) {
            router.push('/change-password');
          } else {
            router.push('/');
          }
        } else if (res.status === 403) {
          router.push('/change-password');
        } else {
          router.push('/');
        }
      } catch (e) {
        router.push('/');
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/login');
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Ładowanie...</div>;
  }

  // If not logged in and not on a public page, don't render children (avoid flash)
  const isPublicPage = pathname === '/login' || pathname.startsWith('/auth/aws/callback');
  if (!user && !isPublicPage) {
    return null;
  }

  // If user must change password but is not on change-password page, block render (will redirect)
  if (user && user.mustChangePassword && pathname !== '/change-password') {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
