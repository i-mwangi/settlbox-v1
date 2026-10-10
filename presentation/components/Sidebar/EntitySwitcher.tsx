"use client";
import React, { useEffect, useRef } from "react";
import CompanyAvatar from "../Common/CompanyAvatar";
import { DemoEntitySummary } from "@/presentation/contexts/DemoProvider";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
interface EntitySwitcherProps {
    entities: DemoEntitySummary[];
    activeEntityId: string;
    isOpen: boolean;
    onClose: () => void;
    onSwitch: (entityId: string) => void;
    triggerRef?: React.RefObject<HTMLElement | null>;
}
export default function EntitySwitcher({ entities, activeEntityId, isOpen, onClose, onSwitch, triggerRef, }: EntitySwitcherProps) {
    const ref = useRef<HTMLDivElement>(null);
    const { openModal } = useModal();
    useEffect(() => {
        if (!isOpen)
            return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (ref.current && !ref.current.contains(target) &&
                !(triggerRef?.current && triggerRef.current.contains(target))) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [isOpen, onClose, triggerRef]);
    if (!isOpen)
        return null;
    return (<div ref={ref} className="absolute left-0 right-0 z-30 mt-1 rounded-xl bg-background shadow-lg border border-primary-divider overflow-hidden">
      <div className="p-1.5">
        {entities.map((entity) => {
            const isActive = entity.id === activeEntityId;
            return (<button key={entity.id} type="button" className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors hover:bg-app-background ${isActive ? "bg-app-background" : ""}`} onClick={() => {
                    onSwitch(entity.id);
                    onClose();
                }}>
              <CompanyAvatar logo={entity.company.logo} companyName={entity.company.companyName} size="w-8"/>
              <div className="flex flex-col items-start flex-1 min-w-0">
                <span className="text-sm font-medium text-text-primary truncate w-full text-left">
                  {entity.company.companyName}
                </span>
                <span className="text-xs text-text-secondary">
                  {entity.company.country}
                </span>
              </div>
              {isActive && (<img src="/misc/blue-check-icon.svg" alt="active" className="w-4 h-4 shrink-0"/>)}
            </button>);
        })}
      </div>

      <div className="border-t border-primary-divider"/>

      <div className="p-1.5">
        <button type="button" className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors hover:bg-app-background cursor-pointer" onClick={() => {
            onClose();
            openModal("CREATE_ENTITY");
        }}>
          <div className="w-8 h-8 rounded-lg border border-dashed border-text-secondary flex items-center justify-center">
            <img src="/misc/circle-plus-icon.svg" alt="add" className="w-4 h-4 opacity-50"/>
          </div>
          <span className="text-sm text-text-secondary">Add new entity</span>
        </button>
      </div>
    </div>);
}
