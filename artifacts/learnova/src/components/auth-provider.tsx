import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { setToken, getToken } from "@/lib/auth";
import { Spinner } from "./ui/spinner";
import type { MeResponse } from "@workspace/api-client-react";

interface AuthContextType {
  user: MeResponse | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [_, setLocation] = useLocation();
  const [token, setTokenState] = useState<string | null>(getToken());

  // Only run the query if we have a token
  const { data: user, isLoading: isQueryLoading, error, refetch } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    },
  });

  const isLoading = !!token && isQueryLoading;

  useEffect(() => {
    if (error && token) {
      logout();
    }
  }, [error, token]);

  const login = (newToken: string) => {
    setToken(newToken);
    setTokenState(newToken);
    refetch();
  };

  const logout = () => {
    setToken(null);
    setTokenState(null);
    setLocation("/");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
