import React, { createContext, useState, useContext, ReactNode } from 'react';

type User = {
  id: string;
  name: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => void;
  register: (email: string, password: string, name: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = (email: string, password: string) => {
    setIsLoading(true);
    // Имитация API запроса
    setTimeout(() => {
      setUser({
        id: '1',
        name: 'Test User',
        email: email,
      });
      setIsLoading(false);
    }, 1000);
  };

  const register = (email: string, password: string, name: string) => {
    setIsLoading(true);
    // Имитация API запроса
    setTimeout(() => {
      setUser({
        id: '1',
        name: name,
        email: email,
      });
      setIsLoading(false);
    }, 1000);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};