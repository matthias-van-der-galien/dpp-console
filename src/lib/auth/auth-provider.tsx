"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apiFetch, type JsonRecord } from "@/lib/api/client";
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from "@/lib/auth/token-store";

export type AuthMe = JsonRecord & {
  workspace?: JsonRecord;
  user?: JsonRecord;
  role?: string;
  scopes?: string[];
  apiKeyKind?: string;
  authMethod?: string;
};

type AuthContextValue = {
  token: string | null;
  me: AuthMe | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [hasLoadedStoredToken, setHasLoadedStoredToken] = useState(false);

  useEffect(() => {
    setToken(getStoredToken());
    setHasLoadedStoredToken(true);
  }, []);

  const meQuery = useQuery({
    queryKey: ["me", token],
    queryFn: () => apiFetch<AuthMe>("/me"),
    enabled: Boolean(token),
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (nextToken: string) => {
      setStoredToken(nextToken);
      setToken(nextToken);
      await queryClient.fetchQuery({
        queryKey: ["me", nextToken],
        queryFn: () => apiFetch<AuthMe>("/me"),
      });
    },
    onError: () => {
      clearStoredToken();
      setToken(null);
    },
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      me: (meQuery.data as AuthMe | undefined) ?? null,
      isAuthenticated: Boolean(token && meQuery.data),
      isLoading: !hasLoadedStoredToken || Boolean(token && meQuery.isLoading),
      login: loginMutation.mutateAsync,
      logout: () => {
        clearStoredToken();
        setToken(null);
        queryClient.clear();
      },
    }),
    [
      hasLoadedStoredToken,
      loginMutation.mutateAsync,
      meQuery.data,
      meQuery.isLoading,
      queryClient,
      token,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
