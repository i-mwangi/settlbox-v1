"use client";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/presentation/services/auth/context";
import FieldInput from "@/presentation/components/Common/Input/FieldInput";
import { CompanyTypeDropdown } from "../Common/Dropdown/CompanyTypeDropdown";
import { CountryDropdown } from "../Common/Dropdown/CountryDropdown";
import { CompanyInfoDto as CompanyInfo } from "@/presentation/types/dto/company";
import toast from "react-hot-toast";
import SettingHeader from "./SettingHeader";
import { useGetMyCompany, useUpdateCompany, useDeleteCompany } from "@/presentation/services/api/company";
import { useUploadCompanyLogo } from "@/presentation/services/api/upload";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { MODAL_IDS } from "@/presentation/types/modal";
import { SecondaryButton } from "../Common/SecondaryButton";
import { useRouter } from "next/navigation";
interface CompanyFormData {
    companyName: string;
    companyType: string;
    country: string;
    state: string;
    city: string;
    address1: string;
    address2: string;
    taxId: string;
    postalCode: string;
    registrationNumber: string;
}
export default function CompanySettings() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const { openModal } = useModal();
    const [selectedCompanyType, setSelectedCompanyType] = useState<string>("");
    const [selectedCountry, setSelectedCountry] = useState<string>("");
    const [hasChanges, setHasChanges] = useState(false);
    const { mutate: updateCompany, isPending: isUpdating } = useUpdateCompany();
    const deleteCompanyMutation = useDeleteCompany();
    const uploadLogoMutation = useUploadCompanyLogo();
    const { data: myCompany } = useGetMyCompany();
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const isAdmin = user?.teamMembership?.role === "ADMIN" || user?.teamMembership?.role === "OWNER";
    const isOwner = user?.teamMembership?.role === "OWNER";
    const handleDeleteCompany = () => {
        openModal(MODAL_IDS.DELETE_COMPANY, {
            companyName: myCompany?.companyName || "",
            onDelete: async () => {
                try {
                    await deleteCompanyMutation.mutateAsync();
                    toast.success("Company deleted successfully");
                    await logout();
                    window.location.href = "/login";
                }
                catch (error: any) {
                    toast.error(error?.message || "Failed to delete company");
                }
            },
        });
    };
    const { register, handleSubmit, watch, setValue, reset, formState: { isDirty }, } = useForm<CompanyFormData>({
        defaultValues: {
            companyName: "",
            companyType: "",
            country: "",
            state: "",
            city: "",
            address1: "",
            address2: "",
            taxId: "",
            postalCode: "",
            registrationNumber: "",
        },
    });
    useEffect(() => {
        if (user?.teamMembership?.company) {
            const company = user.teamMembership.company as CompanyInfo;
            reset({
                companyName: company.companyName || "",
                companyType: company.companyType || "",
                country: company.country || "",
                state: "",
                city: company.city || "",
                address1: company.address1 || "",
                address2: company.address2 || "",
                taxId: company.taxId || "",
                postalCode: company.postalCode || "",
                registrationNumber: company.registrationNumber || "",
            });
            setSelectedCompanyType(company.companyType || "");
            setSelectedCountry(company.country || "");
        }
    }, [user, reset]);
    useEffect(() => {
        setHasChanges(isDirty);
    }, [isDirty]);
    const onSubmit = async (data: CompanyFormData) => {
        try {
            updateCompany({
                companyName: data.companyName,
                companyType: data.companyType as any,
                country: data.country,
                address1: data.address1,
                address2: data.address2 || undefined,
                city: data.city,
                postalCode: data.postalCode,
                logo: logoUrl || undefined,
            }, {
                onSuccess: () => {
                    toast.success("Company settings updated successfully");
                    setHasChanges(false);
                },
                onError: (error: any) => {
                    const errorMessage = error?.message || "Failed to update company settings";
                    toast.error(errorMessage);
                },
            });
        }
        catch (error) {
            toast.error("Failed to update company settings");
        }
    };
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        if (!["image/jpeg", "image/png"].includes(file.type)) {
            toast.error("Only JPEG and PNG files are allowed");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error("File size must be at most 2 MB");
            return;
        }
        setLogoFile(file);
        try {
            const result = await uploadLogoMutation.mutateAsync(file);
            setLogoUrl(result.url);
            setHasChanges(true);
            toast.success("Logo uploaded successfully");
        }
        catch (error) {
            toast.error("Failed to upload logo");
            setLogoFile(null);
        }
    };
    useEffect(() => {
        if (myCompany?.logo && myCompany && !logoUrl) {
            setLogoUrl(myCompany.logo);
        }
    }, [myCompany]);
    return (<div className="flex flex-col">
      <SettingHeader icon="/misc/company-icon.svg" title="Company" buttonText="Save Changes" onButtonClick={handleSubmit(onSubmit)} buttonDisabled={!hasChanges || isUpdating || !isAdmin} buttonClassName="w-fit"/>

      
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-0">
        
        <div className="flex flex-col gap-3 pb-6 border-b border-primary-divider">
          
          <div className="w-full flex items-center justify-center">
            <div className="flex gap-4 items-center flex-col">
              <label className="bg-[#ebf4ff] border border-primary-blue border-dashed rounded-full shrink-0 w-[86px] h-[86px] flex items-center justify-center relative overflow-hidden cursor-pointer hover:bg-blue-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50" style={{
            pointerEvents: !isAdmin || uploadLogoMutation.isPending ? "none" : "auto",
            opacity: !isAdmin || uploadLogoMutation.isPending ? 0.5 : 1,
        }}>
                {logoUrl ? (<img src={logoUrl} alt="Logo" className="w-full h-full object-cover"/>) : (<img src="/misc/blue-upload-icon.svg" alt="Upload" className="w-6 h-6"/>)}
                <input type="file" accept="image/jpeg,image/png" onChange={handleLogoUpload} disabled={uploadLogoMutation.isPending || !isAdmin} className="hidden"/>
              </label>
              <label className="border border-primary-divider rounded-lg px-3 py-1.5 w-fit font-barlow font-medium text-[14px] text-text-primary leading-[20px] tracking-[-0.56px] hover:bg-base-container-sub-background transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" style={{
            pointerEvents: uploadLogoMutation.isPending || !isAdmin ? "none" : "auto",
            opacity: uploadLogoMutation.isPending || !isAdmin ? 0.5 : 1,
        }}>
                {uploadLogoMutation.isPending ? "Uploading..." : "Upload photo"}
                <input type="file" accept="image/jpeg,image/png" onChange={handleLogoUpload} disabled={uploadLogoMutation.isPending || !isAdmin} className="hidden"/>
              </label>
            </div>
          </div>

          
          <FieldInput label="Company name" placeholder="Enter your company name" readOnly={!isAdmin} {...register("companyName", { required: true })}/>

          
          <CompanyTypeDropdown size="compact" selectedCompanyType={selectedCompanyType} disabled={!isAdmin} onCompanyTypeSelect={value => {
            setSelectedCompanyType(value);
            setValue("companyType", value, { shouldDirty: true });
        }}/>

          
          <CountryDropdown size="compact" selectedCountry={selectedCountry} disabled={!isAdmin} onCountrySelect={value => {
            setSelectedCountry(value);
            setValue("country", value, { shouldDirty: true });
        }}/>

          
          <div className="flex gap-2 w-full">
            <div className="flex-1">
              <FieldInput label="State" placeholder="Select state" readOnly={!isAdmin} {...register("state")}/>
            </div>
            <div className="flex-1">
              <FieldInput label="City" placeholder="Select city" readOnly={!isAdmin} {...register("city")}/>
            </div>
          </div>

          
          <FieldInput label="Address 1" placeholder="Enter address 1" readOnly={!isAdmin} {...register("address1")}/>

          
          <FieldInput label="Address 2" placeholder="Enter address 2" readOnly={!isAdmin} {...register("address2")}/>
        </div>

        
        <div className="flex flex-col gap-3 pt-6">
          
          <FieldInput label="Tax ID" placeholder="Enter tax ID" readOnly={!isAdmin} {...register("taxId")}/>

          
          <FieldInput label="Postal code" placeholder="e.g. 70000" readOnly={!isAdmin} {...register("postalCode")}/>

          
          <FieldInput label="Company registration number" placeholder="e.g. 8683949" readOnly={!isAdmin} {...register("registrationNumber")}/>
        </div>
      </form>

      
      {isOwner && (<div className="flex flex-col gap-3 pt-6 mt-6 border-t border-primary-divider">
          <p className="font-medium text-sm text-text-secondary tracking-[-0.56px] leading-5">Danger Zone</p>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="font-medium text-sm text-text-primary tracking-[-0.56px] leading-5">Delete company</p>
              <p className="text-xs text-text-secondary">
                Permanently remove your company and all associated data.
              </p>
            </div>
            <SecondaryButton text="Delete Company" variant="red" onClick={handleDeleteCompany} buttonClassName="w-fit whitespace-nowrap"/>
          </div>
        </div>)}
    </div>);
}
