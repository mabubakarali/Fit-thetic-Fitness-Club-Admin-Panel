import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Profile, Gym } from '@/types/database';
import { setSyncContext } from '@/lib/syncEngine';

export type AuthMode = 'cloud_synced' | 'offline_standalone';

interface AuthContextType {
  user: Profile | null;
  gym: Gym | null;
  activeGymId: string;
  authMode: AuthMode;
  isAuthenticated: boolean;
  isLoading: boolean;
  isCloudConfigured: boolean;

  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateGymDetails: (updates: Partial<Gym>) => void;
}

export const FIT_THETIC_GYM: Gym = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Fit-Thetic Fitness Club',
  phone: '03216422429',
  email: 'dawood@gmail.com',
  address: 'Royal Avenue, Meherban Colony, Chak Shahzad, Isb',
  currency: 'Rs.',
  receipt_footer: 'Thank you for choosing Fit-Thetic Fitness Club! Registration & fees are non-refundable.',
  whatsapp_reminders_enabled: true,
  reminder_settings: { d7: true, d3: true, d1: true, d0: true },
  created_at: '2026-08-22T00:00:00Z',
  updated_at: new Date().toISOString(),
};

export const DAWOOD_ADMIN: Profile = {
  id: '00000000-0000-0000-0000-000000000002',
  gym_id: FIT_THETIC_GYM.id,
  email: 'dawood@gmail.com',
  full_name: 'Dawood Janjua (Owner / Head Trainer)',
  phone: '03216422429',
  role: 'owner',
  created_at: '2026-08-22T00:00:00Z',
  updated_at: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authMode] = useState<AuthMode>('cloud_synced');

  const [user, setUser] = useState<Profile | null>(() => {
    const saved = localStorage.getItem('fit_thetic_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [gym, setGym] = useState<Gym | null>(() => {
    const saved = localStorage.getItem('fit_thetic_active_gym');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return FIT_THETIC_GYM;
      }
    }
    return FIT_THETIC_GYM;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync Engine Context initialization
  useEffect(() => {
    const gymId = gym?.id || FIT_THETIC_GYM.id;
    const gymName = gym?.name || FIT_THETIC_GYM.name;
    setSyncContext('cloud_synced', gymId, gymName);
  }, [gym]);

  // Persist auth state
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
    const supabasePass = cleanPass.length < 6 ? `dawood_${cleanPass}_pass` : cleanPass;

    // 1. If Supabase is configured and online, attempt cloud authentication in background
    if (isSupabaseConfigured && supabase && navigator.onLine) {
      try {
        // Attempt sign in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: supabasePass,
        });

        if (signInData?.user) {
          const profile: Profile = {
            id: signInData.user.id,
            auth_user_id: signInData.user.id,
            gym_id: FIT_THETIC_GYM.id,
            email: cleanEmail,
            full_name: 'Dawood Janjua (Owner / Head Trainer)',
            phone: '03216422429',
            role: 'owner',
            created_at: signInData.user.created_at,
            updated_at: new Date().toISOString(),
          };
          setUser(profile);
          setGym(FIT_THETIC_GYM);
          setIsLoading(false);
          return { success: true };
        }

        // If not registered yet, auto sign-up
        if (signInError) {
          const { data: signUpData } = await supabase.auth.signUp({
            email: cleanEmail,
            password: supabasePass,
            options: {
              data: {
                full_name: 'Dawood Janjua',
                gym_name: 'Fit-Thetic Fitness Club',
              },
            },
          });

          const createdUserId = signUpData?.user?.id || DAWOOD_ADMIN.id;

          // Attempt initializing gym record if table exists
          try {
            await supabase.from('gyms').upsert({
              id: FIT_THETIC_GYM.id,
              name: FIT_THETIC_GYM.name,
              phone: FIT_THETIC_GYM.phone,
              email: cleanEmail,
              address: FIT_THETIC_GYM.address,
              currency: FIT_THETIC_GYM.currency,
              receipt_footer: FIT_THETIC_GYM.receipt_footer,
            });

            if (signUpData?.session) {
              await supabase.from('gym_users').upsert({
                user_id: createdUserId,
                gym_id: FIT_THETIC_GYM.id,
                role: 'owner',
                full_name: 'Dawood Janjua',
                email: cleanEmail,
                phone: '03216422429',
              });
            }
          } catch (e) {}

          const profile: Profile = {
            id: createdUserId,
            auth_user_id: createdUserId,
            gym_id: FIT_THETIC_GYM.id,
            email: cleanEmail,
            full_name: 'Dawood Janjua (Owner / Head Trainer)',
            phone: '03216422429',
            role: 'owner',
            created_at: signUpData?.user?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setUser(profile);
          setGym(FIT_THETIC_GYM);
          setIsLoading(false);
          return { success: true };
        }
      } catch (err) {
        // Fall through to instant local login
      }
    }

    // 2. Always log in directly as Dawood Janjua
    const profile: Profile = {
      ...DAWOOD_ADMIN,
      email: cleanEmail,
    };
    setUser(profile);
    setGym(FIT_THETIC_GYM);
    setIsLoading(false);
    return { success: true };
  };

  const updateGymDetails = (updates: Partial<Gym>) => {
    if (gym) {
      const updated = { ...gym, ...updates, updated_at: new Date().toISOString() };
      setGym(updated);
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {}
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        gym: gym || FIT_THETIC_GYM,
        activeGymId: (gym && gym.id) || FIT_THETIC_GYM.id,
        authMode,
        isAuthenticated: Boolean(user),
        isLoading,
        isCloudConfigured: true,
        login,
        logout,
        updateGymDetails,
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
