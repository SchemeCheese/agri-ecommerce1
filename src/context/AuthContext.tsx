"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User as FirebaseUser } from 'firebase/auth';

import { useCartStore } from '@/store/useCartStore';
import api from '@/lib/axios';
import { firebaseAuth } from '@/lib/firebase';

type AppRole = 'BUYER' | 'SELLER' | 'ADMIN';

interface User {
  id: string;
  email: string;
  full_name: string;
  is_buyer: boolean;
  is_seller: boolean;
  is_admin: boolean;
  avatar?: string;
  // Workspace đang dùng (BE ký vào JWT). UI buyer/seller dựa vào activeRole.
  activeRole?: AppRole;
  // Các vai trò user sở hữu — quyết định có hiện nút "Đổi vai trò" hay không.
  allowedRoles?: AppRole[];
}

type GoogleAuthRole = 'BUYER' | 'SELLER';

// Kết quả của login/sync: hoặc đã có phiên đầy đủ, hoặc cần chọn workspace.
type RoleSelection = { requiresRoleSelection: true; tempToken: string; allowedRoles: AppRole[]; message?: string };
type SessionOutcome = { requiresRoleSelection: false; user: User; message?: string };
type AuthOutcome = RoleSelection | SessionOutcome;

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<AuthOutcome>;
  loginWithGoogle: (role: GoogleAuthRole) => Promise<AuthOutcome>;
  registerWithGoogle: (role: GoogleAuthRole) => Promise<{ message: string; user?: User }>;
  // Hoàn tất login khi cần chọn vai trò (dùng tempToken).
  selectRole: (tempToken: string, role: AppRole) => Promise<User | null>;
  // Đổi workspace khi đang đăng nhập.
  switchRole: (role: AppRole) => Promise<User | null>;
  becomeSeller: () => Promise<User | null>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

async function getGoogleIdToken() {
  const auth = firebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user.getIdToken();
}

// Idempotent server-side upsert from a Firebase ID token.
// Tries the canonical /auth/sync first; falls back to the older alias /auth/firebase
// so Google sign-in keeps working until the new BE is deployed.
// Trả về raw data — có thể là phiên đầy đủ ({access_token,user}) HOẶC
// yêu cầu chọn vai trò ({requiresRoleSelection,tempToken,allowedRoles}).
async function syncFirebaseUser(idToken: string, role?: GoogleAuthRole): Promise<any> {
  const body = { idToken, ...(role ? { role } : {}) };
  try {
    const { data } = await api.post('/auth/sync', body);
    return data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const { data } = await api.post('/auth/firebase', body);
      return data;
    }
    throw err;
  }
}

