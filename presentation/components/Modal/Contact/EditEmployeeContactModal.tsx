"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { EmployeeAvatar, memojiUrl } from "@/presentation/components/Common/EmployeeAvatar";
import { EditEmployeeContactModalProps } from "@/presentation/types/modal";
import { ModalProp } from "@/presentation/contexts/ModalManagerProvider";
import { UpdateAddressBookDto, CompanyGroupResponseDto } from "@/presentation/types/dto/employee";
import BaseModal from "../BaseModal";
import { ModalHeader } from "../../Common/ModalHeader";
import { PrimaryButton } from "../../Common/PrimaryButton";
import { SecondaryButton } from "../../Common/SecondaryButton";
import FieldInput from "../../Common/Input/FieldInput";
import { useUpdateEmployee, useGetAllEmployeeGroups, useCheckEmployeeNameDuplicate, useCheckEmployeeAddressDuplicate, } from "@/presentation/services/api/employee";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { MODAL_IDS } from "@/presentation/types/modal";
import { AssetWithMetadata } from "@/presentation/types/faucet";
import toast from "react-hot-toast";
import { EmployeeGroupDropdown } from "@/presentation/components/Common/Dropdown/EmployeeGroupDropdown";
import { useAuth } from "@/presentation/services/auth/context";
import { TokenDto } from "@/presentation/types/dto/token";
import { NetworkDto } from "@/presentation/types/dto/network";
interface EditContactFormData {
    name: string;
    walletAddress: string;
    email?: string;
    groupId?: number;
}
interface FormInputProps {
    label: string;
    placeholder: string;
    type?: string;
    register: any;
    error?: string;
    disabled?: boolean;
    required?: boolean;
}
const FormInput = ({ label, placeholder, type = "text", register, error, disabled, required }: FormInputProps) => (<FieldInput label={required ? label : `${label} (Optional)`} type={type} placeholder={placeholder} error={!!error} errorMessage={error} autoFocus={label === "Name"} disabled={disabled} autoComplete="off" {...register}/>);
const getNetworkFromName = (networkName?: string): {
    icon: string;
    name: string;
    value: string;
} | null => {
    if (!networkName)
        return null;
    const normalizedName = networkName.trim();
    const networkMap: Record<string, {
        icon: string;
        value: string;
        displayName: string;
    }> = {
        "arc testnet": { icon: "/chain/arc.svg", value: "5042002", displayName: "Arc Testnet" },
        ethereum: { icon: "/chain/ethereum.svg", value: "eth", displayName: "Ethereum" },
        solana: { icon: "/chain/solana.svg", value: "sol", displayName: "Solana" },
        base: { icon: "/chain/base.svg", value: "base", displayName: "Base" },
        "bnb smart chain (bep20)": { icon: "/chain/bnb.svg", value: "bnb", displayName: "BNB Smart Chain (BEP20)" },
    };
    const exactMatch = networkMap[normalizedName];
    if (exactMatch) {
        return { icon: exactMatch.icon, name: exactMatch.displayName, value: exactMatch.value };
    }
    const lowerName = normalizedName.toLowerCase();
    const caseInsensitiveMatch = networkMap[lowerName];
    if (caseInsensitiveMatch) {
        return {
            icon: caseInsensitiveMatch.icon,
            name: caseInsensitiveMatch.displayName,
            value: caseInsensitiveMatch.value,
        };
    }
    for (const [key, network] of Object.entries(networkMap)) {
        if (lowerName.includes(key) || key.includes(lowerName)) {
            return { icon: network.icon, name: network.displayName, value: network.value };
        }
    }
    return { icon: "/chain/arc.svg", name: networkName, value: "5042002" };
};
export function EditEmployeeContactModal({ isOpen, onClose, zIndex, contactData, }: ModalProp<EditEmployeeContactModalProps>) {
    const { isAuthenticated } = useAuth();
    const [selectedToken, setSelectedToken] = useState<TokenDto | null>(contactData?.token || null);
    const [selectedNetwork, setSelectedNetwork] = useState<{
        icon: string;
        name: string;
        value: string;
    } | null>(getNetworkFromName(contactData?.network?.name) || {
        icon: "/chain/arc.svg",
        name: "Arc Testnet",
        value: "5042002",
    });
    const [selectedGroups, setSelectedGroups] = useState<CompanyGroupResponseDto[]>([]);
    const [avatarSrc, setAvatarSrc] = useState<string | undefined>(contactData?.avatar);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { openModal } = useModal();
    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        if (!file.type.startsWith("image/")) {
            toast.error("Please choose an image file");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error("Image must be under 2MB");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setAvatarSrc(reader.result as string);
        reader.readAsDataURL(file);
        e.target.value = "";
    };
    const handleUseDefaultAvatar = () => {
        const seed = `${contactData?.name || "settlbox"}-${Math.random().toString(36).slice(2, 9)}`;
        setAvatarSrc(memojiUrl(seed));
    };
    const updateEmployee = useUpdateEmployee();
    const { data: employeeGroups = [] } = useGetAllEmployeeGroups({ enabled: isAuthenticated });
    const networkChainIds: Record<string, number> = useMemo(() => ({
        eth: 1,
        "5042002": 5042002,
        sol: 0,
        base: 8453,
        bnb: 56,
    }), []);
    const { register, handleSubmit, formState: { errors, isValid }, reset, setValue, watch, } = useForm<EditContactFormData>({
        mode: "onBlur",
        reValidateMode: "onBlur",
        defaultValues: {
            name: contactData?.name || "",
            walletAddress: contactData?.address || "",
            email: contactData?.email || "",
            groupId: undefined,
        },
    });
    const watchedName = watch("name");
    const watchedAddress = watch("walletAddress");
    const [debouncedName, setDebouncedName] = useState(watchedName);
    const [debouncedAddress, setDebouncedAddress] = useState(watchedAddress);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedName(watchedName);
        }, 500);
        return () => clearTimeout(handler);
    }, [watchedName]);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedAddress(watchedAddress);
        }, 500);
        return () => clearTimeout(handler);
    }, [watchedAddress]);
    const { data: nameDuplicate } = useCheckEmployeeNameDuplicate();
    const { data: addressDuplicate } = useCheckEmployeeAddressDuplicate();
    useEffect(() => {
        if (isOpen && contactData) {
            setValue("name", contactData.name);
            setValue("walletAddress", contactData.address);
            setValue("email", contactData.email || "");
            setSelectedToken(contactData.token || null);
            setAvatarSrc(contactData.avatar);
            const ids = contactData.groupIds?.length
                ? contactData.groupIds
                : employeeGroups.filter(group => group.name === contactData.group).map(g => g.id);
            const matchedGroups = employeeGroups.filter(group => ids.includes(group.id));
            setSelectedGroups(matchedGroups);
            setValue("groupId", matchedGroups[0]?.id ?? undefined, { shouldValidate: true, shouldTouch: true });
            if (contactData.network) {
                const network = getNetworkFromName(contactData.network.name);
                if (network) {
                    setSelectedNetwork(network);
                }
                else {
                    setSelectedNetwork({
                        icon: "/chain/arc.svg",
                        name: contactData.network.name,
                        value: "5042002",
                    });
                }
            }
        }
    }, [isOpen, contactData, setValue, employeeGroups]);
    const groupIdRegister = register("groupId", {
        required: "Group is required",
    });
    const nameRegister = register("name", {
        required: "Name is required",
        minLength: {
            value: 1,
            message: "Name must be at least 1 character",
        },
        maxLength: {
            value: 100,
            message: "Name cannot exceed 100 characters",
        },
        pattern: {
            value: /^[a-zA-Z0-9\s\-_]+$/,
            message: "Name can only contain letters, numbers, spaces, hyphens, and underscores",
        },
        validate: value => {
            if (!selectedGroups.length)
                return true;
            if (contactData?.name && contactData.name.trim().toLowerCase() === value.trim().toLowerCase())
                return true;
            if (nameDuplicate?.isDuplicate)
                return "This name already exists in the selected group";
            return true;
        },
    });
    const addressRegister = register("walletAddress", {
        required: "Wallet address is required",
        minLength: {
            value: 10,
            message: "Address is too short",
        },
        pattern: {
            value: /^0x[0-9a-f]{40}$/i,
            message: "Enter a valid Arc wallet address (0x followed by 40 hexadecimal characters)",
        },
        validate: value => {
            if (!selectedGroups.length)
                return true;
            if (contactData?.address && contactData.address.trim().toLowerCase() === value.trim().toLowerCase())
                return true;
            if (addressDuplicate?.isDuplicate)
                return "This address already exists in the selected group";
            return true;
        },
    });
    const emailRegister = register("email", {
        validate: value => {
            if (!value || value.trim() === "")
                return true;
            const trimmedValue = value.trim();
            if (trimmedValue.length > 255) {
                return "Email cannot be longer than 255 characters";
            }
            if (contactData?.email && contactData.email.trim().toLowerCase() === trimmedValue.toLowerCase()) {
                return true;
            }
            const rfcEmailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
            if (!rfcEmailRegex.test(trimmedValue)) {
                return "Email must be a valid email address";
            }
            return true;
        },
    });
    const onSubmit = async (data: EditContactFormData) => {
        if (!selectedToken) {
            toast.error("Please select a token");
            return;
        }
        if (!selectedGroups.length) {
            toast.error("Please select a group");
            return;
        }
        if (!contactData?.id) {
            toast.error("Contact ID is missing");
            return;
        }
        try {
            const networkPayload: NetworkDto | undefined = selectedNetwork
                ? { name: selectedNetwork.name, chainId: networkChainIds[selectedNetwork.value] ?? 0 }
                : undefined;
            const addressBookData: any = {
                name: data.name.trim(),
                walletAddress: data.walletAddress.trim(),
                groupId: selectedGroups[0]?.id,
                groupIds: selectedGroups.map(g => g.id),
                email: data.email?.trim() || undefined,
                token: selectedToken
                    ? {
                        address: selectedToken.address,
                        symbol: selectedToken.symbol,
                        decimals: (selectedToken as any).decimals ?? 0,
                        name: (selectedToken as any).name ?? selectedToken.symbol,
                    }
                    : undefined,
                network: networkPayload,
            };
            await updateEmployee.mutateAsync(Number(contactData.id), {
                ...addressBookData,
                avatar: avatarSrc,
            } as any);
            toast.success("Contact updated successfully");
            reset();
            setSelectedToken(null);
            setSelectedGroups([]);
            setSelectedNetwork(null);
            onClose();
        }
        catch (error: any) {
            const errorMessage = error.userMessage || error.message || "An unexpected error occurred";
            toast.error(errorMessage);
        }
    };
    const handleTokenSelect = (token: TokenDto | null) => {
        setSelectedToken(token);
    };
    const handleNetworkSelect = (network: {
        icon: string;
        name: string;
        value: string;
    } | null) => {
        setSelectedNetwork(network);
    };
    const handleToggleGroup = (group: CompanyGroupResponseDto) => {
        const next = selectedGroups.some(g => g.id === group.id)
            ? selectedGroups.filter(g => g.id !== group.id)
            : [...selectedGroups, group];
        setSelectedGroups(next);
        setValue("groupId", next[0]?.id, { shouldValidate: true, shouldTouch: true });
    };
    const handleCancel = () => {
        reset();
        setSelectedToken(contactData?.token || null);
        const ids = contactData?.groupIds?.length
            ? contactData.groupIds
            : employeeGroups.filter(group => group.name === contactData?.group).map(g => g.id);
        const matchedGroups = employeeGroups.filter(group => ids.includes(group.id));
        setSelectedGroups(matchedGroups);
        setValue("groupId", matchedGroups[0]?.id ?? undefined, { shouldValidate: true, shouldTouch: true });
        setSelectedNetwork(contactData?.network ? getNetworkFromName(contactData.network.name) : null);
        onClose();
    };
    if (!isOpen)
        return null;
    return (<BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex}>
      <ModalHeader title="Edit contact" icon="/misc/blue-user-hexagon-icon.svg" onClose={onClose}/>
      <div className="bg-background border-2 border-primary-divider rounded-b-2xl w-[500px]">
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 flex flex-col gap-4">
          
          <div className="flex items-center gap-4">
            <EmployeeAvatar src={avatarSrc} seed={contactData?.email || contactData?.name} name={contactData?.name} className="h-16 w-16" textClassName="text-lg"/>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={updateEmployee.isPending} className="rounded-xl border border-primary-divider bg-background px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-app-background disabled:opacity-50">
                  Upload photo
                </button>
                <button type="button" onClick={handleUseDefaultAvatar} disabled={updateEmployee.isPending} className="rounded-xl border border-primary-divider bg-background px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-app-background disabled:opacity-50">
                  Random photo
                </button>
              </div>
              <p className="text-xs text-text-secondary">PNG or JPG, up to 2MB, or pick a random avatar.</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload}/>
          </div>

          <FormInput label="Name" placeholder="Enter contact name" register={nameRegister} error={errors.name?.message} disabled={updateEmployee.isPending} required/>

          <FormInput label="Email" placeholder="Enter email" type="email" register={emailRegister} error={errors.email?.message} disabled={updateEmployee.isPending}/>

          <FormInput label="Wallet address" placeholder="Enter wallet address" register={addressRegister} error={errors.walletAddress?.message} disabled={updateEmployee.isPending} required/>

          <input type="hidden" {...groupIdRegister} value={selectedGroups[0]?.id ?? ""}/>

          
          <div className="bg-background rounded-xl border border-primary-divider">
            <button type="button" onClick={() => openModal(MODAL_IDS.SELECT_NETWORK, { onNetworkSelect: handleNetworkSelect })} className="flex items-center gap-2 px-4 py-2 h-full w-full text-left cursor-pointer" disabled={updateEmployee.isPending}>
              {selectedNetwork && <img src={selectedNetwork.icon} alt="network" className="w-8 h-8"/>}
              <div className="flex-1">
                <p className="text-text-secondary text-sm leading-none">Select network</p>
                <p className="text-text-primary text-base font-medium">{selectedNetwork?.name || "-"}</p>
              </div>
              <img src="/arrow/chevron-down.svg" alt="dropdown" className="w-6 h-6"/>
            </button>
          </div>

          
          <div className="bg-background rounded-xl border border-primary-divider">
            <button type="button" onClick={() => openModal(MODAL_IDS.SELECT_TOKEN, { onTokenSelect: handleTokenSelect })} className="flex items-center gap-2 px-4 py-2 h-full w-full text-left cursor-pointer" disabled={updateEmployee.isPending}>
              {selectedToken && (<img src={selectedToken?.address === "0x07394cbe418daa16e42b87ba67372d4ab4a5df0b05c6e554d158458ce245bc10"
                ? "/token/usdc.svg" : selectedToken?.symbol
                ? `/token/${selectedToken.symbol.toLowerCase()}.svg`
                : "/token/usdc.svg"} alt="token" className="w-8 h-8"/>)}
              <div className="flex-1">
                <p className="text-text-secondary text-sm leading-none">Select token</p>
                <p className="text-text-primary text-base font-medium">{selectedToken?.symbol || "-"}</p>
              </div>
              <img src="/arrow/chevron-down.svg" alt="dropdown" className="w-6 h-6"/>
            </button>
          </div>

          
          <div className="bg-background rounded-xl border border-primary-divider py-2">
            <EmployeeGroupDropdown groups={employeeGroups} selectedGroupIds={selectedGroups.map(g => g.id)} onToggleGroup={handleToggleGroup} disabled={updateEmployee.isPending}/>
          </div>

          
          <div className="flex flex-row gap-3">
            <SecondaryButton text="Cancel" onClick={() => openModal(MODAL_IDS.DISCARD_CHANGES, { onConfirm: handleCancel })} buttonClassName="flex-1" disabled={updateEmployee.isPending} variant="light"/>
            <PrimaryButton text="Update" onClick={handleSubmit(onSubmit)} containerClassName="flex-1" disabled={selectedGroups.length === 0 || !isValid} loading={updateEmployee.isPending}/>
          </div>
        </form>
      </div>
    </BaseModal>);
}
export default EditEmployeeContactModal;
