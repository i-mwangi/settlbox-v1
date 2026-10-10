import { PostHogEvent, PostHogEventProperties } from "@/types/posthog";

export function trackEvent<E extends PostHogEvent>(_event: E, _properties?: PostHogEventProperties[E]): void {
  // no-op
}

export function identifyUser(
  _userId: string,
  _traits?: {
    email?: string;
    companyId?: number;
    companyName?: string;
    role?: string;
    walletAddress?: string;
  },
): void {
  // no-op
}

export function setUserProperty(_key: string, _value: string | number | boolean): void {
  // no-op
}

export function resetAnalytics(): void {
  // no-op
}

export function setSuperProperty(_key: string, _value: string | number | boolean): void {
  // no-op
}
