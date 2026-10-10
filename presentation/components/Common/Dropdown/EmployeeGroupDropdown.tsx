"use client";
import React, { useState, useRef, useEffect } from "react";
import { NavArrowDown, Plus, Check } from "iconoir-react";
import { CompanyGroupResponseDto } from "@/presentation/types/dto/employee";
import { MODAL_IDS } from "@/presentation/types/modal";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
interface EmployeeGroupDropdownProps {
    groups?: CompanyGroupResponseDto[];
    selectedGroupIds?: number[];
    onToggleGroup: (group: CompanyGroupResponseDto) => void;
    disabled?: boolean;
}
export const EmployeeGroupDropdown = ({ groups, selectedGroupIds = [], onToggleGroup, disabled = false, }: EmployeeGroupDropdownProps) => {
    const { openModal } = useModal();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    const selectedNames = (groups || []).filter(g => selectedGroupIds.includes(g.id)).map(g => g.name);
    const label = selectedNames.length === 0
        ? "Select a group" : selectedNames.length <= 2
        ? selectedNames.join(", ")
        : `${selectedNames[0]} +${selectedNames.length - 1}`;
    return (<div className="relative" ref={dropdownRef}>
      <button type="button" onClick={() => !disabled && setIsOpen(!isOpen)} className="flex items-center gap-2 px-4 h-full w-full text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed justify-between" disabled={disabled}>
        <div className="flex min-w-0 flex-col">
          <span className="text-text-secondary text-[13px]">Groups</span>
          <p className="truncate text-text-primary font-semibold">{label}</p>
        </div>
        <NavArrowDown width={18} height={18} strokeWidth={2} className={`flex-shrink-0 text-text-secondary transition-transform ${isOpen ? "rotate-180" : ""}`}/>
      </button>

      {isOpen && (<div className="absolute bottom-full left-0 right-0 mb-2 z-[120] h-fit overflow-y-auto rounded-2xl border border-white/10 bg-[#26262b]/90 p-1.5 shadow-[0_24px_60px_-14px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
          <div className="px-2 py-1.5">
            <p className="text-white/50 text-xs">Select one or more groups</p>
          </div>

          <div className="flex flex-col gap-0.5">
            {groups &&
                groups.length > 0 &&
                groups.map(group => {
                    const active = selectedGroupIds.includes(group.id);
                    return (<button key={group.id} type="button" onClick={() => onToggleGroup(group)} className={`flex w-full items-center gap-2.5 rounded-lg p-2 transition-colors cursor-pointer hover:bg-white/[0.08] ${active ? "bg-white/[0.10]" : ""}`}>
                    <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: group.color }}/>
                    <span className="flex-1 truncate text-left text-[14px] font-medium text-white/90">{group.name}</span>
                    {active && <Check width={15} height={15} strokeWidth={2.4} className="flex-shrink-0 text-white/85"/>}
                  </button>);
                })}
            <button type="button" onClick={() => openModal(MODAL_IDS.CREATE_GROUP, { onGroupCreated: onToggleGroup })} className="flex w-full items-center gap-2.5 rounded-lg p-2 transition-colors cursor-pointer hover:bg-white/[0.08]">
              <Plus width={16} height={16} strokeWidth={2.2} className="flex-shrink-0 text-primary-blue"/>
              <span className="text-[14px] font-medium text-primary-blue">Add a new group</span>
            </button>
          </div>
        </div>)}
    </div>);
};
