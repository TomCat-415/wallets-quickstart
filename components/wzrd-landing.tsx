"use client";

import { useState } from "react";
import Image from "next/image";

// WHY: Landing page establishes demo context before wallet creation.
// UX pattern: marketing content (left) + simple form (right) reduces friction.
// Pre-filled email shows users they can use any string—no verification needed.

const features = [
  {
    title: "Try it Risk-Free",
    description:
      "Use any email address (real or fake) to create a demo wallet. No verification needed — perfect for testing and exploration.",
    iconPath: "/rocket.svg",
  },
  {
    title: "Full API Visibility",
    description:
      "See exactly what's happening behind the scenes: correlation IDs, response times, and complete request/response logs.",
    iconPath: "/trending-up.svg",
  },
  {
    title: "Production Patterns",
    description:
      "Built on Crossmint's server adapter pattern for vendor independence. Observability, idempotency, and audit trails included.",
    iconPath: "/shield-check.svg",
  },
];

type WzrdLandingProps = {
  onCreateWallet: (email: string) => Promise<void>;
  isCreating: boolean;
  healthStatus: number | null;
};

export function WzrdLanding({ onCreateWallet, isCreating, healthStatus }: WzrdLandingProps) {
  const [email, setEmail] = useState(`demo-${Date.now()}@wzrd.demo`);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await onCreateWallet(email.trim());
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-5">
      {/* Left side - Dark panel with features */}
      <div
        className="relative hidden lg:flex flex-col rounded-[20px] justify-center px-18 py-8 m-3 col-span-2 bg-gradient-to-br from-gray-900 to-gray-800"
      >
        {/* Content */}
        <div className="relative z-10 flex flex-col gap-12 text-white px-8">
          <div className="flex flex-col gap-4">
            <h1 className="text-6xl font-bold">WZRD Wallets Demo</h1>
            <p className="text-white/60 text-lg">
              Experience server-side wallet management with Crossmint's API. No setup required — just enter any email and start exploring!
            </p>
          </div>

          {/* Features list */}
          <div className="flex flex-col gap-4">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="flex items-start gap-5 p-4 backdrop-blur-sm rounded-2xl bg-blue-300/3 border border-white/10"
              >
                <div className="w-10 h-10 border-white/20 border-2 rounded-full flex items-center justify-center self-center flex-shrink-0">
                  <Image
                    className="filter-green w-6"
                    src={feature.iconPath}
                    alt={feature.title}
                    width={20}
                    height={20}
                  />
                </div>
                <div>
                  <h3 className="font-medium text-white">{feature.title}</h3>
                  <p className="text-sm text-white/60">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Email form */}
      <div className="flex items-center justify-center bg-gray-50 px-6 py-12 col-span-1 lg:col-span-3">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl border shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-2">Welcome to WZRD Wallets</h2>
            <p className="text-gray-600 text-sm mb-6">
              Enter any email to create your demo wallet
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isCreating}
                  className="w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="your@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={isCreating || !email.trim()}
                className="w-full rounded-lg bg-black text-white px-4 py-3 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {isCreating ? "Creating wallet..." : "Create Wallet"}
              </button>
            </form>

            <p className="text-xs text-gray-500 mt-4 text-center">
              No verification required. This is a demo environment.
            </p>

            {/* Health status indicator */}
            {healthStatus !== null && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    healthStatus === 200 ? "bg-green-500" : "bg-yellow-500"
                  }`}
                />
                <span className="text-xs text-gray-500">
                  Backend: {healthStatus === 200 ? "Ready" : "Checking..."}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