function persistSession(loggedUser: User, accessToken: string) {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('agri_user', JSON.stringify(loggedUser));
  useCartStore.getState().setActiveUser(loggedUser.id);
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Guards against duplicate /auth/sync calls when an explicit signIn flow is already in-flight
  const syncingRef = useRef(false);

  // ─── Bootstrap + Firebase auth-state watcher ────────────────────────────
  // Strategy:
  // 1. Read localStorage synchronously so the UI shows the cached user immediately
  //    (no flash of "logged out" on refresh for both native and Firebase sessions).
  // 2. Subscribe to onAuthStateChanged. If Firebase reports a signed-in user but
  //    we have no app-side session (e.g. localStorage was cleared, fresh device),
  //    auto-sync to the DB via /auth/sync.
  useEffect(() => {
    const storedUser = localStorage.getItem('agri_user');
    const token = localStorage.getItem('access_token');
    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        useCartStore.getState().setActiveUser(parsedUser.id);
      } catch {
        /* corrupt localStorage — fall through to guest */
      }
    } else {
      useCartStore.getState().setActiveUser('guest');
    }

    let auth: ReturnType<typeof firebaseAuth>;
    try {
      auth = firebaseAuth();
    } catch (e) {
      // Firebase not configured — finish bootstrap without auth state subscription
      console.warn('[AUTH] Firebase not initialized:', (e as Error).message);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        // Either signed out, or a native (email/password BE) session — leave React state as-is
        setIsLoading(false);
        return;
      }

      // Firebase user present. If we already have a matching app session, nothing to do.
      const cached = localStorage.getItem('agri_user');
      const cachedToken = localStorage.getItem('access_token');
      if (cached && cachedToken) {
        setIsLoading(false);
        return;
      }

      // Firebase says we're signed in but our DB-side session is missing — sync it.
      if (syncingRef.current) {
        setIsLoading(false);
        return;
      }
      syncingRef.current = true;
      try {
        const idToken = await fbUser.getIdToken();
        const synced = await syncFirebaseUser(idToken);
        // Tài khoản nhiều vai trò: background sync không thể tự chọn workspace →
        // để nguyên trạng thái guest, user sẽ chọn vai trò khi vào trang /login.
        if (synced?.requiresRoleSelection) {
          setIsLoading(false);
          return;
        }
        persistSession(synced.user, synced.access_token);
        setUser(synced.user);
      } catch (err) {
        console.error('[AUTH] onAuthStateChanged sync failed', err);
      } finally {
        syncingRef.current = false;
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // ─── Email / password (native BE auth) ──────────────────────────────────
  // BE /auth/login also updates last_login_at server-side on every success.
  const login = async (email: string, pass: string): Promise<AuthOutcome> => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password: pass });
      const data = response.data;
      // Sở hữu cả 2 vai trò → BE trả tempToken, FE phải hỏi chọn workspace.
      if (data?.requiresRoleSelection) {
        return { requiresRoleSelection: true, tempToken: data.tempToken, allowedRoles: data.allowedRoles, message: data.message };
      }
      persistSession(data.user, data.access_token);
      setUser(data.user);
      return { requiresRoleSelection: false, user: data.user, message: data.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Hoàn tất login sau khi user chọn vai trò (login-time). Dùng tempToken.
  const selectRole = async (tempToken: string, role: AppRole): Promise<User | null> => {
    const { data } = await api.post('/auth/select-role', { tempToken, role });
    persistSession(data.user, data.access_token);
    setUser(data.user);
    return data.user;
  };

  // Đổi workspace khi đang đăng nhập (nút "Đổi vai trò"). Dùng access token hiện tại.
  const switchRole = async (role: AppRole): Promise<User | null> => {
    const { data } = await api.post('/auth/switch-role', { role });
    persistSession(data.user, data.access_token);
    setUser(data.user);
    return data.user;
  };

  // ─── Google sign-in / sign-up ───────────────────────────────────────────
  // signInWithPopup → idToken → /auth/sync (which upserts the User row keyed by
  // firebase_uid, refreshes display_name/photo_url/provider, bumps last_login_at).
  const loginWithGoogle = async (role: GoogleAuthRole): Promise<AuthOutcome> => {
    setIsLoading(true);
    syncingRef.current = true;
    try {
      const idToken = await getGoogleIdToken();
      const synced = await syncFirebaseUser(idToken, role);
      if (synced?.requiresRoleSelection) {
        return { requiresRoleSelection: true, tempToken: synced.tempToken, allowedRoles: synced.allowedRoles, message: synced.message };
      }
      persistSession(synced.user, synced.access_token);
      setUser(synced.user);
      return { requiresRoleSelection: false, user: synced.user, message: synced.message || 'Đăng nhập thành công' };
    } finally {
      syncingRef.current = false;
      setIsLoading(false);
    }
  };

  const registerWithGoogle = async (role: GoogleAuthRole): Promise<{ message: string; user?: User }> => {
    setIsLoading(true);
    syncingRef.current = true;
    try {
      const idToken = await getGoogleIdToken();
      // strict endpoint that 409s if the role already exists
      const response = await api.post('/auth/google/register', { idToken, role });
      return { message: response.data.message || 'Đăng ký thành công', user: response.data.user };
    } finally {
      syncingRef.current = false;
      setIsLoading(false);
    }
  };

  const becomeSeller = async (): Promise<User | null> => {
    try {
      const response = await api.post('/auth/become-seller');
      const { access_token, user: updated } = response.data;
      if (access_token) localStorage.setItem('access_token', access_token);
      if (updated) {
        localStorage.setItem('agri_user', JSON.stringify(updated));
        setUser(updated);
        return updated;
      }
      return null;
    } catch (err) {
      console.error('becomeSeller error:', err);
      return null;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('agri_user');
    localStorage.removeItem('access_token');
    useCartStore.getState().setActiveUser('guest');
    // Also clear Firebase persistence so onAuthStateChanged doesn't re-sync the
    // previous account on the next mount. Fire-and-forget; ignore failures.
    try {
      void signOut(firebaseAuth());
    } catch {
      /* Firebase may not be initialized — safe to ignore */
    }
    setTimeout(() => { window.location.href = '/login'; }, 100);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, registerWithGoogle, selectRole, switchRole, becomeSeller, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
