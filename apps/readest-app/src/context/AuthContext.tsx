'use client';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  refresh: () => void;
}
const noop = () => {};
const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  login: noop,
  logout: noop,
  refresh: noop,
});
// Keep the context contract for local reader tools; readers never authenticate.
export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo(
    () => ({ token: null, user: null, login: noop, logout: noop, refresh: noop }),
    [],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
