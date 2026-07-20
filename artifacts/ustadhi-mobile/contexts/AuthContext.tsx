import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'student' | 'teacher' | 'assistant' | 'parent' | 'admin';

export interface AuthUser {
  id: number;
  fullName: string;
  phone: string;
  role: UserRole;
  gradeLevel?: string;
  bio?: string;
  avatarUrl?: string;
  // أدمن
  adminToken?: string;
  // طالب
  studentId?: number;
  studentName?: string;
  // مساعد الأستاذ
  teacherId?: number;
  teacherName?: string;
  teacherAvatarUrl?: string;
  // أستاذ
  subjects?: { id: number; name: string; icon?: string | null }[];
  gradeLevels?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoggedIn: false,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
});

const STORAGE_KEY = '@ustadhi_auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try { setUser(JSON.parse(data)); } catch {}
      }
      setIsLoading(false);
    });
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const base = domain ? `https://${domain}` : '';
      const res = await fetch(`${base}/api/mobile/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { success: false, error: body.error || 'اسم المستخدم أو كلمة المرور غير صحيحة' };
      }
      const authUser: AuthUser = await res.json();
      setUser(authUser);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
      return { success: true };
    } catch {
      return { success: false, error: 'تعذّر الاتصال بالخادم. تحقق من الإنترنت.' };
    }
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
