import { PostHogEvent, PostHogEventProperties } from "@/presentation/types/posthog";
export function trackEvent<E extends PostHogEvent>(_event: E, _properties?: PostHogEventProperties[E]): void {
}
export function identifyUser(_userId: string, _traits?: {
    email?: string;
    companyId?: number;
    companyName?: string;
    role?: string;
    walletAddress?: string;
}): void {
}
export function setUserProperty(_key: string, _value: string | number | boolean): void {
}
export function resetAnalytics(): void {
}
export function setSuperProperty(_key: string, _value: string | number | boolean): void {
}
