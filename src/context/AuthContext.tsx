import React, { createContext, useContext, useEffect, useState } from 'react';

const API_BASE_URL = 'https://moodmentor-ai.onrender.com';
const TOKEN_KEY = 'mood-mentor-token';
const AUTH_KEY = 'mood-mentor-auth';

type AuthState = {
  isAuthenticated: boolean;
  authMode: 'demo' | 'user' | null;
  user: { name: string; email: string; createdAt?: string } | null;
};

interface AuthContextType extends AuthState {
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  demoLogin: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
  updateUser: (updates: Partial<{ name: string; email: string }>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    authMode: null,
    user: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch profile or token expired');
    }

    return await response.json();
  };

  const clearStorage = () => {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_KEY);
  };

  useEffect(() => {
    const restoreSession = async () => {
      const localToken = localStorage.getItem(TOKEN_KEY);
      const sessionToken = sessionStorage.getItem(TOKEN_KEY);
      const activeToken = localToken || sessionToken;

      const localAuth = localStorage.getItem(AUTH_KEY);
      const sessionAuth = sessionStorage.getItem(AUTH_KEY);
      const cachedAuth = localAuth ? JSON.parse(localAuth) : sessionAuth ? JSON.parse(sessionAuth) : null;

      // Restore demo session directly
      if (cachedAuth && cachedAuth.authMode === 'demo') {
        setAuthState(cachedAuth);
        setIsLoading(false);
        return;
      }

      // Restore user session via token
      if (activeToken) {
        try {
          const profile = await fetchUserProfile(activeToken);
          setAuthState({
            isAuthenticated: true,
            authMode: 'user',
            user: {
              name: profile.name || profile.username || profile.email?.split('@')[0] || 'User',
              email: profile.email,
              createdAt: profile.createdAt || profile.created_at,
            },
          });
        } catch {
          clearStorage();
          setAuthState({
            isAuthenticated: false,
            authMode: null,
            user: null,
          });
        }
      } else {
        clearStorage();
        setAuthState({
          isAuthenticated: false,
          authMode: null,
          user: null,
        });
      }

      setIsLoading(false);
    };

    restoreSession();
  }, []);

  const login = async (
    email: string,
    password: string,
    remember: boolean
  ) => {
    if (!email || !password) {
      throw new Error('Missing fields');
    }

    const normalizedEmail = email.trim().toLowerCase();

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: normalizedEmail,
        password,
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Login failed';

      try {
        const errorData = await response.json();

        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail
            .map((item: any) => item.msg || 'Invalid input')
            .join(', ');
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Keep default error message
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    const token = data.access_token;

    if (!token) {
      throw new Error('No access token returned from server');
    }

    // Save JWT token
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(TOKEN_KEY);
    }

    // Get logged-in user's profile
    const profile = await fetchUserProfile(token);

    const userState: AuthState = {
      isAuthenticated: true,
      authMode: 'user',
      user: {
        name:
          profile.name ||
          profile.username ||
          normalizedEmail.split('@')[0],
        email:
          profile.email ||
          profile.logged_in_user ||
          normalizedEmail,
        createdAt: profile.createdAt || profile.created_at,
      },
    };

    setAuthState(userState);

    if (remember) {
      localStorage.setItem(
        AUTH_KEY,
        JSON.stringify(userState)
      );
      sessionStorage.removeItem(AUTH_KEY);
    } else {
      sessionStorage.setItem(
        AUTH_KEY,
        JSON.stringify(userState)
      );
      localStorage.removeItem(AUTH_KEY);
    }
  };

  const demoLogin = () => {
    const newState: AuthState = {
      isAuthenticated: true,
      authMode: 'demo',
      user: { name: 'Demo User', email: 'demo@moodmentor.ai', createdAt: new Date().toISOString() },
    };
    clearStorage();
    setAuthState(newState);
    localStorage.setItem(AUTH_KEY, JSON.stringify(newState));
  };

  const register = async (name: string, email: string, password: string) => {
    if (!name || !email || !password) {
      throw new Error('Missing fields');
    }

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Registration failed';
      try {
        const errorData = await response.json();
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail
            .map((item: any) => item.msg || 'Invalid input')
            .join(', ');
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Fallback to generic message
      }
      throw new Error(errorMessage);
    }

    // Automatically log the user in following successful registration
    await login(email, password, true);
  };

  const updateUser = (updates: Partial<{ name: string; email: string }>) => {
    setAuthState(prev => {
      if (!prev.user) return prev;
      const updatedUser = { ...prev.user, ...updates };
      const newState: AuthState = { ...prev, user: updatedUser };

      if (localStorage.getItem(AUTH_KEY)) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(newState));
      } else if (sessionStorage.getItem(AUTH_KEY)) {
        sessionStorage.setItem(AUTH_KEY, JSON.stringify(newState));
      }

      return newState;
    });
  };

  const logout = () => {
    setAuthState({ isAuthenticated: false, authMode: null, user: null });
    clearStorage();
  };

  if (isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ ...authState, login, demoLogin, register, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};