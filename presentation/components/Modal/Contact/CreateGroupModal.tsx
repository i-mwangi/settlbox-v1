"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { CreateGroupModalProps, MODAL_IDS } from "@/presentation/types/modal";
import { ModalProp, useModal } from "@/presentation/contexts/ModalManagerProvider";
import BaseModal from "../BaseModal";
import { ModalHeader } from "../../Common/ModalHeader";
import { SecondaryButton } from "../../Common/SecondaryButton";
import { PrimaryButton } from "../../Common/PrimaryButton";
import { useCreateEmployeeGroup, useGetAllEmployeeGroups } from "@/presentation/services/api/employee";
import toast from "react-hot-toast";
import { CategoryShapeEnum } from "@/presentation/types/enums";
import { useAuth } from "@/presentation/services/auth/context";
interface CategoryFormData {
    name: string;
}
const colorOptions = [
    { value: "#35ADE9", label: "Blue" },
    { value: "#7D52F4", label: "Purple" },
    { value: "#E9358F", label: "Pink" },
    { value: "#E97135", label: "Orange" },
    { value: "#1DAF61", label: "Green" },
];
export function CreateGroupModal({ isOpen, onClose, zIndex, onGroupCreated }: ModalProp<CreateGroupModalProps>) {
    const { isAuthenticated } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedColor, setSelectedColor] = useState("#35ADE9");
    const { mutateAsync: createGroupAsync } = useCreateEmployeeGroup();
    const { data: groups } = useGetAllEmployeeGroups({ enabled: isAuthenticated });
    const { openModal } = useModal();
    const { register, handleSubmit, formState: { errors }, reset, watch, } = useForm<CategoryFormData>({
        defaultValues: {
            name: "",
        },
    });
    const currentName = watch("name");
    const categoryExists = currentName.length >= 2 && groups?.some(group => group.name.toLowerCase() === currentName.toLowerCase());
    const onSubmit = async (data: CategoryFormData) => {
        setIsLoading(true);
        try {
            if (categoryExists) {
                toast.error("Category name already exists");
                setIsLoading(false);
                return;
            }
            const createdGroup = await createGroupAsync({
                name: data.name,
                shape: CategoryShapeEnum.CIRCLE,
                color: selectedColor,
            });
            onGroupCreated?.(createdGroup as any);
            reset();
            setSelectedColor("#35ADE9");
            onClose();
            toast.success("Group created successfully");
        }
        catch (error) {
            console.error("Error creating group:", error);
            toast.error("Failed to create group");
        }
        finally {
            setIsLoading(false);
        }
    };
    if (!isOpen)
        return null;
    return (<BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex}>
      <ModalHeader title="Create New Group" onClose={onClose} icon="/misc/blue-user-hexagon-icon.svg"/>
      <div className="flex flex-col gap-4 p-4 border-2 border-primary-divider rounded-b-2xl bg-background w-[500px]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-text-primary">Group Name</label>
            <input {...register("name", {
        required: "Group name is required",
        minLength: {
            value: 2,
            message: "Group name must be at least 2 characters",
        },
        maxLength: {
            value: 50,
            message: "Group name cannot exceed 50 characters",
        },
    })} autoComplete="off" type="text" placeholder="Enter group name" className="h-[46px] w-full rounded-xl border border-primary-divider bg-background px-3.5 text-[14px] text-text-primary outline-none transition placeholder:text-[#C1C1C1] focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/15" autoFocus disabled={isLoading}/>
            {errors.name && (<div className="flex flex-row gap-1 items-center pl-1">
                <img src="/misc/red-circle-warning.svg" alt="warning" className="w-4 h-4"/>
                <span className="text-[#E93544] text-sm">{errors.name.message}</span>
              </div>)}
            {currentName.length >= 2 && categoryExists && (<div className="flex flex-row gap-1 items-center pl-1">
                <img src="/misc/red-circle-warning.svg" alt="warning" className="w-4 h-4"/>
                <span className="text-[#E93544] text-sm">Category name already exists</span>
              </div>)}
          </div>

          
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-text-primary">Select color</span>
            <div className="flex flex-row gap-2.5">
              {colorOptions.map(color => (<button type="button" key={color.value} onClick={() => setSelectedColor(color.value)} aria-label={color.label} className={`h-7 w-7 rounded-full transition-all cursor-pointer ${selectedColor === color.value
                ? "ring-2 ring-offset-2 ring-offset-background" : "hover:scale-110"}`} style={{
                backgroundColor: color.value,
                ["--tw-ring-color" as any]: color.value,
            }} disabled={isLoading}/>))}
            </div>
          </div>

          
          <div className="flex flex-row gap-2 mt-2">
            <SecondaryButton text="Cancel" onClick={() => openModal(MODAL_IDS.DISCARD_CHANGES, { onConfirm: onClose })} buttonClassName="flex-1" disabled={isLoading} variant="light"/>
            <PrimaryButton text="Create" type="submit" containerClassName="flex-1" loading={isLoading} disabled={watch("name") === "" || categoryExists}/>
          </div>
        </form>
      </div>
    </BaseModal>);
}
export default CreateGroupModal;
