import { Suspense } from "react";
import OpenGiftContainer from "@/components/Gift/OpenGiftContainer";

export default function OpenGiftPage() { return <Suspense fallback={<p>Loading gift…</p>}><OpenGiftContainer /></Suspense>; }
