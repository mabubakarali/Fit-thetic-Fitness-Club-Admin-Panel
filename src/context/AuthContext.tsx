import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, Gym, UserRole } from '@/types/database';
import { setSyncContext, getApiUrl, setAuthToken, processSyncQueue } from '@/lib/syncEngine';

export const FIT_THETIC_GYM: Gym = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Fit-Thetic Fitness Club',
  phone: '03216422429',
  email: 'dawood@gmail.com',
  address: 'Royal Avenue, Meherban Colony, Chak Shahzad, Isb',
  currency: 'Rs.',
  receipt_footer: 'Thank you for choosing Fit-Thetic Fitness Club! Registration & fees are non-refundable.',
  whatsapp_reminders_enabled: true,
  reminder_settings: {
    d7: true,
    d3: true,
    d1: true,
    d0: true,
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const DAWOOD_ADMIN: Profile = {
  id: 'admin-001',
  auth_user_id: 'admin-001',
  gym_id: FIT_THETIC_GYM.id,
  email: 'dawood@gmail.com',
  full_name: 'Dawood Janjua (Owner / Head Trainer)',
  phone: '03216422429',
  role: 'owner',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

interface AuthContextType {
  user: Profile | null;
  gym: Gym | null;
  activeGymId: string;
  authMode: 'offline_standalone' | 'cloud_synced';
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setOperatingMode: (mode: 'offline_standalone' | 'cloud_synced') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(() => {
    try {
      const saved = localStorage.getItem('fit_thetic_auth_user');
      return saved ? JSON.parse(saved) : DAWOOD_ADMIN;
    } catch {
      return DAWOOD_ADMIN;
    }
  });

  const [gym, setGym] = useState<Gym | null>(() => {
    try {
      const saved = localStorage.getItem('fit_thetic_active_gym');
      return saved ? JSON.parse(saved) : FIT_THETIC_GYM;
    } catch {
      return FIT_THETIC_GYM;
    }
  });

  const [authMode, setAuthMode] = useState<'offline_standalone' | 'cloud_synced'>('cloud_synced');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setSyncContext('cloud_synced', FIT_THETIC_GYM.id, FIT_THETIC_GYM.name);
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('fit_thetic_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('fit_thetic_auth_user');
    }
    if (gym) {
      localStorage.setItem('fit_thetic_active_gym', JSON.stringify(gym));
    }
  }, [user, gym]);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    const cleanEmail = (email || 'dawood@gmail.com').trim().toLowerCase();
    const cleanPass = (pass || '1234').trim();

    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          setAuthToken(data.token);
        }
        const profile: Profile = {
          id: data.user?.id || 'admin-001',
          auth_user_id: data.user?.id || 'admin-001',
          gym_id: FIT_THETIC_GYM.id,
          email: cleanEmail,
          full_name: data.user?.full_name || 'Dawood Janjua',
          phone: '03216422429',
          role: (data.user?.role as UserRole) || 'owner',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setUser(profile);
        setGym(FIT_THETIC_GYM);
        setIsLoading(false);
        processSyncQueue();
        return { success: true };
      } else {
        const errData = await res.json().catch(() => ({}));
        // If offline fallback with default credentials
        if (cleanEmail === 'dawood@gmail.com' && cleanPass === '1234') {
          setUser(DAWOOD_ADMIN);
          setGym(FIT_THETIC_GYM);
          setIsLoading(false);
          return { success: true };
        }
        setIsLoading(false);
        return { success: false, error: errData.error || 'Invalid email or password' };
      }
    } catch {
      // Offline fallback: allow default admin login
      if (cleanEmail === 'dawood@gmail.com' && cleanPass === '1234') {
        setUser(DAWOOD_ADMIN);
        setGym(FIT_THETIC_GYM);
        setIsLoading(false);
        return { success: true };
      }
      setIsLoading(false);
      return { success: false, error: 'Could not connect to authentication server' };
    }
  };

  const logout = () => {
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem('fit_thetic_auth_user');
  };

  const setOperatingMode = (mode: 'offline_standalone' | 'cloud_synced') => {
    setAuthMode(mode);
    setSyncContext(mode, FIT_THETIC_GYM.id, FIT_THETIC_GYM.name);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        gym,
        activeGymId: FIT_THETIC_GYM.id,
        authMode,
        isLoading,
        login,
        logout,
        setOperatingMode,
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
