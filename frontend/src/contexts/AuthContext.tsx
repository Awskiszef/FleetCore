"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import '../lib/api-interceptor'; // Import interceptor

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (token: string, user: User) => void;
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
        if (pathname !== '/login') router.push('/login');
        return;
      }

      try {
        // Interceptor will automatically attach token
        const res = await fetch(`http://${window.location.hostname}:3001/auth/me`);
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          if (pathname === '/login') {
            router.push('/');
          }
        } else {
          throw new Error('Invalid token');
        }
      } catch (e) {
        console.error('Session expired', e);
        localStorage.removeItem('token');
        if (pathname !== '/login') router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    setUser(userData);
    router.push('/');
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/login');
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Ładowanie...</div>;
  }

  // If not logged in and not on login page, don't render children (avoid flash)
  if (!user && pathname !== '/login') {
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
