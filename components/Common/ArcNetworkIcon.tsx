export function ArcNetworkIcon({ className = "h-5 w-5" }: { className?: string }) {
  return <span className="inline-flex shrink-0">
    <img src="/logo/arc-network-icon-light.svg" alt="Arc" className={`${className} dark:hidden`} />
    <img src="/logo/arc-network-icon-dark.svg" alt="Arc" className={`${className} hidden dark:block`} />
  </span>;
}
