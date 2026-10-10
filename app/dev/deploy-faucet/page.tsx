import Link from "next/link";

export default function TestnetTokenPage() {
  return <section className="space-y-4 p-6 text-text-primary"><h1 className="text-2xl font-semibold">Arc Testnet USDC</h1><p>Settlbox settles payments in USDC on Arc Testnet.</p><dl className="space-y-2"><div><dt>Network ID</dt><dd>5042002</dd></div><div><dt>Native USDC precision</dt><dd>18 decimals</dd></div><div><dt>USDC token contract</dt><dd className="break-all">0x3600000000000000000000000000000000000000</dd></div><div><dt>USDC token precision</dt><dd>6 decimals</dd></div></dl><Link href="/testnet-treasury">Open company treasury</Link></section>;
}
