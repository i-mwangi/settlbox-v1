"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { BusinessRecordKind } from "@/types/business";
import { BusinessWorkspace } from "./BusinessWorkspace";

function RecordDetails({ kind, edit }: { kind: BusinessRecordKind; edit: boolean }) {
  const params = useSearchParams();
  return <BusinessWorkspace kind={kind} recordId={params.get("id") || params.get("billUuid") || params.get("uuid") || "missing"} initialEdit={edit} />;
}

export function BusinessRecordDetail({ kind, edit = false }: { kind: BusinessRecordKind; edit?: boolean }) {
  return <Suspense fallback={<p className="p-6 text-text-secondary">Loading record…</p>}><RecordDetails kind={kind} edit={edit} /></Suspense>;
}
