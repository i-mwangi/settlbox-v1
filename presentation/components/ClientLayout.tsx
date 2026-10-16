"use client";
import { ArcWalletProvider } from "@/contexts/ArcWalletProvider";
import { ReactNode, useMemo, useState, useEffect, useCallback } from "react";
import { ToastBar, Toaster } from "react-hot-toast";
import { CircleNotch } from "@phosphor-icons/react";
import { ToastIcon } from "./Common/settlboxToast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "./Sidebar/Sidebar";
import { Title } from "./Common/Title";
import { ModalProvider } from "@/presentation/contexts/ModalManagerProvider";
import { ModalManager } from "./Common/ModalManager";
import { TitleProvider } from "@/presentation/contexts/TitleProvider";
import { usePathname } from "next/navigation";
import { DemoProvider } from "@/presentation/contexts/DemoProvider";
import { useAuthGuard } from "@/presentation/hooks/server/useAuthGuard";
import { MockAuthProvider, MockPSMProvider, MockSocketProvider, MockTransactionProvider, } from "@/presentation/contexts/DemoMockProviders";
import { ArcPaymentProvider } from "@/presentation/contexts/ArcPaymentProvider";
import { ArcNetworkProvider } from "@/contexts/ArcNetworkProvider";
import { AccountProvider } from "@/presentation/contexts/AccountProvider";
const SIDEBAR_WIDTH_CLASSES = "w-[176px] lg:w-[200px] xl:w-[228px]";
interface ClientLayoutProps {
    children: ReactNode;
}
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            retry: 1,
        },
    },
});
const fullscreenPages = new Set([
    "/not-found",
    "/404",
    "/mobile",
    "/login",
    "/onboarding",
    "/payment/",
    "/invoice-review",
    "/team-invite",
]);
function ProtectedContent({ children }: {
    children: ReactNode;
}) {
    useAuthGuard();
    return <>{children}</>;
}
export default function ClientLayout({ children }: ClientLayoutProps) {
    const pathname = usePathname();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    useEffect(() => {
        if (localStorage.getItem("settlbox_demo_sidebar_collapsed") === "1")
            setSidebarCollapsed(true);
    }, []);
    const toggleSidebar = useCallback(() => {
        setSidebarCollapsed(prev => {
            const next = !prev;
            try {
                localStorage.setItem("settlbox_demo_sidebar_collapsed", next ? "1" : "0");
            }
            catch { }
            return next;
        });
    }, []);
    const isFullscreen = useMemo(() => {
        if (!pathname)
            return false;
        return Array.from(fullscreenPages).some(p => pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`));
    }, [pathname]);
    return (<QueryClientProvider client={queryClient}>
      <ArcNetworkProvider><ArcWalletProvider><DemoProvider>
        <ArcPaymentProvider>
          <MockPSMProvider>
            <Toaster position="top-right" toastOptions={{
            duration: 4000,
            style: {
                background: "#1a1a1a",
                color: "#ffffff",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "14px",
                padding: "8px 14px",
                maxWidth: "440px",
                fontSize: "14px",
                fontWeight: 500,
                boxShadow: "0 14px 38px -12px rgba(0,0,0,0.55)",
            },
            success: { icon: <ToastIcon type="success"/> },
            error: { icon: <ToastIcon type="error"/> },
            loading: { icon: <CircleNotch size={18} weight="bold" className="animate-spin text-white"/> },
        }}>
              {t => (<ToastBar toast={t} style={{ ...t.style }}>
                  {({ icon, message }) => (<div className="flex items-center gap-2.5">
                      {icon}
                      <span className="py-0.5 leading-snug text-white">{message}</span>
                    </div>)}
                </ToastBar>)}
            </Toaster>
            <MockAuthProvider>
              <ProtectedContent>
              <MockSocketProvider>
                <ModalProvider>
                  <AccountProvider>
                    <MockTransactionProvider>
                      <ModalManager />
                      <TitleProvider>
                        {isFullscreen ? (<div className="h-screen w-screen">{children}</div>) : (<div className="flex flex-col h-screen overflow-hidden">
                            <div className="flex min-h-0 flex-1 flex-row gap-2">
                              <div className={`top-0 shrink-0 transition-[width] duration-200 ${sidebarCollapsed ? "w-[68px]" : SIDEBAR_WIDTH_CLASSES}`}>
                                <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar}/>
                              </div>
                              <div className="min-h-0 min-w-0 flex-1 h-screen flex flex-col overflow-hidden gap-2">
                                <Title />
                                <div className="workspace-scroll mx-[8px] mb-[24px] min-h-0 min-w-0 rounded-[12px] flex flex-col items-stretch flex-1 overflow-auto relative bg-background">
                                  {children}
                                </div>
                              </div>
                            </div>
                          </div>)}
                        
                      </TitleProvider>
                    </MockTransactionProvider>
                  </AccountProvider>
                </ModalProvider>
              </MockSocketProvider>
              </ProtectedContent>
            </MockAuthProvider>
          </MockPSMProvider>
        </ArcPaymentProvider>
      </DemoProvider></ArcWalletProvider></ArcNetworkProvider>
    </QueryClientProvider>);
}
