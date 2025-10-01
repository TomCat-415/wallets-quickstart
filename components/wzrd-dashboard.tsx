"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Footer } from "./footer";

// WHY: Dashboard separates "wallet info" from "API testing tools" for clarity.
// Layout: wallet details card → 3-column action grid → scrollable request log.
// This structure teaches the mental model: one wallet, many possible operations.

type FetchResult = { status: number; data: unknown; correlationId: string; elapsedMs?: number } | null;

type WzrdDashboardProps = {
  email: string;
  address: string;
  onLogout: () => void;
  backend: string;
  onApiCall: (op: string, path: string, init?: RequestInit) => Promise<FetchResult>;
  results: Array<{ op: string; result: FetchResult }>;
};

export function WzrdDashboard({
  email,
  address,
  onLogout,
  backend,
  onApiCall,
  results,
}: WzrdDashboardProps) {
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("0.001");
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedCorrelationId, setCopiedCorrelationId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // WHY: Fetch balance on mount to display prominently in Balance Card.
  // Production apps show balance immediately, not hidden behind a button.
  useEffect(() => {
    fetchBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBalance = async () => {
    setBalanceLoading(true);
    try {
      const result = await onApiCall("getBalance", `/api/wallets/${address}/balance`);
      if (result?.data && typeof result.data === 'object') {
        const balanceData = result.data as any;
        // Extract SOL balance from response
        const solBalance = balanceData.balance || balanceData.lamports || "0";
        setBalance(solBalance);
      }
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  };

  const handleCopyCorrelationId = async (correlationId: string) => {
    try {
      await navigator.clipboard.writeText(correlationId);
      setCopiedCorrelationId(correlationId);
      setTimeout(() => setCopiedCorrelationId(null), 2000);
    } catch (err) {
      console.error("Failed to copy correlationId:", err);
    }
  };

  // WHY: Status code coloring teaches HTTP semantics visually.
  // 2xx = success (green), 4xx = client error (yellow), 5xx = server error (red)
  const getStatusChipClasses = (status: number) => {
    if (status >= 200 && status < 300) {
      return "bg-green-50 text-green-700 border border-green-200";
    } else if (status >= 400 && status < 500) {
      return "bg-yellow-50 text-yellow-700 border border-yellow-200";
    } else {
      return "bg-red-50 text-red-700 border border-red-200";
    }
  };

  // WHY: cURL commands let users reproduce API calls in terminal for learning/debugging.
  // This bridges UI interactions to raw HTTP requests—crucial for backend understanding.
  const buildCurl = (method: string, path: string, body?: object) => {
    const url = `${backend}${path}`;
    let curl = `curl -X ${method} "${url}" \\\n  -H "Content-Type: application/json" \\\n  -H "X-Correlation-Id: web-${Date.now()}"`;
    if (body) {
      curl += ` \\\n  -d '${JSON.stringify(body)}'`;
    }
    return curl;
  };

  const copyCurl = async (curl: string) => {
    try {
      await navigator.clipboard.writeText(curl);
      const preview = curl.split('\n')[0]; // First line of curl command
      toast.success("cURL command copied!", {
        description: preview + "...",
      });
    } catch (err) {
      console.error("Failed to copy cURL:", err);
      toast.error("Failed to copy cURL command");
    }
  };

  const getWallet = async () => {
    setLoadingAction("getWallet");
    try {
      await onApiCall("getWallet", `/api/wallets/${address}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const getBalance = async () => {
    setLoadingAction("getBalance");
    try {
      await onApiCall("getBalance", `/api/wallets/${address}/balance`);
    } finally {
      setLoadingAction(null);
    }
  };

  const getActivity = async () => {
    setLoadingAction("getActivity");
    try {
      await onApiCall("getActivity", `/api/wallets/${address}/activity`);
    } finally {
      setLoadingAction(null);
    }
  };

  const sendTx = async () => {
    if (!transferTo) return;
    setLoadingAction("sendTx");
    try {
      await onApiCall("createTransaction", `/api/wallets/${address}/transactions`, {
        method: "POST",
        body: JSON.stringify({
          to: transferTo,
          amount: transferAmount,
          asset: "native",
          memo: "WZRD demo transfer",
        }),
      });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-purple-950">
      <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:pt-8">
        {/* Header */}
        <div className="flex flex-col mb-6 max-sm:items-center">
          <h1 className="text-3xl font-bold mb-2 text-white">WZRD Wallets Demo</h1>
          <p className="text-cyan-400 text-sm">Server-side wallet management with Crossmint</p>
        </div>

        {/* Main Dashboard Container */}
        <div className="flex flex-col gap-4 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-cyan-500/20 shadow-xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Your Wallet</h2>
            <button
              onClick={onLogout}
              className="px-4 py-2 text-sm font-medium text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/10 transition-colors"
            >
              Log out
            </button>
          </div>

          {/* Main Grid - Balance, Transfer, Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SOL Balance Card */}
            <div className="bg-slate-800/80 backdrop-blur rounded-2xl border border-purple-500/30 shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Image
                  src="/solana-icon.svg"
                  alt="Solana"
                  width={24}
                  height={24}
                  className="text-purple-600"
                />
                <h3 className="text-lg font-semibold text-white">SOL Balance</h3>
              </div>

              {balanceLoading ? (
                <div className="text-4xl font-bold mb-4 text-cyan-400 animate-pulse">
                  Loading...
                </div>
              ) : (
                <div className="text-4xl font-bold mb-4 text-white">
                  {balance || "0.000"} <span className="text-cyan-400">SOL</span>
                </div>
              )}

              <button
                onClick={fetchBalance}
                disabled={balanceLoading}
                className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-3 text-sm font-medium hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all mb-3 shadow-lg shadow-cyan-500/20"
              >
                {balanceLoading ? "Refreshing..." : "Refresh Balance"}
              </button>

              <p className="text-xs text-slate-400 text-center">
                Balance updates may take a few seconds after transfers
              </p>
            </div>

            {/* Transfer Funds */}
            <div className="bg-slate-800/80 backdrop-blur rounded-2xl border border-cyan-500/30 shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-2 text-white">Transfer funds</h3>
              <p className="text-sm text-slate-400 mb-4">Send funds to another wallet</p>

              {/* Big Amount Display */}
              <div className="flex items-center gap-2 mb-4">
                <Image
                  src="/solana-icon.svg"
                  alt="SOL"
                  width={32}
                  height={32}
                />
                <input
                  type="text"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="text-4xl font-bold w-full outline-none bg-transparent text-white"
                  placeholder="0.000"
                />
                <span className="text-2xl font-semibold text-cyan-400">SOL</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1 block">Transfer to</label>
                  <input
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="Enter wallet address"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={sendTx}
                    disabled={!transferTo || loadingAction === "sendTx"}
                    className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-3 py-2 text-sm font-medium hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/20"
                  >
                    {loadingAction === "sendTx" ? "Sending..." : "Transfer"}
                  </button>
                  <button
                    onClick={() =>
                      copyCurl(
                        buildCurl("POST", `/api/wallets/${address}/transactions`, {
                          to: transferTo || "<recipient-address>",
                          amount: transferAmount,
                          asset: "native",
                          memo: "WZRD demo transfer",
                        })
                      )
                    }
                    className="px-3 py-2 rounded-lg border border-slate-600 text-xs text-cyan-400 hover:bg-slate-700 transition-colors"
                    title="Copy cURL command (Dev)"
                  >
                    &lt;/&gt;
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-slate-800/80 backdrop-blur rounded-2xl border border-cyan-500/30 shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-white">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">Total Requests</span>
                  <span className="text-sm font-medium text-cyan-400">{results.length}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-slate-300">Backend URL</span>
                  <span className="text-xs font-mono text-slate-400 break-all">
                    {backend || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Wallet Details */}
          <div className="bg-slate-800/80 backdrop-blur rounded-2xl border border-purple-500/30 shadow-lg p-6 mt-4">
            <h3 className="text-lg font-semibold mb-4 text-white">Wallet Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1 block">Email</label>
                <div className="text-sm font-mono text-white bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-600">
                  {email}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1 block">Chain</label>
                <div className="text-sm font-mono text-white bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-600">
                  Solana Devnet
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1 block">Wallet Address</label>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-mono text-white bg-slate-900/50 rounded-lg px-3 py-2 flex-1 truncate border border-slate-600">
                    {address}
                  </div>
                  <button
                    onClick={handleCopyAddress}
                    className="p-2 rounded-lg border border-slate-600 text-cyan-400 hover:bg-slate-700 transition-colors"
                    title="Copy wallet address"
                  >
                    {copiedAddress ? (
                      <Image src="/circle-check-big.svg" alt="Copied" width={16} height={16} />
                    ) : (
                      <Image src="/copy.svg" alt="Copy" width={16} height={16} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* API Request Log */}
          <div className="bg-slate-800/80 backdrop-blur rounded-2xl border border-cyan-500/30 shadow-lg p-6 mt-4">
            <h3 className="text-lg font-semibold mb-3 text-white">API Request Log</h3>
            <div className="text-xs text-slate-400 mb-3">Most recent first</div>
            <div className="space-y-3 max-h-[400px] overflow-auto">
              {results.length === 0 ? (
                <div className="text-sm text-slate-400 text-center py-8">
                  No requests yet. Try fetching your balance or sending a transfer!
                </div>
              ) : (
                results.map((item, idx) => (
                  <div key={idx} className="border border-slate-600 rounded-lg p-3 bg-slate-900/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-white">{item.op}</div>
                      <div
                        className={`text-xs px-2 py-0.5 rounded ${
                          item.result?.status ? getStatusChipClasses(item.result.status) : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {item.result?.status}
                        {item.result?.elapsedMs && ` • ${item.result.elapsedMs}ms`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-400">
                        CorrelationId: {item.result?.correlationId || "(generated)"}
                      </span>
                      {item.result?.correlationId && (
                        <button
                          onClick={() => handleCopyCorrelationId(item.result!.correlationId)}
                          className="text-slate-400 hover:text-cyan-400 transition-colors"
                          title="Copy correlation ID"
                        >
                          {copiedCorrelationId === item.result.correlationId ? (
                            <Image src="/circle-check-big.svg" alt="Copied" width={12} height={12} />
                          ) : (
                            <Image src="/copy.svg" alt="Copy" width={12} height={12} />
                          )}
                        </button>
                      )}
                    </div>
                    <pre className="text-xs whitespace-pre-wrap break-words text-cyan-400">
                      {JSON.stringify(item.result?.data, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
