"use client";

import { useEffect, useMemo, useState } from "react";
import { WzrdLanding } from "@/components/wzrd-landing";
import { WzrdDashboard } from "@/components/wzrd-dashboard";
import { Toaster, toast } from "sonner";

// WHY: This page orchestrates the landing → dashboard flow for server-side wallet demos.
// It manages session state (localStorage), correlationIds, and provides instant visual
// feedback via toasts. The two-stage UX (landing/dashboard) mimics production apps while
// keeping the "no verification" demo experience.

type FetchResult = { status: number; data: unknown; correlationId: string; elapsedMs?: number } | null;

const STORAGE_KEY = "wzrd-wallet-session";

type WalletSession = {
  email: string;
  address: string;
};

export default function BackendDemoPage() {
  const backend = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_BACKEND_URL || "";
    return raw.replace(/\/+$/, "");
  }, []);

  const [health, setHealth] = useState<number | null>(null);
  const [session, setSession] = useState<WalletSession | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [results, setResults] = useState<Array<{ op: string; result: FetchResult }>>([]);

  // WHY: Persist session across page refreshes so users don't lose their demo wallet.
  // This simulates "logged in" state without requiring real auth infrastructure.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as WalletSession;
        setSession(parsed);
      } catch (e) {
        console.error("Failed to parse stored session", e);
      }
    }
  }, []);

  // Check health on mount
  useEffect(() => {
    const checkHealth = async () => {
      if (!backend) return;
      try {
        const res = await fetch(`${backend}/health`, {
          headers: { "X-Correlation-Id": `health-${Date.now()}` },
        });
        setHealth(res.status);
      } catch (err) {
        console.error("Health check failed:", err);
        setHealth(500);
      }
    };
    checkHealth();
  }, [backend]);

  // WHY: Centralized API call wrapper that injects correlationIds for traceability.
  // Every request gets a unique ID we can track across frontend logs, backend logs,
  // and provider responses. Results are stored for the UI + surfaced via toasts.
  // Elapsed time tracking helps identify slow requests and backend performance issues.
  const call = async (op: string, path: string, init?: RequestInit): Promise<FetchResult> => {
    const correlationId = `web-${Date.now()}`;
    const startTime = Date.now();
    try {
      const res = await fetch(`${backend}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          "X-Correlation-Id": correlationId,
          ...(init?.headers || {}),
        },
      });
      const elapsedMs = Date.now() - startTime;
      const data = await res.json().catch(() => ({}));
      const payload = { status: res.status, data, correlationId, elapsedMs };
      setResults((prev) => [{ op, result: payload }, ...prev].slice(0, 20));

      // Show toast
      if (res.status >= 200 && res.status < 300) {
        toast.success(`${op} completed successfully`);
      } else {
        toast.error(`${op} failed: ${res.status}`);
      }

      return payload;
    } catch (err) {
      console.error(`${op} error:`, err);
      toast.error(`${op} failed: Network error`);
      return null;
    }
  };

  const handleCreateWallet = async (email: string) => {
    setIsCreating(true);
    try {
      const result = await call("createWallet", "/api/wallets", {
        method: "POST",
        body: JSON.stringify({ identifierType: "email", identifier: email }),
      });

      const addr = (result?.data as any)?.address as string | undefined;
      if (addr && result?.status && result.status < 300) {
        const newSession = { email, address: addr };
        setSession(newSession);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    setResults([]);
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Logged out successfully");
  };

  // Show landing page if no session
  if (!session) {
    return (
      <>
        <Toaster position="top-right" />
        <WzrdLanding
          onCreateWallet={handleCreateWallet}
          isCreating={isCreating}
          healthStatus={health}
        />
      </>
    );
  }

  // Show dashboard if session exists
  return (
    <>
      <Toaster position="top-right" />
      <WzrdDashboard
        email={session.email}
        address={session.address}
        onLogout={handleLogout}
        backend={backend}
        onApiCall={call}
        results={results}
      />
    </>
  );
}
