import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
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

  const {
    data: user,
    isFetching,
    isLoading: isQueryLoading,
    error,
  } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token,
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  });

  // isLoading: true whenever token exists but user hasn't resolved yet (prevents premature redirects)
  const isLoading = !!token && (isFetching || isQueryLoading || (!user && !error));

  useEffect(() => {
    if (error && token) {
      logout();
    }
  }, [error]);

  const login = (newToken: string) => {
    setToken(newToken);
    setTokenState(newToken);
    // Enabled query will auto-fetch when token state changes
  };

  const logout = () => {
    setToken(null);
    setTokenState(null);
    setLocation("/");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <Spinner className="w-10 h-10" />
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
