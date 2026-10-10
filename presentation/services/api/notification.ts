import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useDemo } from "@/presentation/contexts/DemoProvider";
import type { WorkspaceNotification } from "@/services/server/notifications";
import type { NotificationResponseDto } from "@/presentation/types/dto/notification";
import type { NotificationsStatusEnum, NotificationsTypeEnum } from "@/presentation/types/enums";
import { workspaceFetch } from "./seeded-workspace";

function notificationView(notification: WorkspaceNotification): NotificationResponseDto {
  return { ...notification, type: "NOP", status: notification.readAt ? "READ" : "UNREAD", metadata: null, userId: 0, updatedAt: notification.readAt || notification.createdAt };
}
function useNotifications(type?: NotificationsTypeEnum, status?: NotificationsStatusEnum) {
  const { data, activeEntityId, isLoaded, isLoggedIn } = useDemo();
  const companyId = data?.company.uuid;
  const client = useQueryClient();
  const key = ["notification-infinite", companyId, activeEntityId];
  const query = useQuery({ queryKey: key, enabled: isLoaded && isLoggedIn && activeEntityId === "entity-3", queryFn: async () => (await workspaceFetch<WorkspaceNotification[]>("/api/notifications")).map(notificationView), refetchInterval: 30000 });
  useEffect(() => {
    const refresh = () => { void client.invalidateQueries({ queryKey: ["notification-infinite", companyId, activeEntityId] }); };
    window.addEventListener("settlbox-workspace-refresh", refresh);
    return () => window.removeEventListener("settlbox-workspace-refresh", refresh);
  }, [client, companyId, activeEntityId]);
  return { ...query, data: (query.data || []).filter(notification => (!type || notification.type === type) && (!status || notification.status === status)) };
}
export function useGetNotifications(page = 1, limit = 20, type?: NotificationsTypeEnum, status?: NotificationsStatusEnum) {
  const query = useNotifications(type, status);
  return { ...query, data: { notifications: query.data.slice((page - 1) * limit, page * limit), pagination: { total: query.data.length, page, limit, totalPages: Math.ceil(query.data.length / limit) } } };
}
export { useGetNotifications as default };
export function useGetNotificationsInfinite(_limit = 20, type?: NotificationsTypeEnum, status?: NotificationsStatusEnum) {
  const query = useNotifications(type, status);
  return { ...query, data: { pages: [{ notifications: query.data, pagination: { total: query.data.length } }] }, hasNextPage: false, fetchNextPage: query.refetch, isFetchingNextPage: false };
}
export function useGetUnreadCount() {
  const query = useNotifications(undefined, "UNREAD");
  return { ...query, data: { count: query.data.length } };
}
export function useGetNotification(id?: number, _enabled?: boolean) {
  const query = useNotifications();
  return { ...query, data: query.data.find(notification => notification.id === id) || null };
}
function useNotificationMutation<Input>(build: (input: Input) => unknown) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: Input) => workspaceFetch<{ updatedCount: number }>("/api/notifications", "PATCH", build(input)), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["notification-infinite"] }); } });
}
export function useMarkNotificationAsRead() { return useNotificationMutation<number>(id => ({ action: "read", id })); }
export function useMarkNotificationAsUnread() { return useNotificationMutation<number>(id => ({ action: "unread", id })); }
export function useMarkAllNotificationsAsRead() { return useNotificationMutation<void>(() => ({ action: "readAll" })); }
export function useDeleteNotification() { return useNotificationMutation<number>(id => ({ action: "delete", id })); }
