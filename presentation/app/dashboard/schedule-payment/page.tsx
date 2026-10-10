import { Suspense } from "react";
import { SchedulePaymentContainer } from "@/presentation/components/SchedulePayment/SchedulePaymentContainer";
export default function SchedulePaymentPage() {
    return (<Suspense fallback={<div>Loading...</div>}>
      <SchedulePaymentContainer />
    </Suspense>);
}
