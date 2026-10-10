"use client";
import React, { useState, useEffect } from "react";
import { ModalProp } from "@/presentation/contexts/ModalManagerProvider";
import { NotificationModalProps } from "@/presentation/types/modal";
import NotificationCard from "./NotificationCard";
import { NotificationType } from "@/presentation/types/notification";
import { useSocket } from "@/presentation/contexts/SocketProvider";
import { useGetNotificationsInfinite, useMarkAllNotificationsAsRead, useMarkNotificationAsRead, } from "@/presentation/services/api/notification";
import { useQueryClient } from "@tanstack/react-query";
import { useWalletConnect } from "@/presentation/hooks/web3/useWalletConnect";
import { NotificationCardType, NotificationResponseDto } from "@/presentation/types/notification";
import { formatRelativeTime } from "@/presentation/services/utils/formatDate";
import { TabContainer } from "../Common/TabContainer";
const tabs = (unreadCount: number) => [
    {
        id: "unread",
        label: (<div className="flex justify-center items-center gap-2">
        <span>Unread</span>
        {unreadCount > 0 && (<div className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#FF4444]">
            <span className="text-white text-xs font-medium">{unreadCount}</span>
          </div>)}
      </div>),
    },
    { id: "all", label: "All" },
];
const Notification = ({ isOpen, onClose }: ModalProp<NotificationModalProps>) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const [activeTab, setActiveTab] = useState<"unread" | "all">("unread");
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const socketContext = useSocket();
    const socket = socketContext?.socket;
    const queryClient = useQueryClient();
    const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useGetNotificationsInfinite(20);
    const markAsReadMutation = useMarkNotificationAsRead();
    const markAllAsReadMutation = useMarkAllNotificationsAsRead();
    useEffect(() => {
        if (data?.pages) {
            const allNotifications = data.pages.flatMap(page => page.notifications);
            const unread = allNotifications.filter((item: any) => item.status === "UNREAD").length;
            setUnreadCount(unread);
        }
    }, [data]);
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsAnimating(true), 10);
        }
        else {
            setIsAnimating(false);
        }
    }, [isOpen]);
    useEffect(() => {
        if (!socket)
            return;
        const handleNewNotification = (event: any) => {
            if (event.data) {
                console.log("New notification received:", event.data);
                queryClient.setQueriesData({ queryKey: ["notification-infinite"] }, (oldData: any) => {
                    if (!oldData?.pages)
                        return oldData;
                    return {
                        ...oldData,
                        pages: oldData.pages.map((page: any, index: number) => index === 0 ? { ...page, notifications: [event.data, ...page.notifications] } : page),
                    };
                });
                if (event.data.status === "UNREAD") {
                    setUnreadCount(prev => prev + 1);
                }
            }
        };
        const handleUnreadCountUpdate = (event: any) => {
            if (typeof event.count === "number") {
                console.log("Unread count updated:", event.count);
                setUnreadCount(event.count);
            }
        };
        const handleNotificationRead = (event: any) => {
            if (event.notificationId) {
                console.log("Notification marked as read:", event.notificationId);
                queryClient.setQueriesData({ queryKey: ["notification-infinite"] }, (oldData: any) => {
                    if (!oldData?.pages)
                        return oldData;
                    return {
                        ...oldData,
                        pages: oldData.pages.map((page: any) => ({
                            ...page,
                            notifications: page.notifications.map((notification: any) => notification.id === event.notificationId
                                ? { ...notification, status: "READ" as const, readAt: new Date() }
                                : notification),
                        })),
                    };
                });
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        };
        const handleAllNotificationsRead = () => {
            console.log("All notifications marked as read");
            queryClient.setQueriesData({ queryKey: ["notification-infinite"] }, (oldData: any) => {
                if (!oldData?.pages)
                    return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: any) => ({
                        ...page,
                        notifications: page.notifications.map((notification: any) => ({
                            ...notification,
                            status: "READ" as const,
                            readAt: new Date(),
                        })),
                    })),
                };
            });
            setUnreadCount(0);
        };
        socket.on("new_notification", handleNewNotification);
        socket.on("unread_count_update", handleUnreadCountUpdate);
        socket.on("notification_read", handleNotificationRead);
        socket.on("all_notifications_read", handleAllNotificationsRead);
        return () => {
            socket.off("new_notification", handleNewNotification);
            socket.off("unread_count_update", handleUnreadCountUpdate);
            socket.off("notification_read", handleNotificationRead);
            socket.off("all_notifications_read", handleAllNotificationsRead);
        };
    }, [socket]);
    const handleClose = () => {
        setIsAnimating(false);
        setTimeout(() => onClose(), 300);
    };
    const handleTabClick = (tab: "unread" | "all") => {
        setActiveTab(tab);
    };
    const handleLoadMore = () => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };
    const handleMarkAsRead = async (notificationId: number) => {
        try {
            await markAsReadMutation.mutateAsync(notificationId);
        }
        catch (error) {
            console.error("Failed to mark notification as read:", error);
        }
    };
    const handleMarkAllAsRead = async () => {
        if (unreadCount === 0)
            return;
        try {
            await markAllAsReadMutation.mutateAsync();
        }
        catch (error) {
            console.error("Failed to mark all notifications as read:", error);
        }
    };
    const convertNotification = (notification: NotificationResponseDto): NotificationCardType => {
        return {
            id: notification.id,
            type: notification.type as any as NotificationType,
            title: notification.title,
            subtitle: notification.message || null,
            time: formatRelativeTime(new Date(notification.createdAt)),
            amount: notification.metadata?.amount,
            tokenAddress: notification.metadata?.tokenId,
            tokenName: notification.metadata?.tokenName,
            address: notification.metadata?.recipient,
            payee: notification.metadata?.payee,
            recipientCount: notification.metadata?.recipientCount,
            isRead: notification.status === "READ",
            transactionId: notification.metadata?.transactionId,
            giftOpener: notification.metadata?.caller,
        };
    };
    const clientNotifications = data?.pages
        ? data.pages.flatMap(page => page.notifications).map(convertNotification)
        : [];
    const filteredNotifications = activeTab === "unread"
        ? clientNotifications?.filter((notification: any) => !notification.isRead)
        : clientNotifications;
    if (!isOpen)
        return null;
    return (<div data-tour="portfolio-section" className="relativportfolio fixed inset-0 flex items-center justify-end z-[150] pointer-events-auto">
      
      <div className={`absolute inset-0 transition-all duration-300 ease-out z-[1] ${isAnimating ? "bg-black/60 backdrop-blur-sm opacity-100" : "bg-black/0 backdrop-blur-none opacity-0"}`} onClick={handleClose}/>

      
      <main className={`relative flex gap-1 justify-center items-start p-2 rounded-3xl bg-app-background h-full w-[470px] transition-transform duration-300 ease-out z-[2] ${isAnimating ? "translate-x-0" : "translate-x-full"}`}>
        
        

        
        <div className="flex flex-col gap-2 items-start justify-start p-0 size-full relative">
          
          <div className="flex items-center justify-between px-3 py-2 w-full">
            <h1 className=" text-text-primary text-2xl leading-none">Notifications</h1>

            <div className="flex items-center justify-center gap-1 cursor-pointer" onClick={handleMarkAllAsRead}>
              <img src="/misc/double-check-icon.svg" alt="double-check-icon" className="w-5 h-5"/>
              <span className="leading-none text-primary-blue">Mark all as read</span>
            </div>
          </div>

          
          <div className=" flex flex-col items-center justify-between p-3 rounded-2xl w-full h-full overflow-hidden">
            
            <TabContainer tabs={tabs(unreadCount)} activeTab={activeTab} setActiveTab={(tab: string) => handleTabClick(tab as "unread" | "all")}/>

            
            <div className="flex flex-col gap-1 w-full overflow-y-auto h-full my-2">
              {isLoading || error ? (<div className="flex items-center justify-center py-8">
                  <span className="text-text-secondary text-sm">Loading notifications...</span>
                </div>) : filteredNotifications.length > 0 ? (filteredNotifications.map((notification: NotificationCardType) => (<NotificationCard key={notification.id} type={notification.type} title={notification.title} subtitle={notification.subtitle} time={notification.time} amount={notification.amount} tokenAddress={notification.tokenAddress} tokenName={notification.tokenName} address={notification.address} payee={notification.payee} recipientCount={notification.recipientCount} isRead={notification.isRead} txId={notification.transactionId} giftOpener={notification.giftOpener} onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}/>))) : (<div className="flex items-center justify-center h-full flex-col gap-4">
                  <img src="/notification/hexagon-bell-icon.svg" alt="No notifications" className="w-30 h-30"/>
                  <span className="text-text-secondary">You don’t have any notifications yet</span>
                </div>)}
            </div>
            
            {hasNextPage && (<div className="bg-[#292929] flex items-center justify-center gap-1.5 pb-3.5 pt-3 px-[15px] rounded-[10px] w-full overflow-hidden relative cursor-pointer hover:bg-[#3d3d3d] transition-colors duration-200" onClick={handleLoadMore}>
                <span className=" text-[#989898] text-base tracking-[-0.084px] leading-none">
                  {isFetchingNextPage ? "Loading..." : "Load more"}
                </span>
                <div className="absolute inset-0 pointer-events-none shadow-[0px_-2.4px_0px_0px_inset_#3d3d3d]"/>
              </div>)}
          </div>
        </div>
      </main>
    </div>);
};
export default Notification;
