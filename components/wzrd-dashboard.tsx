"use client";

import { useState } from "react";
import Image from "next/image";
import { Footer } from "./footer";

// WHY: Dashboard separates "wallet info" from "API testing tools" for clarity.
// Layout: wallet details card → 3-column action grid → scrollable request log.
// This structure teaches the mental model: one wallet, many possible operations.

type FetchResult = { status: number; data: unknown; correlationId: string } | null;

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

  const getWallet = async () => await onApiCall("getWallet", `/api/wallets/${address}`);
  const getBalance = async () => await onApiCall("getBalance", `/api/wallets/${address}/balance`);
  const getActivity = async () => await onApiCall("getActivity", `/api/wallets/${address}/activity`);
  const sendTx = async () => {
    if (!transferTo) return;
    await onApiCall("createTransaction", `/api/wallets/${address}/transactions`, {
      method: "POST",
      body: JSON.stringify({
        to: transferTo,
        amount: transferAmount,
        asset: "native",
        memo: "WZRD demo transfer",
      }),
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:pt-8">
        {/* Header */}
        <div className="flex flex-col mb-6 max-sm:items-center">
          <Image
            src="/crossmint.svg"
            alt="Crossmint logo"
            priority
            width={150}
            height={150}
            className="mb-4"
          />
          <h1 className="text-2xl font-semibold mb-2">WZRD Wallets Demo</h1>
          <p className="text-gray-600 text-sm">Server-side wallet management with Crossmint</p>
        </div>

        {/* Main Dashboard Container */}
        <div className="flex flex-col gap-4 bg-white rounded-2xl border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Wallet</h2>
            <button
              onClick={onLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              Log out
            </button>
          </div>

          {/* Wallet Details Card */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Wallet details</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 justify-between">
                <span className="text-sm font-medium text-gray-500">Email</span>
                <span className="text-sm text-gray-900">{email}</span>
              </div>
              <div className="flex items-center gap-2 justify-between">
                <span className="text-sm font-medium text-gray-500">Address</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-gray-900">
                    {address.slice(0, 6)}...{address.slice(-6)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 justify-between">
                <span className="text-sm font-medium text-gray-500">Chain</span>
                <span className="text-sm text-gray-900">Solana Devnet</span>
              </div>
            </div>
          </div>

          {/* Main Grid - Balance, Transfer, Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Balance & Actions */}
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Balance & Info</h3>
              <div className="space-y-2">
                <button
                  onClick={getWallet}
                  className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                >
                  Get wallet info
                </button>
                <button
                  onClick={getBalance}
                  className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                >
                  Get balance
                </button>
                <button
                  onClick={getActivity}
                  className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                >
                  Get activity
                </button>
              </div>
            </div>

            {/* Transfer Funds */}
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Transfer funds</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600">To address</label>
                  <input
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Paste recipient address"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Amount (SOL)</label>
                  <input
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="0.001"
                  />
                </div>
                <button
                  onClick={sendTx}
                  disabled={!transferTo}
                  className="w-full rounded-lg bg-black text-white px-3 py-2 text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  Send transfer
                </button>
              </div>
            </div>

            {/* Recent Activity Preview */}
            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Requests</span>
                  <span className="text-sm font-medium">{results.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Backend URL</span>
                  <span className="text-xs font-mono text-gray-500 truncate max-w-[150px]">
                    {backend ? new URL(backend).hostname : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* API Request Log */}
          <div className="bg-white rounded-2xl border shadow-sm p-6 mt-4">
            <h3 className="text-lg font-semibold mb-3">API Request Log</h3>
            <div className="text-xs text-gray-500 mb-3">Most recent first</div>
            <div className="space-y-3 max-h-[400px] overflow-auto">
              {results.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-8">
                  No requests yet. Try fetching your balance or sending a transfer!
                </div>
              ) : (
                results.map((item, idx) => (
                  <div key={idx} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">{item.op}</div>
                      <div
                        className={`text-xs px-2 py-0.5 rounded ${
                          item.result?.status && item.result.status < 300
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                        }`}
                      >
                        {item.result?.status}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mb-1">
                      CorrelationId: {item.result?.correlationId || "(generated)"}
                    </div>
                    <pre className="text-xs whitespace-pre-wrap break-words">
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
