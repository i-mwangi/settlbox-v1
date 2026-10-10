"use client";
import React, { useEffect, useMemo, useState } from "react";
import { EditGroupModalProps, MODAL_IDS } from "@/presentation/types/modal";
import { ModalProp, useModal } from "@/presentation/contexts/ModalManagerProvider";
import BaseModal from "../BaseModal";
import { Table, CellContent } from "@/presentation/components/Common/Table";
import { ActionButton } from "@/presentation/components/Common/ActionButton";
import { useForm } from "react-hook-form";
import { useDeleteGroup, useUpdateGroup } from "@/presentation/services/api/group-payment";
import { toast } from "react-hot-toast";
type Member = {
    address: string;
    name: string;
};
const headers = ["No", "Remember name", "Address"];
export function EditGroupModal({ isOpen, onClose, zIndex, group }: ModalProp<EditGroupModalProps>) {
    const { openModal } = useModal();
    const { register, setValue, getValues } = useForm<{
        name: string;
    }>();
    const updateGroup = useUpdateGroup();
    const deleteGroup = useDeleteGroup();
    const [members, setMembers] = useState<Member[]>([]);
    useEffect(() => {
        if (group) {
            setMembers(group.members.map(member => ({
                address: member.address,
                name: member.name,
            })) || []);
            setValue("name", group.name || "");
        }
    }, [group]);
    const tableData = members.map((member, index) => ({
        No: <span className="text-white font-medium">{(index + 1).toString()}</span>,
        "Remember name": (<input type="text" placeholder="Enter name" className="text-white text-[16px] tracking-[-0.32px] leading-none w-full outline-none text-center" value={member.name} onChange={e => setMembers(prev => prev.map((m, i) => (i === index ? { ...m, name: e.target.value } : m)))}/>),
        Address: (<input type="text" className="text-white text-[16px] tracking-[-0.32px] leading-none w-full outline-none text-center" placeholder="Enter address" value={member.address} onChange={e => setMembers(prev => prev.map((m, i) => (i === index ? { ...m, address: e.target.value.trim() } : m)))}/>),
    }));
    const actionRenderer = (_row: Record<string, CellContent>, index: number) => (<ActionButton text="Remove" type="deny" onClick={() => setMembers(prev => prev.filter((_, i) => i !== index))}/>);
    const handleSave = async () => {
        throw new Error("This action is unavailable in the demo workspace.");
    };
    if (!isOpen)
        return null;
    return (<BaseModal isOpen={isOpen} onClose={onClose} title="Edit Group" icon="/sidebar/group-payment.gif" zIndex={zIndex}>
      <div className="flex flex-col gap-1.5 bg-[#1E1E1E] rounded-b-2xl w-[600px] p-3">
        
        <div className="flex items-center gap-2 py-2">
          <input type="text" className="text-white text-[32px] tracking-[-0.64px] leading-none w-full outline-none" {...register("name", { required: true })} defaultValue={group.name}/>
        </div>
        <div className="flex flex-row justify-between items-center">
          <div className="text-[15px] tracking-[-0.45px] text-neutral-600 ">{members.length} member(s)</div>
          <ActionButton text="Add new" onClick={() => setMembers(prev => [...prev, { address: "", name: "" }])} className="rounded-full"/>
        </div>

        
        <Table headers={headers} data={tableData} actionColumn={true} actionRenderer={actionRenderer}/>

        
        <div className=" rounded-b-xl flex gap-2 w-full h-10">
          <ActionButton text="Delete Group" type="deny" onClick={() => openModal(MODAL_IDS.DELETE_GROUP, {
            groupName: group.name,
            onDelete: async () => {
                await deleteGroup.mutateAsync(group.id);
                onClose?.();
                toast.success("Group deleted successfully");
            },
        })} className="flex-1"/>
          <ActionButton text="Save changes" onClick={handleSave} className="flex-2"/>
        </div>
      </div>
    </BaseModal>);
}
export default EditGroupModal;
