import { createContext, useContext, useState, useEffect } from "react";
import { auth, getToken, getUser, setToken, setUser, removeToken, removeUser } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(() => getUser());
  const [loading, setLoading] = useState(!!getToken() && !getUser());

  // On mount, if we have a token but no user in state, re-fetch from /me
  useEffect(() => {
    if (getToken() && !getUser()) {
      auth.me()
        .then((u) => { setUser(u); setUserState(u); })
        .catch(() => { removeToken(); removeUser(); })
        .finally(() => setLoading(false));
    }
  }, []);

  const login = async (username, password) => {
    const data = await auth.login(username, password);
    setToken(data.token);
    setUser(data.user);
    setUserState(data.user);
    return data;
  };

  const logout = () => {
    removeToken();
    removeUser();
    setUserState(null);
    window.location.href = "/";
  };

  const updateUser = (updated) => {
    setUser(updated);
    setUserState(updated);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);