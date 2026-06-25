"use client";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Aperture } from "lucide-react";
import { useAccounts } from "@/hooks/useAccounts";
import { api } from "@/lib/api";
import { ConnectedAccountCard } from "@/components/account/ConnectedAccountCard";
import { LoginAccountPanel } from "@/components/LoginAccountPanel";
import { AddAccountDialog } from "@/components/AddAccountDialog";
import { DownloadByLinkDialog } from "@/components/DownloadByLinkDialog";
import { AnalysisSettingsPanel } from "@/components/AnalysisSettingsPanel";
import { DiskUsagePanel } from "@/components/DiskUsagePanel";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Hero } from "@/components/Hero";
import { useT } from "@/i18n/I18nProvider";
import type { MediaType, Tab } from "@/lib/types";

const COOKIES_KEY = "igkb.cookiesPath";

export default function DashboardPage() {
  const { data: accounts, isLoading } = useAccounts();
  const qc = useQueryClient();
  const t = useT();
  const [cookiesPath, setCookiesPath] = useState("");

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

  const onAdd = async (data: {
    account: string;
    savePath: string;
    media: MediaType[];
    tabs: Tab[];
  }) => {
    try {
      await api.addAccount({
        account: data.account,
        savePath: data.savePath,
        media: data.media,
        tabs: data.tabs,
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

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-coral to-magenta text-white shadow-[0_10px_28px_-10px_var(--coral)]">
            <Aperture className="size-5" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("app.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("app.subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <AnalysisSettingsPanel />
          <DownloadByLinkDialog onDownload={onDownloadLink} disabled={!cookiesPath} />
          <AddAccountDialog onAdd={onAdd} />
        </div>
      </header>

      <Hero accounts={accounts} />

      <LoginAccountPanel cookiesPath={cookiesPath} status="unknown" onChange={updateCookies} />

      <section className="space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">{t("app.loadingAccounts")}</p>}
        {accounts && accounts.length === 0 && (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            {t("app.emptyState", { action: t("addAccount.trigger") })}
          </div>
        )}
        {accounts?.map((a) => (
          <ConnectedAccountCard key={a.account} summary={a} cookiesPath={cookiesPath} />
        ))}
      </section>

      {accounts && accounts.length > 0 && <DiskUsagePanel />}
    </main>
  );
}
