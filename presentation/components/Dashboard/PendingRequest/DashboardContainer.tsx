"use client";
import React, { useEffect } from "react";
import { RequestLinkSection } from "./RequestLinkSection";
import { PendingRequestSection } from "./PendingRequestSection";
import { useGetRequests } from "@/presentation/services/api/request-payment";
import { AcceptedRequestSection } from "./AcceptedRequestSection";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { MODAL_IDS } from "@/presentation/types/modal";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { NavArrowRight } from "iconoir-react";
export const DashboardContainer: React.FC = () => {
    const { data: requests } = useGetRequests();
    const { openModal } = useModal();
    const router = useRouter();
    const searchParams = useSearchParams();
    const recipient = searchParams.get("recipient");
    const { setTitle, setShowBackArrow } = useTitle();
    const pendingRequests = requests?.pending || [];
    const acceptedRequests = requests?.accepted || [];
    useEffect(() => {
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <button type="button" onClick={() => router.push("/")} className="text-text-secondary transition-colors cursor-pointer hover:text-text-primary">
          Dashboard
        </button>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <span className="font-medium text-text-primary">Pending request</span>
      </div>);
        setShowBackArrow(false);
    }, []);
    useEffect(() => {
        if (recipient) {
            openModal(MODAL_IDS.NEW_REQUEST, { recipient });
        }
    }, [recipient]);
    return (<div className="flex w-full h-full flex-col bg-background">
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Pending request</h1>
          <p className="text-[14px] text-text-secondary">
            Track payment requests you sent, and review the ones recipients have accepted.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-6 pb-6">
        <RequestLinkSection />
        <PendingRequestSection pendingRequests={pendingRequests}/>
        <AcceptedRequestSection acceptedRequests={acceptedRequests}/>
      </div>
    </div>);
};
export default DashboardContainer;
