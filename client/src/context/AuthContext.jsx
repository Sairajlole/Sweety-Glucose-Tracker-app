import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, TOKEN_KEY } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  // Avoid flashing the login screen before a stored session is verified.
  const [initialising, setInitialising] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  // Validate any stored token once on mount.
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setInitialising(false);
      return undefined;
    }

    let cancelled = false;
    authApi
      .me()
      .then((profile) => {
        if (!cancelled) setUser(profile);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setInitialising(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // The axios interceptor fires this when any request comes back 401.
  useEffect(() => {
    const onExpired = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('sweety:session-expired', onExpired);
    return () => window.removeEventListener('sweety:session-expired', onExpired);
  }, []);

  const persist = useCallback(({ user: profile, token: jwt }) => {
    localStorage.setItem(TOKEN_KEY, jwt);
    setToken(jwt);
    setUser(profile);
    return profile;
  }, []);

  const login = useCallback(
    async (credentials) => persist(await authApi.login(credentials)),
    [persist]
  );

  const register = useCallback(
    async (payload) => persist(await authApi.register(payload)),
    [persist]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      initialising,
      isAuthenticated: Boolean(user && token),
      login,
      register,
      logout,
    }),
    [user, token, initialising, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
