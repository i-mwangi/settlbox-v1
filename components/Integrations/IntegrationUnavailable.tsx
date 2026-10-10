import Link from "next/link";

export function IntegrationUnavailable({ title, description }: { title: string; description: string }) {
  return <section className="w-full space-y-5 p-6 text-text-primary"><h1 className="text-2xl font-semibold">{title}</h1><article className="space-y-4 rounded-xl border border-primary-divider p-6" style={{ backgroundImage: "url(/card/background.svg)", backgroundPosition: "right", backgroundRepeat: "no-repeat", backgroundSize: "25%" }}><span className="rounded-full bg-app-background px-3 py-1 text-sm">Not connected</span><p>{description}</p><p>This service is unavailable for this workspace. No account, investment, or transaction has been created.</p><div className="flex flex-wrap gap-4"><Link href="/treasury" className="text-primary-blue">Open company treasury</Link><Link href="/payment-link" className="text-primary-blue">Receive USDC</Link></div></article></section>;
}
