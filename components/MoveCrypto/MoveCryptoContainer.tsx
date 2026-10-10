"use client";

import { useState } from "react";
import { ArcTransferForm } from "@/components/Send/ArcTransferForm";
import { Receive } from "./Receive";
export default function MoveCryptoContainer() {
  const [tab, setTab] = useState<"send" | "receive">("send");
  return <section className="w-full p-6 text-text-primary"><div className="flex gap-4"><button onClick={() => setTab("send")} aria-pressed={tab === "send"}>Send</button><button onClick={() => setTab("receive")} aria-pressed={tab === "receive"}>Receive</button></div>{tab === "send" ? <ArcTransferForm /> : <Receive />}</section>;
}
