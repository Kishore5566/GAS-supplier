import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api, authStorage } from '../services/api';

const AVATAR_MAP: Record<string, string> = {
  'admin@cylindertrack.io': '/src/assets/images/avatar_admin_sarah_1793082206633.jpg',
  'inventory@cylindertrack.io': '/src/assets/images/avatar_inventory_marcus_1793082206290.jpg',
  'delivery@cylindertrack.io': '/src/assets/images/avatar_delivery_dave_1793082207572.jpg',
  'tech@cylindertrack.io': '/src/assets/images/avatar_technician_elena_1793082207340.jpg',
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  switchDemoRole: (role: UserRole) => Promise<void>;
  isAdmin: boolean;
  canManageInventory: boolean;
  canDeliver: boolean;
  canInspect: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const initAuth = async () => {
    try {
      const token = authStorage.getToken();
      if (token) {
        const res = await api.getMe();
        if (res && res.user) {
          setUser({
            ...res.user,
            avatar: AVATAR_MAP[res.user.email] || ''
          });
          setLoading(false);
          return;
        }
      }
      // Auto login as Admin demo for seamless initial evaluation
      await login('admin@cylindertrack.io', 'gas12345');
    } catch (err) {
      console.warn('Auth auto-login notice:', err);
      try {
        await login('admin@cylindertrack.io', 'gas12345');
      } catch (e) {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email: string, password = 'gas12345') => {
    const res = await api.login(email, password);
    if (res && res.user) {
      setUser({
        ...res.user,
        avatar: AVATAR_MAP[res.user.email] || ''
      });
    }
  };

  const logout = () => {
    authStorage.clearToken();
    setUser(null);
  };

  const switchDemoRole = async (targetRole: UserRole) => {
    const roleEmailMap: Record<UserRole, string> = {
      'Admin': 'admin@cylindertrack.io',
      'Inventory Manager': 'inventory@cylindertrack.io',
      'Delivery Staff': 'delivery@cylindertrack.io',
      'Technician': 'tech@cylindertrack.io'
    };
    await login(roleEmailMap[targetRole], 'gas12345');
  };

  const role = user?.role;
  const isAdmin = role === 'Admin';
  const canManageInventory = role === 'Admin' || role === 'Inventory Manager';
  const canDeliver = role === 'Admin' || role === 'Delivery Staff';
  const canInspect = role === 'Admin' || role === 'Technician';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        switchDemoRole,
        isAdmin,
        canManageInventory,
        canDeliver,
        canInspect
      }}
    >
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
