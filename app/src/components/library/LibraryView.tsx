"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SearchFilterBar } from "@/components/library/SearchFilterBar";
import { LibraryGrid } from "@/components/library/LibraryGrid";
import { useStats } from "@/hooks/useAccounts";
import { formatNumber } from "@/lib/format";
import type { ItemFilters } from "@/hooks/useItems";

export function LibraryView({ account }: { account: string }) {
  const [filters, setFilters] = useState<ItemFilters>({ sort: "date" });
  const { data: stats } = useStats(account);
  const total = stats?.counts.total ?? 0;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 p-6">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold">
            Biblioteca · <span className="text-primary">@{account}</span>
          </h1>
          <p className="text-xs text-muted-foreground">{formatNumber(total)} itens na base</p>
        </div>
      </header>

      <SearchFilterBar value={filters} onChange={setFilters} />
      <LibraryGrid account={account} filters={filters} />
    </main>
  );
}
