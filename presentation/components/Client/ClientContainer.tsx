"use client";
import React, { useEffect } from "react";
import { ClientContact } from "../ContactBook/ClientContact";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { MODAL_IDS } from "@/presentation/types/modal";
import { PrimaryButton } from "../Common/PrimaryButton";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { NavArrowRight } from "iconoir-react";
const ClientContainer = () => {
    const { openModal } = useModal();
    const { setTitle, setShowBackArrow } = useTitle();
    useEffect(() => {
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <span className="text-text-secondary">Contact</span>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <span className="font-medium text-text-primary">Clients</span>
      </div>);
        setShowBackArrow(false);
    }, []);
    return (<div className="relative flex w-full h-full flex-col">
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Clients</h1>
          <p className="text-[14px] text-text-secondary">Manage the clients you invoice and get paid by.</p>
        </div>
        <PrimaryButton text="Add client" onClick={() => openModal(MODAL_IDS.CREATE_CLIENT_CONTACT)} containerClassName="w-fit" buttonClassName="whitespace-nowrap"/>
      </div>

      <ClientContact />
    </div>);
};
export default ClientContainer;
