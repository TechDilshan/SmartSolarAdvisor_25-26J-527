import React, { createContext, useContext, useState, ReactNode } from 'react';
import { mockUser } from '../mocks/solarSystems';

interface AuthContextType {
  user: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial load check (e.g., from storage)
  React.useEffect(() => {
    // For demo, no async check; set immediately
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    if (email === 'owner@solar.com' && password === 'solar123') {
      setUser(mockUser);
      return;
    }
    throw new Error('Invalid credentials');
  };

  const logout = async () => {
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}