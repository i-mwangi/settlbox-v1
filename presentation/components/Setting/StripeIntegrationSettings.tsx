"use client";
import ProviderIntegrationSettings from "./ProviderIntegrationSettings";
function StripeIcon({ size = 32 }: {
    size?: number;
}) {
    return (<svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="6" fill="#635BFF"/>
      <path d="M15.2 12.6c0-0.9 0.7-1.3 1.9-1.3 1.7 0 3.8 0.5 5.5 1.4V8.4c-1.8-0.7-3.7-1-5.5-1-4.5 0-7.5 2.3-7.5 6.2 0 6.1 8.4 5.1 8.4 7.7 0 1.1-0.9 1.4-2.2 1.4-1.9 0-4.3-0.8-6.2-1.8v4.4c2.1 0.9 4.2 1.3 6.2 1.3 4.6 0 7.7-2.3 7.7-6.2 0-6.6-8.3-5.4-8.3-7.8z" fill="white"/>
    </svg>);
}

export default function StripeIntegrationSettings(){return <ProviderIntegrationSettings provider="stripe" icon={<StripeIcon/>}/>;}
