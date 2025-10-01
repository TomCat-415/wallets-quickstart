import axios from "axios";

const DEVNET_RPC = "https://api.devnet.solana.com";

// WHY: For demo reliability we fall back to native SOL balance via RPC
// when the provider path is unavailable. Documented as a dev-only helper.

export async function getNativeSolBalance(address: string): Promise<{ asset: string; amount: string; decimals: number }> {
  const rpcBody = {
    jsonrpc: "2.0",
    id: 1,
    method: "getBalance",
    params: [address],
  };
  const { data } = await axios.post(DEVNET_RPC, rpcBody, { headers: { "Content-Type": "application/json" } });
  const lamports: number = data?.result?.value ?? 0;
  const amount = (lamports / 1_000_000_000).toFixed(9);
  return { asset: "SOL", amount, decimals: 9 };
}


