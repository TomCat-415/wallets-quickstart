"use client";

import { useEffect, useMemo, useState } from "react";

type FetchResult = { status: number; data: unknown; correlationId: string } | null;

export default function BackendDemoPage() {
  const backend = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_BACKEND_URL || "";
    // Normalize: remove trailing slashes to avoid //path 404s
    return raw.replace(/\/+$/, "");
  }, []);
  const [health, setHealth] = useState<FetchResult>(null);
  const [email, setEmail] = useState<string>(`thomasharuo415+demo${Date.now()}@gmail.com`);
  const [address, setAddress] = useState<string>("");
  const [last, setLast] = useState<Array<{ op: string; result: FetchResult }>>([]);

  const call = async (op: string, path: string, init?: RequestInit): Promise<FetchResult> => {
    const correlationId = `web-${Date.now()}`;
    const res = await fetch(`${backend}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-Correlation-Id": correlationId,
        ...(init?.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    const payload = { status: res.status, data, correlationId } as const;
    setLast((prev) => [{ op, result: payload }, ...prev].slice(0, 10));
    return payload;
  };

  const checkHealth = async () => {
    if (!backend) return;
    const r = await call("health", "/health");
    setHealth(r);
  };

  useEffect(() => {
    checkHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend]);

  const createWallet = async () => {
    const r = await call("createWallet", "/api/wallets", {
      method: "POST",
      body: JSON.stringify({ identifierType: "email", identifier: email }),
    });
    const addr = (r?.data as any)?.address as string | undefined;
    if (addr) setAddress(addr);
  };

  const getWallet = async () => address && call("getWallet", `/api/wallets/${address}`);
  const getBalance = async () => address && call("getBalance", `/api/wallets/${address}/balance`);
  const getActivity = async () => address && call("getActivity", `/api/wallets/${address}/activity`);
  const sendTx = async () =>
    address &&
    call("createTransaction", `/api/wallets/${address}/transactions`, {
      method: "POST",
      body: JSON.stringify({ to: address, amount: "0.001", asset: "native", memo: "WZRD demo transfer 1" }),
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 bg-white rounded-2xl border shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Backend Demo (Server API)</h1>
            <a className="text-sm text-gray-600 hover:underline" href="/">Back to Home</a>
          </div>
          <div className="text-sm text-gray-600">Backend URL: <span className="font-mono">{backend || "(not set)"}</span></div>
          <div className="flex items-center gap-3">
            <span className={`text-sm px-2 py-1 rounded ${health?.status === 200 ? "bg-green-50 text-green-700 border border-green-200" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>
              Health: {health?.status || "checking..."}
            </span>
            <button onClick={checkHealth} className="px-3 py-1.5 rounded-lg border text-sm text-gray-700 hover:bg-gray-50">Recheck</button>
          </div>
        </div>

        {/* Create Wallet */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-3">Create server wallet</h2>
            <label className="text-sm text-gray-600">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="email@example.com" />
            <button onClick={createWallet} className="mt-3 w-full rounded-lg bg-black text-white px-3 py-2 text-sm hover:opacity-90">Create wallet</button>
            {address && (
              <div className="mt-3 text-sm text-gray-700">
                Address: <span className="font-mono break-all">{address}</span>
              </div>
            )}
          </div>

          {/* Wallet Actions */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-3">Wallet actions</h2>
            <label className="text-sm text-gray-600">Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="Paste address" />
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={getWallet} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Get wallet</button>
              <button onClick={getBalance} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Get balance</button>
              <button onClick={getActivity} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Get activity</button>
              <button onClick={sendTx} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Send 0.001 SOL</button>
            </div>
          </div>

          {/* Results */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-3">Results</h2>
            <div className="text-xs text-gray-500 mb-2">Most recent first</div>
            <div className="space-y-3 max-h-[420px] overflow-auto">
              {last.map((item, idx) => (
                <div key={idx} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">{item.op}</div>
                    <div className={`text-xs px-2 py-0.5 rounded ${item.result?.status && item.result.status < 300 ? "bg-green-50 text-green-700 border border-green-200" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>
                      {item.result?.status}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">CorrelationId: {item.result?.correlationId || "(generated)"}</div>
                  <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(item.result?.data, null, 2)}</pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


