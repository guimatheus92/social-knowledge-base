"use client";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { Aperture, ChevronLeft, Images, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandRule } from "@/components/BrandRule";
import { useAccounts } from "@/hooks/useAccounts";
import { api } from "@/lib/api";
import { ConnectedAccountCard } from "@/components/account/ConnectedAccountCard";
import { NetworkCard } from "@/components/account/NetworkCard";
import { NetworkBulkBar } from "@/components/account/NetworkBulkBar";
import { LoginAccountPanel } from "@/components/LoginAccountPanel";
import { AddAccountDialog } from "@/components/AddAccountDialog";
import { DownloadByLinkDialog } from "@/components/DownloadByLinkDialog";
import { AnalysisSettingsPanel } from "@/components/AnalysisSettingsPanel";
import { DiskUsagePanel } from "@/components/DiskUsagePanel";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Hero } from "@/components/Hero";
import { NETWORKS, networkMeta } from "@/lib/networks";
import { useT } from "@/i18n/I18nProvider";
import type { AccountSummary, MediaType, Tab } from "@/lib/types";

const COOKIES_KEY = "igkb.cookiesPath";

export default function DashboardPage() {
  const { data: accounts, isLoading } = useAccounts();
  const qc = useQueryClient();
  const t = useT();
  const [cookiesPath, setCookiesPath] = useState("");
  const [cookieStatus, setCookieStatus] = useState<"valid" | "expired" | "unknown">("unknown");
  // Drill-in: null = network overview; otherwise show that network's accounts.
  const [activeNetwork, setActiveNetwork] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(COOKIES_KEY);
    if (saved) {
      setCookiesPath(saved);
      return;
    }
    // No saved path: try to detect an already-exported cookies.txt (Downloads).
    api
      .cookiesDefault()
      .then((d) => {
        if (d.path) {
          setCookiesPath(d.path);
          localStorage.setItem(COOKIES_KEY, d.path);
        }
      })
      .catch(() => {});
  }, []);

  const updateCookies = (p: string) => {
    setCookiesPath(p);
    localStorage.setItem(COOKIES_KEY, p);
  };

  // Real cookie health: check the sessionid's own expiry (no network call).
  useEffect(() => {
    if (!cookiesPath) {
      setCookieStatus("unknown");
      return;
    }
    let cancelled = false;
    api
      .cookiesStatus(cookiesPath)
      .then((r) => !cancelled && setCookieStatus(r.status))
      .catch(() => !cancelled && setCookieStatus("unknown"));
    return () => {
      cancelled = true;
    };
  }, [cookiesPath]);

  const onAdd = async (data: {
    account: string;
    savePath: string;
    media: MediaType[];
    tabs: Tab[];
    network: string;
  }) => {
    try {
      await api.addAccount({
        account: data.account,
        savePath: data.savePath,
        media: data.media,
        tabs: data.tabs,
        network: data.network,
        cookiesPath: cookiesPath || undefined,
      });
      toast.success(t("toast.accountAdded", { account: data.account }));
      qc.invalidateQueries({ queryKey: ["accounts"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onDownloadLink = async (data: { url: string; media: MediaType[] }) => {
    if (!cookiesPath) {
      toast.error(t("toast.needCookies"));
      return;
    }
    const toastId = toast.loading(t("toast.identifying"));
    try {
      const snap = await api.startSingle({ url: data.url, cookiesPath, media: data.media });
      toast.success(t("toast.downloadingOne", { account: snap.account }), { id: toastId });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    } catch (e) {
      toast.error((e as Error).message, { id: toastId });
    }
  };

  // Group accounts by network so each network is its own "folder".
  const byNetwork = useMemo(() => {
    const m = new Map<string, AccountSummary[]>();
    for (const a of accounts ?? []) {
      const arr = m.get(a.network) ?? [];
      arr.push(a);
      m.set(a.network, arr);
    }
    return m;
  }, [accounts]);

  const presentNetworks = NETWORKS.filter((n) => byNetwork.has(n.id));
  const activeAccounts = activeNetwork ? byNetwork.get(activeNetwork) ?? [] : [];

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-coral to-magenta text-white shadow-[0_10px_28px_-10px_var(--coral)]">
            <Aperture className="size-5" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("app.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("app.subtitle")}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageToggle />
          <Button variant="outline" nativeButton={false} render={<Link href="/gallery" />}>
            <Images />
            {t("gallery.trigger")}
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/search" />}>
            <Search />
            {t("search.trigger")}
          </Button>
          <AnalysisSettingsPanel />
          <DownloadByLinkDialog onDownload={onDownloadLink} disabled={!cookiesPath} />
          <AddAccountDialog onAdd={onAdd} />
        </div>
      </header>

      <Hero accounts={accounts} />

      {activeNetwork === null ? (
        <>
          {presentNetworks.length > 0 && <BrandRule />}
          <section className="space-y-4">
            {isLoading && (
              <p className="text-sm text-muted-foreground">{t("app.loadingAccounts")}</p>
            )}
            {accounts && accounts.length === 0 && (
              <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                {t("app.emptyState", { action: t("addAccount.trigger") })}
              </div>
            )}
            {presentNetworks.map((n) => (
              <NetworkCard
                key={n.id}
                network={n.id}
                accounts={byNetwork.get(n.id) ?? []}
                onEnter={() => setActiveNetwork(n.id)}
              />
            ))}
          </section>

          {accounts && accounts.length > 0 && (
            <>
              <BrandRule />
              <DiskUsagePanel accounts={accounts} />
            </>
          )}
        </>
      ) : (
        <>
          <BrandRule />
          <button
            type="button"
            onClick={() => setActiveNetwork(null)}
            className="inline-flex items-center gap-2.5 rounded-xl px-3 py-2 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
          >
            <ChevronLeft className="size-6" />
            <span
              className="grid size-9 place-items-center rounded-xl text-white"
              style={{ background: networkMeta(activeNetwork).gradient }}
            >
              {(() => {
                const Icon = networkMeta(activeNetwork).Icon;
                return <Icon className="size-5" />;
              })()}
            </span>
            <span className="font-heading text-xl font-semibold text-foreground">
              {networkMeta(activeNetwork).label}
            </span>
          </button>

          <LoginAccountPanel cookiesPath={cookiesPath} status={cookieStatus} onChange={updateCookies} />

          {activeAccounts.length >= 2 && (
            <NetworkBulkBar accounts={activeAccounts} cookiesPath={cookiesPath} />
          )}

          <section className="space-y-4">
            {activeAccounts.map((a) => (
              <ConnectedAccountCard key={a.account} summary={a} cookiesPath={cookiesPath} />
            ))}
          </section>

          {activeAccounts.length > 0 && (
            <>
              <BrandRule />
              <DiskUsagePanel accounts={activeAccounts} />
            </>
          )}
        </>
      )}
    </main>
  );
}
