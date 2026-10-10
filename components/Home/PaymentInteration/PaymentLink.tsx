"use client";
import { PaymentLinkLoadError } from "@/components/PaymentLink/PaymentLinkLoadError";
import type { BusinessPaymentLink } from "@/services/server/payment-links";
import React, { useState, useMemo, useEffect } from "react";
import { Table } from "../../Common/Table";
import { CustomCheckbox } from "../../Common/CustomCheckbox";
import { Badge, BadgeStatus } from "../../Common/Badge";
import { SecondaryButton } from "../../Common/SecondaryButton";
import { useRouter } from "next/navigation";
import {
  useGetPaymentLinks,
  useDeletePaymentLinks,
  useUpdatePaymentLinkOrder,
  useActivatePaymentLink,
  useDeactivatePaymentLink,
} from "@/services/api/payment-link";
import { PaymentLink as PaymentLinkType, PaymentLinkStatus } from "@settlbox/types/dto/payment-link";
import { blo } from "blo";
import { identiconSeed } from "@/services/arc/identicon";
import toast from "react-hot-toast";
import { getAppUrl } from "@/services/utils/getAppUrl";
import { PaymentLinkActionsTooltip } from "../../PaymentLink/PaymentLinkActionsTooltip";
import { Tooltip } from "react-tooltip";
import { FloatingAction } from "../../Bill/FloatingAction";

interface PaymentLinkProps {
  checkedRows: number[];
  setCheckedRows: React.Dispatch<React.SetStateAction<number[]>>;
}

