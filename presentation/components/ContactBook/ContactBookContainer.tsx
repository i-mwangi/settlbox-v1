import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { EmployeeContact } from "./EmployeeContact";
import { CategoryShapeEnum } from "@/presentation/types/enums";
import { PageHeader } from "../Common/PageHeader";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { MODAL_IDS } from "@/presentation/types/modal";
import { PrimaryButton } from "../Common/PrimaryButton";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { NavArrowRight } from "iconoir-react";
export const CategoryTab = ({ label }: {
    label: React.ReactNode;
}) => {
    return <span className="truncate">{label}</span>;
};
export const CategoryBadge = ({ shape = CategoryShapeEnum.CIRCLE, color, name }: {
    shape?: CategoryShapeEnum;
    color: string;
    name: string;
}) => {
    if (name === "Client") {
        return <span className="font-semibold text-[#F5A623]">{name}</span>;
    }
    return (<div className="flex flex-row items-center justify-center px-2.5 py-1 rounded-full border w-fit" style={{ borderColor: color, backgroundColor: `${color}20` }}>
      <span className="font-medium text-xs truncate" style={{ color: color }}>
        {name}
      </span>
    </div>);
};
const ContactBookContainer = () => {
    const { openModal } = useModal();
    const { setTitle, setShowBackArrow } = useTitle();
    const router = useRouter();
    useEffect(() => {
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <button type="button" onClick={() => router.push("/contact-book")} className="text-text-secondary transition-colors cursor-pointer hover:text-text-primary">
          Contact
        </button>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <span className="font-medium text-text-primary">Employee</span>
      </div>);
        setShowBackArrow(false);
    }, []);
    return (<div className="flex w-full h-full flex-col bg-background">
      
      <div className="w-full flex items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Employee</h1>
          <p className="text-[14px] text-text-secondary">Manage your team members and their payment schedules.</p>
        </div>
        <PrimaryButton text="Add employee" onClick={() => openModal(MODAL_IDS.CREATE_EMPLOYEE_CONTACT)} containerClassName="w-fit" buttonClassName="whitespace-nowrap"/>
      </div>

      <EmployeeContact />
    </div>);
};
export default ContactBookContainer;
