import React, { useEffect, useState } from "react";
import { Tooltip } from "react-tooltip";
import { useRouter } from "next/navigation";
import { Table, CellContent } from "../Common/Table";
import { FloatingAction } from "../Bill/FloatingAction";
import { SecondaryButton } from "../Common/SecondaryButton";
import { MultipleContactActionsTooltip } from "../Common/ToolTip/MultipleContactActionsTooltip";
import { useGetClients, useDeleteClient } from "@/presentation/services/api/client";
import { CustomCheckbox } from "../Common/CustomCheckbox";
import { MODAL_IDS } from "@/presentation/types/modal";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import toast from "react-hot-toast";
import { useAuth } from "@/presentation/services/auth/context";
import { useForm } from "react-hook-form";
import { MoreActionsTooltip } from "../Common/ToolTip/MoreActionsTooltip";
export const ClientContact = () => {
    const router = useRouter();
    const { isAuthenticated, user } = useAuth();
    const isAdmin = user?.teamMembership?.role === "ADMIN" || user?.teamMembership?.role === "OWNER";
    const { openModal } = useModal();
    const deleteClientMutation = useDeleteClient();
    const { data: clientsResponse, isLoading: isLoadingClients } = useGetClients({ page: 1, limit: 1000 }, { enabled: isAuthenticated });
    const [checkedRows, setCheckedRows] = React.useState<number[]>([]);
    const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
    const [showMultipleActions, setShowMultipleActions] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const { register, watch } = useForm({
        defaultValues: {
            searchTerm: "",
        },
    });
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest("[data-tooltip-id]") && !target.closest(".tooltip-content")) {
                setActiveTooltipId(null);
                setShowMultipleActions(false);
            }
        };
        if (activeTooltipId || showMultipleActions) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [activeTooltipId, showMultipleActions]);
    const clients = clientsResponse?.data || [];
    const isLoadingAddressBooks = isLoadingClients;
    const handleCheckRow = (idx: number) => {
        setCheckedRows(prev => (prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]));
    };
    const handleCheckAll = () => {
        if (checkedRows.length === (clients?.length || 0)) {
            setCheckedRows([]);
        }
        else {
            setCheckedRows(clients?.map((_, idx) => idx) || []);
        }
    };
    const isAllChecked = !!(clients && clients.length > 0 && checkedRows.length === clients.length);
    const handlePay = (clientIndex: number) => {
        const client = clients[clientIndex];
        if (client) {
            toast.success("Client: " + client.companyName);
            setActiveTooltipId(null);
        }
    };
    const handleEdit = (clientIndex: number) => {
        const client = clients[clientIndex];
        if (client) {
            openModal(MODAL_IDS.EDIT_CLIENT_CONTACT, {
                clientData: {
                    uuid: client.uuid,
                    email: client.email,
                    companyName: client.companyName,
                    companyType: client.companyType,
                    country: client.country,
                    city: client.city,
                    address1: client.address1,
                    address2: client.address2,
                    taxId: client.taxId,
                    postalCode: client.postalCode,
                    registrationNumber: client.registrationNumber,
                },
            });
            setActiveTooltipId(null);
        }
    };
    const handleExport = (clientIndex: number) => {
        const client = clients[clientIndex];
        if (client) {
            console.log("Export client:", client);
            setActiveTooltipId(null);
        }
    };
    const handleRemove = (clientIndex: number) => {
        const client = clients[clientIndex];
        if (client) {
            openModal(MODAL_IDS.REMOVE_CONTACT_CONFIRMATION, {
                contactName: client.companyName,
                contactAddress: client.email,
                onRemove: () => {
                    deleteClientMutation.mutate(client.uuid, {
                        onSuccess: () => {
                            toast.success("Client deleted successfully");
                            setActiveTooltipId(null);
                        },
                        onError: (error: Error) => {
                            console.error("Failed to delete client:", error);
                            toast.error("Failed to delete client");
                        },
                    });
                },
            });
        }
    };
    const handleMultipleExport = () => {
        const selectedClients = checkedRows.map(index => clients[index]).filter(Boolean);
        console.log("Export multiple clients:", selectedClients);
        setShowMultipleActions(false);
    };
    const handleMultipleRemove = () => {
        const selectedClients = checkedRows.map(index => clients[index]).filter(Boolean);
        if (selectedClients.length > 0) {
            openModal(MODAL_IDS.REMOVE_CONTACT_CONFIRMATION, {
                contactName: `${selectedClients.length} clients`,
                contactAddress: "",
                onRemove: () => {
                    selectedClients.forEach(client => {
                        deleteClientMutation.mutate(client.uuid, {
                            onSuccess: () => {
                                if (selectedClients.indexOf(client) === selectedClients.length - 1) {
                                    toast.success(`${selectedClients.length} clients deleted successfully`);
                                    setCheckedRows([]);
                                    setShowMultipleActions(false);
                                }
                            },
                            onError: (error: Error) => {
                                console.error("Failed to delete client:", error);
                                toast.error("Failed to delete client");
                            },
                        });
                    });
                },
            });
        }
    };
    const handleReorder = (reorderedData: Record<string, CellContent>[]) => {
        toast.success("Reordering is not available for clients");
    };
    const tableHeaders = [
        <div className="flex justify-center items-center">
      <CustomCheckbox checked={isAllChecked as boolean} onChange={handleCheckAll}/>
    </div>,
        "Company",
        "Type",
        "Location",
        "Added",
        " ",
    ];
    const tableData = clients.map((client: any, index: number) => {
        const addedDate = client.createdAt
            ? new Date(client.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "-";
        const location = [client.city, client.country].filter(Boolean).join(", ") || "-";
        return {
            "header-0": (<div className="flex justify-center items-center">
          <CustomCheckbox checked={checkedRows.includes(index)} onChange={() => handleCheckRow(index)}/>
        </div>),
            Company: (<div className="flex flex-col text-left">
          <span className="text-text-primary font-medium text-sm">{client.companyName}</span>
          <span className="text-text-secondary text-xs">{client.email || "-"}</span>
        </div>),
            Type: client.companyType ? (<span className="px-2.5 py-1 rounded-full text-xs font-medium bg-app-background border border-primary-divider text-text-primary">
          {client.companyType}
        </span>) : (<span className="text-text-secondary text-xs">-</span>),
            Location: <span className="text-text-secondary text-sm">{location}</span>,
            Added: <span className="text-text-secondary text-xs">{addedDate}</span>,
            " ": isAdmin ? (<div className="flex justify-center items-center">
          <div data-tooltip-id={checkedRows.length > 0 ? "multiple-actions-tooltip" : `more-actions-${index}`} className="cursor-pointer" onClick={e => {
                    e.stopPropagation();
                    if (checkedRows.length > 0) {
                        setShowMultipleActions(!showMultipleActions);
                        setActiveTooltipId(null);
                    }
                    else {
                        setActiveTooltipId(activeTooltipId === `more-actions-${index}` ? null : `more-actions-${index}`);
                        setShowMultipleActions(false);
                    }
                }}>
            <img src="/misc/three-dot-icon.svg" alt="more actions" className="w-6 h-6"/>
          </div>
        </div>) : null,
        };
    });
    return (<>
      
      <div className="flex w-full items-center justify-between gap-2 border-b border-primary-divider px-6 pb-3">
        <div className="flex h-10 w-[300px] flex-row items-center gap-2 rounded-lg border border-primary-divider bg-app-background pl-3 pr-1">
          <input type="text" placeholder="Search by name" className="w-full flex-1 border-none bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary" {...register("searchTerm")}/>
          <button type="button" className="flex h-6 w-6 items-center justify-center rounded-lg cursor-pointer">
            <img src="/wallet-analytics/finder.svg" alt="search" className="w-4 h-4"/>
          </button>
        </div>
        <span className="text-sm text-text-secondary">{clients.length || 0} clients</span>
      </div>

      
      <div className="w-full p-5">
        <Table data={tableData} headers={tableHeaders} draggable={false} columnWidths={{ "0": "40px", "30px": "20px" }} onDragEnd={handleReorder} selectedRows={checkedRows} showFooter={false} showPagination={true} currentPage={currentPage} rowsPerPage={rowsPerPage} onPageChange={setCurrentPage} onRowsPerPageChange={setRowsPerPage}/>
      </div>

      
      <Tooltip id="category-more-tooltip" clickable style={{
            zIndex: 30,
            borderRadius: "12px",
            padding: "0",
        }} openOnClick noArrow border="none" opacity={1} render={() => (<></>)}/>

      
      {clients.map((_, index) => (<Tooltip key={`more-actions-${index}`} id={`more-actions-${index}`} clickable style={{
                zIndex: 30,
                borderRadius: "16px",
                padding: "0",
            }} place="left" openOnClick noArrow border="none" opacity={1} isOpen={activeTooltipId === `more-actions-${index}`} afterHide={() => setActiveTooltipId(null)} render={() => (<div className="tooltip-content">
              <MoreActionsTooltip onPay={() => handlePay(index)} onEdit={() => handleEdit(index)} onExport={() => handleExport(index)} onRemove={() => handleRemove(index)}/>
            </div>)}/>))}

      
      <Tooltip id="multiple-actions-tooltip" clickable style={{
            zIndex: 30,
            borderRadius: "16px",
            padding: "0",
        }} place="left" openOnClick noArrow border="none" opacity={1} isOpen={showMultipleActions} afterHide={() => setShowMultipleActions(false)} render={() => (<div className="tooltip-content">
            <MultipleContactActionsTooltip addressCount={checkedRows.length} onExport={handleMultipleExport} onRemove={handleMultipleRemove}/>
          </div>)}/>

      {checkedRows.length > 0 && (<FloatingAction selectedCount={checkedRows.length} allSelected={isAllChecked} onDeselectAll={() => setCheckedRows([])} totalLabel={`Total (${checkedRows.length} ${checkedRows.length === 1 ? "client" : "clients"})`} actionButtons={<SecondaryButton text={`Remove ${checkedRows.length} ${checkedRows.length === 1 ? "client" : "clients"}`} variant="red" disabled={deleteClientMutation.isPending} buttonClassName="w-fit whitespace-nowrap rounded-xl" onClick={handleMultipleRemove}/>}/>)}
    </>);
};