export const PaymentLink: React.FC<PaymentLinkProps> = ({ checkedRows, setCheckedRows }) => {
  const router = useRouter();
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);

  // Payment Links API hooks
  const { data: paymentLinks = [], isLoading, error, refetch } = useGetPaymentLinks();
  const deletePaymentLinksMutation = useDeletePaymentLinks();
  const updateOrderMutation = useUpdatePaymentLinkOrder();
  const activatePaymentLinkMutation = useActivatePaymentLink();
  const deactivatePaymentLinkMutation = useDeactivatePaymentLink();

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside any tooltip trigger or tooltip content
      if (!target.closest("[data-tooltip-id]") && !target.closest(".tooltip-content")) {
        setActiveTooltipId(null);
      }
    };

    if (activeTooltipId) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeTooltipId]);

  const { allLinks, activeLinks, inactiveLinks } = useMemo(() => {
    // Sort by order field
    const sortedLinks = [...paymentLinks].sort((a, b) => a.order - b.order);

    const active = sortedLinks.filter(link => link.status === PaymentLinkStatus.ACTIVE);
    const inactive = sortedLinks.filter(link => link.status === PaymentLinkStatus.DEACTIVATED);

    return {
      allLinks: sortedLinks,
      activeLinks: active,
      inactiveLinks: inactive,
    };
  }, [paymentLinks]);

  const handleDragEnd = async (newData: any[]) => {
    try {
      // Extract the IDs from the reordered data
      const linkIds = newData.map((item: any) => item.id);
      await updateOrderMutation.mutateAsync({ linkIds });
      toast.success("Payment links reordered successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to reorder payment links");
    }
  };

  const handleSelectRow = (index: number) => {
    setCheckedRows(prev => (prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]));
  };

  const handleCheckAll = () => {
    if (checkedRows.length === allLinks.length) {
      setCheckedRows([]);
    } else {
      setCheckedRows(allLinks.map((_, index) => index));
    }
  };

  const isAllChecked = allLinks.length > 0 && checkedRows.length === allLinks.length;

  // Tooltip action handlers
  const handleEdit = (linkIndex: number) => {
    const link = allLinks[linkIndex];
    if (link) {
      router.push(`/payment-link/edit?code=${link.code}`);
      setActiveTooltipId(null);
    }
  };

  const handleToggleStatus = (linkIndex: number, isActive: boolean) => {
    const link = allLinks[linkIndex];
    if (link) {
      // `isActive` is the new state coming from the ToggleSwitch: true => activate, false => deactivate
      const mutation = isActive ? activatePaymentLinkMutation : deactivatePaymentLinkMutation;
      mutation.mutate(link.code, {
        onSuccess: () => {
          toast.success(`Payment link ${isActive ? "activated" : "deactivated"} successfully`);
          setActiveTooltipId(null);
        },
        onError: (error: any) => {
          toast.error(error?.message || `Failed to ${isActive ? "activate" : "deactivate"} payment link`);
        },
      });
    }
  };

  const handleRemove = async (linkIndex: number) => {
    const link = allLinks[linkIndex];
    if (!link) {
      toast.error("Payment link not found");
      return;
    }

    try {
      const response = await deletePaymentLinksMutation.mutateAsync([link.code]);
      toast.success(response.message || "Payment link deleted successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete payment link");
    }
  };

  const handleBulkDelete = async () => {
    if (checkedRows.length === 0) {
      toast.error("No payment links selected");
      return;
    }

    const codesToDelete = checkedRows.map(index => allLinks[index].code);

    try {
      const response = await deletePaymentLinksMutation.mutateAsync(codesToDelete);
      toast.success(response.message || `${response.deletedCount} payment link(s) deleted successfully`);
      setCheckedRows([]); // Clear selection after successful deletion
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete payment links");
    }
  };

  const paymentLinkTableData = useMemo(() => {
    return allLinks.map((link: BusinessPaymentLink) => ({
      id: link.id, // Add id field for drag and drop
      "header-0": (
        <div className="flex justify-center items-center">
          <CustomCheckbox
            checked={checkedRows.includes(allLinks.indexOf(link))}
            onChange={() => handleSelectRow(allLinks.indexOf(link))}
          />
        </div>
      ),
      Link: (
        <span className="text-text-primary text-sm leading-none underline">
          {getAppUrl()}/payment/{link.code}
        </span>
      ),
      Title: link.title,
      Timestamp: new Date(link.createdAt).toLocaleString("sv-SE", { hour12: false }),
      Amount: (
        <div className="flex justify-center items-center gap-1">
          <span className="text-text-primary leading-none">{link.amount}</span>
          <img
            src={`/token/${(link.acceptedTokens?.[0]?.symbol || "any-token").toLowerCase()}.svg`}
            onError={(e) => { (e.target as HTMLImageElement).src = blo(identiconSeed(link.acceptedTokens?.[0]?.address || "")); }}
            alt={link.acceptedTokens?.[0]?.symbol}
            className="w-4 h-4"
          />
        </div>
      ),
      Status: (
        <Badge
          status={link.status === PaymentLinkStatus.ACTIVE ? BadgeStatus.SUCCESS : BadgeStatus.NEUTRAL}
          text={link.status}
          className="!py-2"
        />
      ),
      Action: (
        <div className="flex justify-center items-center">
          <SecondaryButton
            text="Copy Link"
            onClick={() => {
              const url = `${getAppUrl()}/payment/${link.code}`;
              navigator.clipboard.writeText(url);
              toast.success("Payment link copied to clipboard");
            }}
            icon="/misc/thin-copy-icon.svg"
            iconPosition="left"
            buttonClassName="w-[130px] "
          />
        </div>
      ),
      " ": (
        <div className="flex justify-center items-center">
          <div
            data-tooltip-id={`payment-link-actions-${allLinks.indexOf(link)}`}
            className="cursor-pointer"
            onClick={e => {
              e.stopPropagation();
              setActiveTooltipId(
                activeTooltipId === `payment-link-actions-${allLinks.indexOf(link)}`
                  ? null
                  : `payment-link-actions-${allLinks.indexOf(link)}`,
              );
            }}
          >
            <img src="/misc/three-dot-icon.svg" alt="More" className="w-6 h-6" />
          </div>
        </div>
      ),
    }));
  }, [allLinks, checkedRows, deletePaymentLinksMutation.isPending]);

  const paymentLinkTableHeaders = [
    <div className="flex justify-center items-center">
      <CustomCheckbox checked={isAllChecked as boolean} onChange={handleCheckAll} />
    </div>,
    "Link",
    "Title",
    "Timestamp",
    "Amount",
    "Status",
    "Action",
    " ",
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <img src="/loading-square.gif" alt="loading" className="w-12 h-12" />
      </div>
    );
  }

  if (error) {
    return (
      <PaymentLinkLoadError error={error} retry={() => { void refetch(); }} />
    );
  }

  return (
    <>
      <Table
        headers={paymentLinkTableHeaders}
        data={paymentLinkTableData}
        draggable={true}
        onDragEnd={handleDragEnd}
        actionColumn={false}
        showFooter={false}
        selectedRows={checkedRows}
        columnWidths={{
          "1": "330px",
          "3": "180px",
          "6": "80px",
          "7": "50px",
        }}
      />

      {checkedRows.length > 0 && (
        <FloatingAction
          selectedCount={checkedRows.length}
          allSelected={isAllChecked}
          onDeselectAll={() => setCheckedRows([])}
          totalLabel={`Total (${checkedRows.length} ${checkedRows.length === 1 ? "link" : "links"})`}
          actionButtons={
            <SecondaryButton
              text={`Remove ${checkedRows.length} ${checkedRows.length === 1 ? "link" : "links"}`}
              variant="red"
              buttonClassName="w-fit whitespace-nowrap rounded-xl"
              onClick={handleBulkDelete}
            />
          }
        />
      )}

      {/* Payment Link Actions Tooltips */}
      {allLinks.map((link, index) => (
        <Tooltip
          key={`payment-link-actions-${index}`}
          id={`payment-link-actions-${index}`}
          clickable
          style={{
            zIndex: 30,
            borderRadius: "16px",
            padding: "0",
          }}
          place="left"
          openOnClick
          noArrow
          border="none"
          opacity={1}
          isOpen={activeTooltipId === `payment-link-actions-${index}`}
          afterHide={() => setActiveTooltipId(null)}
          render={() => (
            <div className="tooltip-content">
              <PaymentLinkActionsTooltip
                link={link}
                onEdit={() => handleEdit(index)}
                onToggleStatus={(isActive: boolean) => handleToggleStatus(index, isActive)}
                onRemove={() => handleRemove(index)}
              />
            </div>
          )}
        />
      ))}
    </>
  );
};
