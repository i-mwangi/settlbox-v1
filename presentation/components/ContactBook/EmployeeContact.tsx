import React, { useEffect, useMemo, useState } from "react";
import { Tooltip } from "react-tooltip";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { NavArrowRight, Plus } from "iconoir-react";
import { useRouter, useSearchParams } from "next/navigation";
import { BaseContainer } from "../Common/BaseContainer";
import { TabContainer } from "../Common/TabContainer";
import { Table } from "../Common/Table";
import { EmployeeAvatar } from "../Common/EmployeeAvatar";
import { MultipleContactActionsTooltip } from "../Common/ToolTip/MultipleContactActionsTooltip";
import { useGetAllEmployeeGroups, useGetEmployeesByGroup, useGetAllEmployees, useBulkDeleteEmployees, useUpdateEmployee, getEmployeeGroupIds, } from "@/presentation/services/api/employee";
import { MODAL_IDS } from "@/presentation/types/modal";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { CustomCheckbox } from "../Common/CustomCheckbox";
import { formatAddress } from "@/presentation/services/utils/address";
import { CategoryShapeEnum } from "@/presentation/types/enums";
import { USDC_TOKEN_ADDRESS } from "@/presentation/services/utils/constant";
import { blo } from "blo";
import { identiconSeed } from "@/services/arc/identicon";
import { toast } from "react-hot-toast";
import { useAuth } from "@/presentation/services/auth/context";
import { CategoryTab } from "./ContactBookContainer";
import { MoreActionsTooltip } from "../Common/ToolTip/MoreActionsTooltip";
import { FIAT_COUNTRIES } from "@/presentation/data/fiat-payout";
export const CategoryBadge = ({ color, name }: {
    shape?: CategoryShapeEnum;
    color: string;
    name: string;
}) => {
    if (name === "Client") {
        return <span className="font-semibold text-[#F5A623]">{name}</span>;
    }
    return (<div className="flex flex-row items-center justify-center px-2.5 py-1 rounded-full border w-fit" style={{ borderColor: color, backgroundColor: `${color}20` }}>
      <span className="font-medium text-xs truncate" style={{ color }}>
        {name}
      </span>
    </div>);
};
export const EmployeeContact = () => {
    const router = useRouter();
    const { isAuthenticated, user } = useAuth();
    const isAdmin = user?.teamMembership?.role === "ADMIN" || user?.teamMembership?.role === "OWNER";
    const { openModal } = useModal();
    const [activeTab, setActiveTab] = useState<string>("all");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const { data: groups } = useGetAllEmployeeGroups();
    const searchParams = useSearchParams();
    useEffect(() => {
        const g = searchParams?.get("group");
        if (g) {
            setActiveTab(g);
            setSelectedCategoryId(g);
        }
    }, []);
    const { setTitle } = useTitle();
    const activeGroupLabel = !activeTab || activeTab === "all" || activeTab === "more"
        ? "All groups" : (groups?.find(g => g.id.toString() === activeTab)?.name ?? "All groups");
    useEffect(() => {
        const id = window.setTimeout(() => {
            setTitle(<div className="flex items-center gap-1.5 text-[14px]">
          <span className="text-text-secondary">Contact</span>
          <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
          <span className="text-text-secondary">Employee</span>
          <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
          <span className="font-medium text-text-primary">{activeGroupLabel}</span>
        </div>);
        }, 0);
        return () => window.clearTimeout(id);
    }, [activeGroupLabel, setTitle]);
    const { mutate: deleteEmployees } = useBulkDeleteEmployees();
    const { mutateAsync: updateEmployeeMutate } = useUpdateEmployee();
    const { data: allAddressBooksData, isLoading: isLoadingAllAddressBooks } = useGetAllEmployees(1, 1000, {
        enabled: isAuthenticated,
    });
    const [checkedRows, setCheckedRows] = React.useState<number[]>([]);
    const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
    const [showMultipleActions, setShowMultipleActions] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
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
    const getCategoryId = () => {
        if (activeTab === "all" || activeTab === "more")
            return null;
        return Number(activeTab);
    };
    const { data: categoryAddressBooksData, isLoading: isLoadingCategoryAddressBooks } = useGetEmployeesByGroup(getCategoryId() || 0, 1, 1000);
    const addressBooks = activeTab === "all" ? allAddressBooksData?.data : categoryAddressBooksData?.data;
    const isLoadingAddressBooks = activeTab === "all" ? isLoadingAllAddressBooks : isLoadingCategoryAddressBooks;
    const tabs = useMemo(() => {
            const visiblegroups = groups.slice(0, 3);
            const remainingCount = groups.length - 3;
            const categoryTabs = visiblegroups.map(category => ({
                id: category.id.toString(),
                label: <CategoryTab label={category.name}/>,
            }));
            if (remainingCount > 0) {
                categoryTabs.push({
                    id: "more",
                    label: (<span data-tooltip-id="category-more-tooltip" className="cursor-pointer truncate">
              {remainingCount} more...
            </span>),
                });
            }
            return categoryTabs;
    }, [groups]);
    const handleCategorySelect = (category: {
        id: string | number;
        name: string;
        icon?: string;
    }) => {
        const categoryId = category.id.toString();
        setSelectedCategoryId(categoryId);
        if (groups) {
            const visibleCategoryIds = groups.slice(0, 3).map(cat => cat.id.toString());
            if (!visibleCategoryIds.includes(categoryId)) {
                setActiveTab("more");
            }
            else {
                setActiveTab(categoryId);
            }
        }
        else {
            setActiveTab(categoryId);
        }
    };
    const handleCategoryReorder = (reorderedgroups: {
        id: string | number;
        name: string;
        icon?: string;
    }[]) => {
        if (!groups)
            return;
        const originalgroups = [...groups];
        const firstThreegroups = originalgroups.slice(0, 3);
        const allgroups = [...firstThreegroups, ...reorderedgroups];
        const categoryIds = allgroups.map(cat => Number(cat.id));
    };
    const handleCheckRow = (idx: number) => {
        setCheckedRows(prev => (prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]));
    };
    const handleCheckAll = () => {
        if (checkedRows.length === (addressBooks?.length || 0)) {
            setCheckedRows([]);
        }
        else {
            setCheckedRows(addressBooks?.map((_, idx) => idx) || []);
        }
    };
    const isAllChecked = !!(addressBooks && addressBooks.length > 0 && checkedRows.length === addressBooks.length);
    const handlePay = (contactIndex: number) => {
        const contact = addressBooks?.[contactIndex];
        if (contact) {
            const params = new URLSearchParams();
            params.set("tab", "send");
            params.set("recipient", contact.walletAddress);
            params.set("name", contact.name);
            if (contact.token?.address) {
                params.set("tokenAddress", contact.token.address);
            }
            router.push(`/move-crypto?${params.toString()}`);
            setActiveTooltipId(null);
        }
    };
    const handleEdit = (contactIndex: number) => {
        const contact = addressBooks?.[contactIndex];
        if (contact) {
            const group = groups?.find(cat => cat.id === contact.groupId);
            openModal(MODAL_IDS.EDIT_EMPLOYEE_CONTACT, {
                contactData: {
                    id: contact.id?.toString() || "",
                    name: contact.name,
                    address: contact.walletAddress,
                    email: contact.email || "",
                    group: group?.name || "",
                    token: contact.token,
                    network: contact.network,
                },
            });
            setActiveTooltipId(null);
        }
    };
    const handleExport = (contactIndex: number) => {
        const contact = addressBooks?.[contactIndex];
        if (contact) {
            console.log("Export contact:", contact);
            setActiveTooltipId(null);
        }
    };
    const handleRemove = (contactIndex: number) => {
        const contact = addressBooks?.[contactIndex];
        if (contact) {
            openModal(MODAL_IDS.REMOVE_CONTACT_CONFIRMATION, {
                contactName: contact.name,
                contactAddress: contact.walletAddress,
                onRemove: () => {
                    if (contact.id) {
                        deleteEmployees([contact.id], {
                            onSuccess: () => {
                                toast.success("Contact deleted successfully");
                                setActiveTooltipId(null);
                            },
                            onError: (error: Error) => {
                                console.error("Failed to delete contact:", error);
                                toast.error("Failed to delete contact");
                            },
                        });
                    }
                },
            });
        }
    };
    const handleRowClick = (_rowData: any, index: number) => {
        const contact = addressBooks?.[index] as any;
        if (contact) {
            router.push(`/contact-book/employee/${contact.id}`);
        }
    };
    const handleToggleActive = async (contactIndex: number) => {
        const contact = addressBooks?.[contactIndex] as any;
        if (contact) {
            const newActive = contact.isActive === false ? true : false;
            try {
                await updateEmployeeMutate(contact.id, { isActive: newActive });
                toast.success(newActive ? "Contact enabled" : "Contact disabled");
                setActiveTooltipId(null);
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Contact update failed");
            }
        }
    };
    const handleMultipleExport = () => {
        const selectedContacts = checkedRows.map(index => addressBooks?.[index]).filter(Boolean);
        console.log("Export multiple contacts:", selectedContacts);
        setShowMultipleActions(false);
    };
    const handleMultipleRemove = () => {
        const selectedContacts = checkedRows.map(index => addressBooks?.[index]).filter(Boolean);
        if (selectedContacts.length > 0) {
            const contactIds = selectedContacts.map(contact => contact?.id).filter(Boolean) as number[];
            openModal(MODAL_IDS.REMOVE_CONTACT_CONFIRMATION, {
                contactName: `${selectedContacts.length} contacts`,
                contactAddress: "",
                onRemove: () => {
                    deleteEmployees(contactIds, {
                        onSuccess: () => {
                            toast.success(`${selectedContacts.length} contacts deleted successfully`);
                            setCheckedRows([]);
                            setShowMultipleActions(false);
                        },
                        onError: (error: Error) => {
                            console.error("Failed to delete contacts:", error);
                            toast.error("Failed to delete contacts");
                        },
                    });
                },
            });
        }
    };
    const tableHeaders = [
        <div className="flex justify-center items-center">
      <CustomCheckbox checked={isAllChecked as boolean} onChange={handleCheckAll}/>
    </div>,
        "Name",
        "Type",
        "Group",
        "Payment",
        "Currency",
        "Details",
        "Status",
        "Next Payment",
        " ",
    ];
    const tableData = addressBooks?.map((contact: any, index: number) => {
        const isCrypto = contact.paymentMethod !== "fiat";
        const isContractor = contact.employeeType === "contractor";
        const isActive = contact.isActive !== false;
        const contactGroupIds = getEmployeeGroupIds(contact);
        const contactGroups = (groups || []).filter((cat: any) => contactGroupIds.includes(cat.id));
        const nextPayDate = (() => {
            if (!isActive || !contact.payroll?.paydayDay)
                return null;
            const now = new Date();
            const payday = Number(contact.payroll.paydayDay);
            const next = new Date(now.getFullYear(), now.getMonth(), payday);
            if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate()))
                next.setMonth(next.getMonth() + 1);
            return next;
        })();
        return {
            "header-0": (<div className="flex justify-center items-center">
            <CustomCheckbox checked={checkedRows.includes(index)} onChange={() => handleCheckRow(index)}/>
          </div>),
            Name: (<div className={`flex items-center gap-3 ${!isActive ? "opacity-50" : ""}`}>
            <EmployeeAvatar src={contact.avatar} seed={contact.email || contact.walletAddress || contact.name} name={contact.name} className="w-8 h-8"/>
            <div className="flex flex-col">
              <span className="text-text-primary font-medium text-sm">{contact.name}</span>
              <span className="text-text-secondary text-xs">{contact.email || "-"}</span>
            </div>
          </div>),
            Type: (<div className="flex items-center justify-center">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${isContractor
                    ? "bg-[#E97135]/10 text-[#E97135]" : "bg-[#7D52F4]/10 text-[#7D52F4]"}`}>
              {isContractor ? "Contractor" : "Employee"}
            </span>
          </div>),
            Group: (<div className="flex flex-wrap items-center justify-center gap-1">
            {contactGroups.length === 0 ? (<CategoryBadge color="#35ADE9" name="-"/>) : contactGroups.length > 2 ? (<>
                <CategoryBadge color={contactGroups[0].color || "#35ADE9"} name={contactGroups[0].name}/>
                <span className="rounded-full border border-primary-divider bg-app-background px-2 py-[3px] text-xs font-medium text-text-secondary">
                  +{contactGroups.length - 1}
                </span>
              </>) : (contactGroups.map((g: any) => <CategoryBadge key={g.id} color={g.color || "#35ADE9"} name={g.name}/>))}
          </div>),
            Payment: (<div className="flex items-center justify-center">
            <span className="text-text-primary text-sm">
              {isCrypto ? "Crypto" : "Fiat"}
            </span>
          </div>),
            Currency: (() => {
                if (isCrypto) {
                    const tokenSymbol = contact.token?.address === USDC_TOKEN_ADDRESS ? "USDC" : contact.token?.symbol;
                    const knownTokenIcons: Record<string, string> = {
                        USDC: "/token/usdc.svg",
                        ETH: "/token/eth.svg",
                        BTC: "/token/btc.svg",
                        STRK: "/token/strk.svg",
                    };
                    const tokenIcon = tokenSymbol && knownTokenIcons[tokenSymbol]
                        ? knownTokenIcons[tokenSymbol]
                        : contact.token?.address
                            ? blo(identiconSeed(contact.token.address))
                            : "/token/any-token.svg";
                    return (<div className="flex items-center justify-center gap-1.5">
                {contact.token && (<>
                    <img src={tokenIcon} alt={tokenSymbol || "token"} className="w-5 h-5 object-contain"/>
                    <span className="text-text-primary text-xs font-medium">{tokenSymbol}</span>
                  </>)}
              </div>);
                }
                const fiatCountry = FIAT_COUNTRIES.find(c => c.name === contact.fiatDetails?.country);
                return (<div className="flex items-center justify-center gap-1.5">
              {fiatCountry && <img src={fiatCountry.icon} alt={fiatCountry.name} className="w-6 h-5 rounded-sm object-contain"/>}
              <span className="text-text-primary text-xs font-medium">{contact.fiatDetails?.currency || "USD"}</span>
            </div>);
            })(),
            Details: (() => {
                if (isCrypto) {
                    return (<div className="flex items-center justify-center">
                {contact.walletAddress ? (<span className="text-text-secondary text-xs cursor-pointer hover:text-text-primary" onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(contact.walletAddress);
                                toast.success("Copied to clipboard");
                            }}>
                    {formatAddress(contact.walletAddress)}
                  </span>) : (<span className="text-text-secondary text-xs">-</span>)}
              </div>);
                }
                return (<div className="flex items-center justify-center">
              <span className="text-text-secondary text-xs">{contact.fiatDetails?.bank || "-"}</span>
            </div>);
            })(),
            Status: (<div className="flex items-center justify-center">
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isActive
                    ? "bg-[#1DAF61]/10 text-[#1DAF61]" : "bg-[#E93544]/10 text-[#E93544]"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-[#1DAF61]" : "bg-[#E93544]"}`}/>
              {isActive ? "Active" : "Disabled"}
            </span>
          </div>),
            "Next Payment": (<div className="flex items-center justify-center">
            {nextPayDate ? (<span className="text-text-primary text-xs font-medium">
                {nextPayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>) : (<span className="text-text-secondary text-xs">None</span>)}
          </div>),
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
    }) || [];
    return (<div className="w-full flex-1 min-h-0 flex flex-col">
      
      <div className="w-full flex items-center justify-between gap-2 border-b border-primary-divider px-6 pb-3">
        <div className="flex items-center gap-2">
          <TabContainer tabs={[
            {
                id: "all",
                label: <CategoryTab label="All groups"/>,
            },
            ...tabs,
        ]} activeTab={activeTab} setActiveTab={tab => {
            setActiveTab(tab);
            setSelectedCategoryId(tab);
            setCheckedRows([]);
        }} textSize="sm"/>
          {isAdmin && (<button type="button" className="flex items-center justify-center rounded-lg bg-text-primary p-1.5 text-white cursor-pointer transition-colors hover:bg-text-primary/90" onClick={() => openModal(MODAL_IDS.CREATE_GROUP)} aria-label="Add group">
              <Plus width={16} height={16} strokeWidth={2}/>
            </button>)}
        </div>
        <span className="text-sm text-text-secondary">{addressBooks?.length || 0} contacts</span>
      </div>
      <div className="w-full flex-1 min-h-0 overflow-y-auto p-5">
        <Table data={tableData} headers={tableHeaders} columnWidths={{ "0": "40px" }} selectedRows={checkedRows} showFooter={false} showPagination={true} currentPage={currentPage} rowsPerPage={rowsPerPage} onPageChange={setCurrentPage} onRowsPerPageChange={setRowsPerPage} onRowClick={handleRowClick}/>
      </div>

      
      <Tooltip id="category-more-tooltip" clickable style={{
            zIndex: 30,
            borderRadius: "12px",
            padding: "0",
        }} openOnClick noArrow border="none" opacity={1} render={() => (<></>)}/>

      
      {addressBooks?.map((_, index) => (<Tooltip key={`more-actions-${index}`} id={`more-actions-${index}`} clickable style={{
                zIndex: 30,
                borderRadius: "16px",
                padding: "0",
            }} place="left" openOnClick noArrow border="none" opacity={1} isOpen={activeTooltipId === `more-actions-${index}`} afterHide={() => setActiveTooltipId(null)} render={() => (<div className="tooltip-content">
              <MoreActionsTooltip onPay={() => handlePay(index)} onEdit={() => handleEdit(index)} onExport={() => handleExport(index)} onRemove={() => handleRemove(index)} onToggleActive={() => handleToggleActive(index)} isActive={(addressBooks?.[index] as any)?.isActive !== false}/>
            </div>)}/>))}

      
      <Tooltip id="multiple-actions-tooltip" clickable style={{
            zIndex: 30,
            borderRadius: "16px",
            padding: "0",
        }} place="left" openOnClick noArrow border="none" opacity={1} isOpen={showMultipleActions} afterHide={() => setShowMultipleActions(false)} render={() => (<div className="tooltip-content">
            <MultipleContactActionsTooltip addressCount={checkedRows.length} onExport={handleMultipleExport} onRemove={handleMultipleRemove}/>
          </div>)}/>
    </div>);
};
