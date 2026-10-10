"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BusinessRecord,
  BusinessRecordInput,
  BusinessRecordKind,
} from "@/types/business";
import type { EvmAddress, WalletReference } from "@/types/finance";
import { PrimaryButton } from "@/components/Common/PrimaryButton";
import { ArcNetworkIcon } from "@/components/Common/ArcNetworkIcon";
import { PaymentLinkLoadError } from "@/components/PaymentLink/PaymentLinkLoadError";
import { PaymentLinkRequestError } from "@/services/api/payment-link";
import { useBusinessRecords } from "@/services/api/business-records";
import toast from "react-hot-toast";
import { useUploadAvatar } from "@/services/api/upload";
import { useAuth } from "@/services/auth/context";
import { Badge, BadgeStatus } from "@/components/Common/Badge";
import { TabContainer } from "@/components/Common/TabContainer";
import { BusinessRecordPresentation } from "./BusinessRecordPresentation";

async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  requestId?: string,
): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(requestId ? { "Idempotency-Key": requestId } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result: unknown = await response.json();
  if (!response.ok)
    throw new PaymentLinkRequestError(
      typeof result === "object" &&
        result !== null &&
        "error" in result &&
        typeof result.error === "string"
        ? result.error
        : "Business request failed",
      response.status,
    );
  return result as T;
}

const headings = {
  invoice: "Invoices",
  bill: "Bills",
  payroll: "Payroll",
  reimbursement: "Reimbursements",
};

