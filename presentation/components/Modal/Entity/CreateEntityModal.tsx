"use client";
import React, { useState } from "react";
import { BaseModalProps, MODAL_IDS } from "@/presentation/types/modal";
import { ModalProp, useModal } from "@/presentation/contexts/ModalManagerProvider";
import { ModalHeader } from "../../Common/ModalHeader";
import BaseModal from "../BaseModal";
import InputFilled from "@/presentation/components/Common/Input/InputFilled";
import { PrimaryButton } from "@/presentation/components/Common/PrimaryButton";
import { SecondaryButton } from "@/presentation/components/Common/SecondaryButton";
import { useDemo } from "@/presentation/contexts/DemoProvider";
import toast from "react-hot-toast";
export interface CreateEntityModalProps extends BaseModalProps {
}
const COUNTRY_OPTIONS = [
    "Singapore",
    "Hong Kong",
    "United States",
    "United Kingdom",
    "Cayman Islands",
    "British Virgin Islands",
    "Switzerland",
    "Dubai (UAE)",
];
export function CreateEntityModal({ isOpen, onClose, zIndex }: ModalProp<CreateEntityModalProps>) {
    const { switchEntity } = useDemo();
    const { openModal } = useModal();
    const [entityName, setEntityName] = useState("");
    const [country, setCountry] = useState("");
    const [industry, setIndustry] = useState("");
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);
    const resetState = () => {
        setEntityName("");
        setCountry("");
        setIndustry("");
        setShowCountryDropdown(false);
    };
    const handleClose = () => {
        resetState();
        onClose();
    };
    const handleCreate = () => {
        if (!entityName.trim() || !country)
            return;
        toast.success(`Entity "${entityName}" created`);
        handleClose();
    };
    const canCreate = entityName.trim().length > 0 && country.length > 0;
    if (!isOpen)
        return null;
    return (<BaseModal isOpen={isOpen} onClose={handleClose} zIndex={zIndex}>
      <ModalHeader title="Add new entity" onClose={handleClose}/>
      <div className="flex flex-col w-[480px] p-6 rounded-b-2xl border-2 border-t-0 border-primary-divider bg-background gap-5">
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-medium">Create a new entity</span>
          <span className="text-sm text-text-secondary">
            Add a subsidiary, holding company, or regional entity to manage under your account.
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <InputFilled label="Entity name" placeholder="e.g. NovaPay Asia" value={entityName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEntityName(e.target.value)}/>

          
          <div className="relative">
            <div className="flex items-center justify-between px-4 py-2 rounded-xl w-full bg-app-background border-b border-primary-divider cursor-pointer" onClick={() => setShowCountryDropdown(prev => !prev)}>
              <div className="flex flex-col">
                <p className="text-sm text-text-secondary">Country of incorporation</p>
                <p className={`text-base ${country ? "text-text-primary" : "text-[#C1C1C1]"}`}>
                  {country || "Select country"}
                </p>
              </div>
              <img src="/arrow/chevron-down.svg" alt="expand" className={`w-4 transition-transform ${showCountryDropdown ? "rotate-180" : ""}`}/>
            </div>
            {showCountryDropdown && (<div className="absolute left-0 right-0 top-full mt-1 bg-background border border-primary-divider rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                {COUNTRY_OPTIONS.map((c) => (<button key={c} type="button" className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-app-background cursor-pointer ${c === country ? "text-primary-blue font-medium" : "text-text-primary"}`} onClick={() => {
                    setCountry(c);
                    setShowCountryDropdown(false);
                }}>
                    {c}
                  </button>))}
              </div>)}
          </div>

          <InputFilled label="Industry" placeholder="e.g. Fintech / Treasury" optional value={industry} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIndustry(e.target.value)}/>
        </div>

        <div className="flex flex-row gap-2">
          <SecondaryButton text="Cancel" onClick={() => openModal(MODAL_IDS.DISCARD_CHANGES, { onConfirm: handleClose })} buttonClassName="flex-1" variant="light"/>
          <PrimaryButton text="Create Entity" onClick={handleCreate} containerClassName="flex-1" disabled={!canCreate}/>
        </div>
      </div>
    </BaseModal>);
}
export default CreateEntityModal;
