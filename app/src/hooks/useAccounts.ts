"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: api.accounts,
    refetchInterval: 5000,
    select: (d) => d.accounts,
  });
}

export function useStats(account: string | null) {
  return useQuery({
    queryKey: ["stats", account],
    queryFn: () => api.stats(account as string),
    enabled: !!account,
    refetchInterval: 5000,
  });
}