export function BusinessWorkspace({
  kind,
  initialCreate = false,
  recordId,
  initialEdit = false,
}: {
  kind: BusinessRecordKind;
  initialCreate?: boolean;
  recordId?: string;
  initialEdit?: boolean;
}) {
  const client = useQueryClient();
  const { user } = useAuth();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN";
  const upload = useUploadAvatar();
  const saving = useRef(false);
  const draftRequest = useRef<{
    id: string;
    input: BusinessRecordInput;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState<BusinessRecord | null>(null);
  const [showForm, setShowForm] = useState(initialCreate);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const records = useBusinessRecords();
  const treasury = useQuery({
    queryKey: ["business-treasury"],
    enabled: !records.error && !!records.data,
    queryFn: () =>
      request<{
        wallet: WalletReference;
        policy: { allowedRecipients: EvmAddress[] };
      }>("/api/treasury"),
  });
  const mutation = useMutation({
    mutationFn: ({
      path,
      method,
      body,
      requestId,
    }: {
      path: string;
      method: string;
      body: unknown;
      requestId?: string;
    }) => request<BusinessRecord>(path, method, body, requestId),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["business-records"] });
      await client.invalidateQueries({ queryKey: ["payment-links"] });
    },
  });
  const items = (records.data || []).filter((record) => record.kind === kind);
  const selected = items.find((record) => record.id === recordId);
  useEffect(() => {
    if (initialEdit && selected?.status === "draft") {
      setEditing(selected);
      setShowForm(true);
    }
  }, [initialEdit, selected]);
  const visible = items.filter(
    (record) =>
      (!recordId || record.id === recordId) &&
      (activeStatus === "all" || record.status === activeStatus) &&
      `${record.title} ${record.counterparty}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true;
    setIsSaving(true);
    const form = new FormData(event.currentTarget);
    let input: BusinessRecordInput = {
      kind,
      title: String(form.get("title")),
      counterparty: String(form.get("counterparty")),
      amount: String(form.get("amount")),
      dueDate: String(form.get("dueDate")),
      description: String(form.get("description")),
      recipient: (kind === "invoice"
        ? treasury.data?.wallet.address || ""
        : String(form.get("recipient"))) as EvmAddress,
    };
    try {
      if (!editing && draftRequest.current) input = draftRequest.current.input;
      else {
        const receipts = form
          .getAll("receipts")
          .filter(
            (value): value is File => value instanceof File && value.size > 0,
          );
        if (receipts.length + (editing?.receiptUrls?.length || 0) > 5)
          throw new Error("Attach up to five receipt images");
        input.receiptUrls = [...(editing?.receiptUrls || [])];
        for (const file of receipts)
          input.receiptUrls.push((await upload.mutateAsync(file)).url);
        if (!editing) draftRequest.current = { id: crypto.randomUUID(), input };
      }
      await mutation.mutateAsync({
        path: editing
          ? `/api/business-records/${editing.id}`
          : "/api/business-records",
        method: editing ? "PATCH" : "POST",
        body: editing ? { action: "edit", data: input } : input,
        requestId: editing ? undefined : draftRequest.current?.id,
      });
      draftRequest.current = null;
      setShowForm(false);
      setEditing(null);
      toast.success("Record saved");
    } catch (error) {
      if (
        error instanceof PaymentLinkRequestError &&
        error.status === 400 &&
        !error.message.startsWith("Request ID")
      )
        draftRequest.current = null;
      toast.error(
        error instanceof Error ? error.message : "Record could not be saved",
      );
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  }

  function action(
    record: BusinessRecord,
    name: "issue" | "pay" | "refresh" | "cancel",
  ) {
    mutation.mutate(
      {
        path: `/api/business-records/${record.id}`,
        method: "PATCH",
        body: { action: name },
      },
      { onError: (error: Error) => toast.error(error.message) },
    );
  }

  const fieldClass =
    "w-full rounded-lg border border-primary-divider bg-background p-3 text-text-primary";
  return (
    <section className="flex w-full flex-col gap-5 p-6 text-text-primary">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{headings[kind]}</h1>
          <p className="text-sm text-text-secondary">
            {kind === "invoice"
              ? "Create invoices and collect verified USDC payments."
              : "Manage payments from your company treasury on Arc Testnet."}
          </p>
        </div>
        {canManage && (
          <PrimaryButton
            text={`Create ${kind === "payroll" ? "payroll payment" : kind}`}
            disabled={!!records.error}
            containerClassName="w-fit"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          />
        )}
      </header>
      {records.error ? (
        <PaymentLinkLoadError
          error={records.error}
          returnTo={`/${kind}`}
          retry={() => {
            void records.refetch();
          }}
        />
      ) : (
        <>
          {recordId && (
            <Link href={`/${kind}`}>
              Back to {headings[kind].toLowerCase()}
            </Link>
          )}
          {selected && (
            <a
              href={`/api/business-records/${selected.id}/document`}
              target="_blank"
              rel="noreferrer"
              className="text-primary-blue"
            >
              Print / Save PDF
            </a>
          )}
          {selected && <BusinessRecordPresentation record={selected} />}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: `All ${headings[kind].toLowerCase()}`,
                value: items.length,
              },
              {
                label: kind === "invoice" ? "Sent" : "Pending",
                value: items.filter(
                  (record) =>
                    !["draft", "paid", "cancelled", "failed"].includes(
                      record.status,
                    ),
                ).length,
              },
              {
                label: "Draft",
                value: items.filter((record) => record.status === "draft")
                  .length,
              },
              {
                label: "Paid",
                value: items.filter((record) => record.status === "paid")
                  .length,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-primary-divider p-4"
                style={{
                  backgroundImage: "url(/card/background.svg)",
                  backgroundPosition: "right",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "30%",
                }}
              >
                <p className="text-sm text-text-secondary">{stat.label}</p>
                <p className="mt-2 text-2xl">{stat.value}</p>
              </div>
            ))}
          </div>
          {showForm && canManage && (
            <form
              onSubmit={save}
              className="grid gap-4 rounded-xl border border-primary-divider p-5 md:grid-cols-2"
            >
              {!!draftRequest.current && !editing && (
                <p className="md:col-span-2">
                  Retrying this save uses its original details and uploaded
                  receipts. Check the records list before starting another
                  draft.
                </p>
              )}
              <fieldset
                disabled={isSaving || (!editing && !!draftRequest.current)}
                className="contents"
              >
                <label>
                  Title
                  <input
                    name="title"
                    required
                    maxLength={160}
                    defaultValue={editing?.title}
                    className={fieldClass}
                  />
                </label>
                <label>
                  {kind === "invoice"
                    ? "Customer"
                    : kind === "payroll" || kind === "reimbursement"
                      ? "Employee"
                      : "Vendor"}
                  <input
                    name="counterparty"
                    required
                    maxLength={160}
                    defaultValue={editing?.counterparty}
                    className={fieldClass}
                  />
                </label>
                <label>
                  Amount (USDC)
                  <input
                    name="amount"
                    required
                    inputMode="decimal"
                    pattern="[0-9]+(\.[0-9]{1,18})?"
                    defaultValue={editing?.amount}
                    className={fieldClass}
                  />
                </label>
                <label>
                  {kind === "payroll" ? "Pay date" : "Due date"}
                  <input
                    name="dueDate"
                    type="date"
                    required
                    defaultValue={editing?.dueDate}
                    className={fieldClass}
                  />
                </label>
                {kind !== "invoice" && (
                  <label className="md:col-span-2">
                    Recipient Arc wallet
                    <input
                      name="recipient"
                      required
                      pattern="0x[0-9a-fA-F]{40}"
                      placeholder="0x…"
                      defaultValue={editing?.recipient}
                      className={fieldClass}
                    />
                    <span className="text-sm text-text-secondary">
                      Treasury recipient allowlist and payment limits apply.
                    </span>
                  </label>
                )}
                {kind === "invoice" && (
                  <p className="break-all text-sm text-text-secondary md:col-span-2">
                    Payments go to your company treasury:{" "}
                    {treasury.data?.wallet.address || "Loading treasury…"}
                  </p>
                )}
                <label className="md:col-span-2">
                  Description
                  <textarea
                    name="description"
                    required
                    maxLength={4000}
                    defaultValue={editing?.description}
                    className={fieldClass}
                  />
                </label>
                {kind === "reimbursement" && (
                  <label className="md:col-span-2">
                    Receipt images · up to five PNG/JPEG files
                    <input
                      name="receipts"
                      type="file"
                      accept="image/png,image/jpeg"
                      multiple
                      disabled={isSaving}
                    />
                  </label>
                )}
              </fieldset>
              <div className="flex gap-3">
                <PrimaryButton
                  text={
                    isSaving
                      ? "Saving…"
                      : draftRequest.current
                        ? "Retry save"
                        : "Save draft"
                  }
                  type="submit"
                  disabled={isSaving || (kind === "invoice" && !treasury.data)}
                />
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    draftRequest.current = null;
                    setShowForm(false);
                    setEditing(null);
                  }}
                >
                  Close
                </button>
              </div>
            </form>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary-divider pb-3">
            <div className="overflow-x-auto">
              <TabContainer
                tabs={[
                  { id: "all", label: "All" },
                  {
                    id: "issued",
                    label: kind === "invoice" ? "Sent" : "Issued",
                  },
                  { id: "draft", label: "Draft" },
                  { id: "paid", label: "Paid" },
                  { id: "awaiting_approval", label: "Awaiting approval" },
                  { id: "cancelled", label: "Cancelled" },
                ]}
                activeTab={activeStatus}
                setActiveTab={setActiveStatus}
                textSize="sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                aria-label="Search records"
                placeholder={`Search ${headings[kind].toLowerCase()}…`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="rounded-lg border border-primary-divider bg-app-background px-3 py-2 text-sm"
              />
              <button
                onClick={() => {
                  void records.refetch();
                }}
                className="text-sm text-text-secondary"
              >
                Refresh
              </button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-primary-divider">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-primary-divider bg-app-background">
                  {[
                    "Title",
                    "Counterparty",
                    "Amount",
                    "Due date",
                    "Chain",
                    "Status",
                    "Actions",
                  ].map((label) => (
                    <th key={label} className="p-3">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center">
                      Loading records…
                    </td>
                  </tr>
                ) : !visible.length ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  visible.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-primary-divider"
                    >
                      <td className="p-3">
                        <Link
                          href={`/${kind}/detail?id=${record.id}`}
                          className="font-medium"
                        >
                          {record.title}
                        </Link>
                      </td>
                      <td className="p-3">{record.counterparty}</td>
                      <td className="whitespace-nowrap p-3">
                        <span className="flex items-center gap-2">
                          <img
                            src="/token/usdc.svg"
                            alt="USDC"
                            className="h-5 w-5"
                          />
                          <span className="num">{record.amount} USDC</span>
                        </span>
                      </td>
                      <td className="p-3">{record.dueDate}</td>
                      <td className="p-3">
                        <span className="flex items-center gap-2">
                          <ArcNetworkIcon />
                          Arc Testnet
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge
                          status={
                            record.status === "paid"
                              ? BadgeStatus.SUCCESS
                              : record.status === "failed"
                                ? BadgeStatus.FAIL
                                : ["draft", "cancelled"].includes(record.status)
                                  ? BadgeStatus.NEUTRAL
                                  : BadgeStatus.AWAITING
                          }
                          text={record.status.replaceAll("_", " ")}
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-3">
                          {canManage && record.status === "draft" && (
                            <>
                              <button
                                disabled={mutation.isPending}
                                onClick={() => {
                                  setEditing(record);
                                  setShowForm(true);
                                }}
                              >
                                Edit
                              </button>
                              <button
                                disabled={mutation.isPending}
                                onClick={() =>
                                  action(
                                    record,
                                    kind === "invoice" ? "issue" : "pay",
                                  )
                                }
                              >
                                {kind === "invoice"
                                  ? "Issue invoice"
                                  : "Submit payment"}
                              </button>
                            </>
                          )}
                          {canManage &&
                            kind === "invoice" &&
                            record.status === "processing" && (
                              <button
                                disabled={mutation.isPending}
                                onClick={() => action(record, "issue")}
                              >
                                Finish issuing
                              </button>
                            )}
                          {canManage &&
                            kind !== "invoice" &&
                            record.status === "processing" && (
                              <button
                                disabled={mutation.isPending}
                                onClick={() => action(record, "pay")}
                              >
                                Check submission
                              </button>
                            )}
                          {canManage &&
                            ["draft", "issued"].includes(record.status) && (
                              <button
                                disabled={mutation.isPending}
                                onClick={() => action(record, "cancel")}
                              >
                                Cancel
                              </button>
                            )}
                          {canManage &&
                            !["draft", "cancelled", "paid"].includes(
                              record.status,
                            ) && (
                              <button
                                disabled={mutation.isPending}
                                onClick={() => action(record, "refresh")}
                              >
                                Check settlement
                              </button>
                            )}
                          {record.status === "awaiting_approval" && (
                            <Link href="/testnet-treasury">
                              Review approval
                            </Link>
                          )}
                          {record.paymentLinkCode && (
                            <Link href={`/payment/${record.paymentLinkCode}`}>
                              Payment link
                            </Link>
                          )}
                          {record.transactionHash && (
                            <a
                              target="_blank"
                              rel="noreferrer"
                              href={`https://explorer.testnet.arc.io/tx/${record.transactionHash}`}
                            >
                              View transaction
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {kind === "payroll" && (
            <p className="text-sm text-text-secondary">
              Each payroll record represents one employee payment. Future pay
              dates do not submit payments automatically.
            </p>
          )}
        </>
      )}
    </section>
  );
}
