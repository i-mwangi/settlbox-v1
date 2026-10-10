"use client";

import Link from "next/link";
import { useState } from "react";
import type { OverlayProps } from "@/types/overlay";
import { useNotifications, useReadNotifications } from "@/services/api/notification";
import { PaymentLinkLoadError } from "@/components/PaymentLink/PaymentLinkLoadError";

export default function Notification({ isOpen, onClose, zIndex }: OverlayProps) {
  const notifications = useNotifications(isOpen);
  const read = useReadNotifications();
  const [unreadOnly, setUnreadOnly] = useState(true);
  if (!isOpen) return null;
  const items = notifications.data || [];
  const visible = unreadOnly ? items.filter(item => !item.readAt) : items;
  return <div className="fixed inset-0 flex justify-end bg-black/20" style={{ zIndex: zIndex || 950 }}><button aria-label="Close notifications" className="flex-1" onClick={onClose} /><aside className="flex h-full w-[min(440px,100vw)] flex-col gap-4 overflow-y-auto bg-background p-5 text-text-primary"><header className="flex items-center justify-between"><h2 className="text-xl font-semibold">Notifications</h2><button onClick={onClose}>Close</button></header><nav className="flex gap-4"><button onClick={() => setUnreadOnly(true)}>Unread ({items.filter(item => !item.readAt).length})</button><button onClick={() => setUnreadOnly(false)}>All</button><button disabled={read.isPending || !items.some(item => !item.readAt)} onClick={() => read.mutate(undefined)}>Mark all read</button></nav>{notifications.error ? <PaymentLinkLoadError error={notifications.error} returnTo="/" retry={() => { void notifications.refetch(); }} /> : notifications.isLoading ? <p>Loading notifications…</p> : !visible.length ? <p className="py-8 text-center text-text-secondary">No notifications.</p> : visible.map(item => <article key={item.id} className="space-y-2 rounded-xl border border-primary-divider p-4"><Link href={item.actionUrl} onClick={() => { if (!item.readAt) read.mutate(item.id); onClose(); }} className="font-semibold">{item.title}</Link><p className="text-sm">{item.message}</p><p className="text-xs text-text-secondary">{new Date(item.createdAt).toLocaleString()}</p>{!item.readAt && <button disabled={read.isPending} onClick={() => read.mutate(item.id)}>Mark read</button>}</article>)}{read.error && <p role="alert" className="text-red-600">{read.error.message}</p>}</aside></div>;
}
