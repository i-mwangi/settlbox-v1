"use client";
import { n } from "@/presentation/services/utils/normalizeToken";
import React, { useState, useEffect } from "react";
import { useGetPayrolls, useDeletePayroll } from "@/presentation/services/api/payroll";
import { BaseContainer } from "../Common/BaseContainer";
import { Table } from "../Common/Table";
import PayrollActionTooltip from "../Common/ToolTip/PayrollActionTooltip";
import { Tooltip } from "react-tooltip";
import { CategoryBadge } from "../ContactBook/ContactBookContainer";
import { useGetAllEmployeeGroups } from "@/presentation/services/api/employee";
import { CategoryShapeEnum } from "@/presentation/types/enums";
import { useRouter } from "next/navigation";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { PrimaryButton } from "../Common/PrimaryButton";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { NavArrowRight } from "iconoir-react";
import { useAuth } from "@/presentation/services/auth/context";
import { trackEvent } from "@/presentation/services/analytics/posthog";
import { PostHogEvent } from "@/presentation/types/posthog";
const PayrollContainer = () => {
    const router = useRouter();
    const { user } = useAuth();
    const { setTitle, setShowBackArrow } = useTitle();
    const isAdmin = user?.teamMembership?.role === "ADMIN" || user?.teamMembership?.role === "OWNER";
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const { data: groups } = useGetAllEmployeeGroups();
    const { openModal } = useModal();
    useEffect(() => {
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <span className="font-medium text-text-primary">Payroll</span>
      </div>);
        setShowBackArrow(false);
    }, []);
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1);
        }, 1000);
        return () => clearTimeout(timer);
    }, [search]);
    const { data, isLoading, isError, refetch } = useGetPayrolls({
        page: currentPage,
        limit: rowsPerPage,
        search: debouncedSearch || undefined,
    });
    const deletePayroll = useDeletePayroll();
    const handleEditPayroll = (id: number) => {
        router.push(`/payroll/edit?id=${id}`);
    };
    const handleRemovePayroll = (id: number) => {
        openModal("REMOVE_PAYROLL", {
            payrollId: id,
            payrollOwnerName: data?.payrolls.find(payroll => payroll.id === id)?.employee.name || "",
            onRemove: async () => {
                await deletePayroll.mutateAsync(id);
                trackEvent(PostHogEvent.PAYROLL_DELETED, { payrollId: String(id) });
                refetch();
            },
        });
    };
    const payrollActionRenderer = (rowData: Record<string, unknown>, _index: number) => isAdmin && !rowData.__imported ? (<div className="flex items-center justify-center w-full" onClick={e => e.stopPropagation()}>
        <img src="/misc/three-dot-icon.svg" alt="three dot icon" className="w-6 h-6 cursor-pointer" data-tooltip-id="payroll-action-tooltip" data-tooltip-content={rowData.__id?.toString()}/>
      </div>) : null;
    const payrollData = (data?.payrolls || []).map(payroll => {
        return {
            __id: payroll.id,
            __imported: payroll.imported,
            "Employee name": payroll.employee.name,
            Group: (<div className="flex justify-center items-center">
          <CategoryBadge shape={groups?.find(grp => grp.id === payroll?.employee?.groupId)?.shape || CategoryShapeEnum.CIRCLE} color={groups?.find(grp => grp.id === payroll?.employee?.groupId)?.color || "#35ADE9"} name={groups?.find(grp => grp.id === payroll?.employee?.groupId)?.name || "-"}/>
        </div>),
            Amount: (<div className="flex flex-row justify-center items-center gap-2">
          <img src={`/token/${n(payroll.token.symbol).toLowerCase()}.svg`} alt="token" className="w-5"/>
          <span className="font-bold">
            {payroll.amount} {n(payroll.token.symbol)}
          </span>
        </div>),
            Payday: payroll.paydayDay ? `${payroll.paydayDay}th every month` : "-",
            "Contract Term": <span className="font-bold text-primary-blue">{payroll.imported ? "Imported history" : `${payroll.payrollCycle} Months`}</span>,
            " ": null,
        };
    });
    return (<div className="flex w-full h-full flex-col bg-background">
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Payroll</h1>
          <p className="text-[14px] text-text-secondary">
            Create payroll contracts, review prepared invoices, and approve bills for payment.
          </p>
        </div>
        <PrimaryButton text="New payroll" onClick={() => {
            router.push("/payroll/create");
        }} containerClassName="w-fit" buttonClassName="whitespace-nowrap"/>
      </div>

      <BaseContainer header={<div className="flex w-full justify-end items-center p-5">
            <div className="flex flex-row gap-5">
              
              <form className="bg-app-background border border-primary-divider flex flex-row gap-2 items-center pr-1 pl-3 py-2 rounded-lg w-[300px]" onSubmit={e => {
                e.preventDefault();
                setDebouncedSearch(search);
                setCurrentPage(1);
            }}>
                <div className="flex flex-row gap-2 flex-1">
                  <input type="text" placeholder="Search by name" className="font-medium text-sm text-text-secondary bg-transparent border-none outline-none w-full" value={search} onChange={e => {
                setSearch(e.target.value);
            }}/>
                </div>
                <button type="submit" className="flex flex-row gap-1.5 items-center rounded-lg w-6 h-6 justify-center cursor-pointer">
                  <img src="/wallet-analytics/finder.svg" alt="search" className="w-4 h-4"/>
                </button>
              </form>

              
              <div className="flex items-center gap-2">
                
                
              </div>
            </div>
          </div>} childrenClassName="p-5" containerClassName="w-[calc(100%-3rem)] h-full mx-6 mb-6">
        {isLoading ? (<div className="w-full flex justify-center items-center py-10">Loading payrolls...</div>) : isError ? (<div className="w-full flex justify-center items-center py-10 text-red-500">Failed to load payrolls.</div>) : (<Table headers={["Employee name", "Group", "Amount", "Payday", "Contract Term"]} data={payrollData} actionColumn={true} actionRenderer={payrollActionRenderer} className="w-full" columnWidths={{
                0: "200px",
            }} rowClassName="py-5" headerClassName="py-3" showPagination={true} currentPage={currentPage} onPageChange={setCurrentPage} rowsPerPage={rowsPerPage} onRowsPerPageChange={setRowsPerPage} onRowClick={rowData => {
                if (rowData.__imported) return;
                const payrollId = rowData.__id;
                router.push(`/payroll/detail?id=${payrollId}`);
            }} noDataMessage="No payrolls found"/>)}
      </BaseContainer>

      
      <Tooltip id="payroll-action-tooltip" clickable style={{
            zIndex: 20,
            borderRadius: "16px",
            padding: "0",
        }} place="left" openOnClick noArrow border="none" opacity={1} render={({ content }) => {
            if (!content)
                return null;
            const id = parseInt(content, 10);
            return <PayrollActionTooltip onEdit={() => handleEditPayroll(id)} onRemove={() => handleRemovePayroll(id)}/>;
        }}/>
    </div>);
};
export default PayrollContainer;
