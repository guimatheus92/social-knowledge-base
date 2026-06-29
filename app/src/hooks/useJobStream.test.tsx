// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/i18n/I18nProvider";
import { useJobStream } from "@/hooks/useJobStream";

// jsdom has no EventSource — capture every instance to assert how many open.
const opened: { url: string }[] = [];
beforeEach(() => {
  opened.length = 0;
  vi.stubGlobal(
    "EventSource",
    class {
      url: string;
      onmessage: ((ev: MessageEvent) => void) | null = null;
      constructor(url: string) {
        this.url = url;
        opened.push({ url });
      }
      close() {}
    },
  );
});

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <I18nProvider>{children}</I18nProvider>
    </QueryClientProvider>
  );
}

describe("useJobStream", () => {
  it("opens NO connection for an idle (disabled) account — keeps the pool free", () => {
    renderHook(() => useJobStream("acc", false), { wrapper });
    expect(opened).toHaveLength(0);
  });

  it("opens exactly one connection when enabled", () => {
    renderHook(() => useJobStream("acc", true), { wrapper });
    expect(opened).toHaveLength(1);
    expect(opened[0].url).toContain("/api/jobs/acc/stream");
  });

  it("opens nothing without an account", () => {
    renderHook(() => useJobStream(null, true), { wrapper });
    expect(opened).toHaveLength(0);
  });
});
