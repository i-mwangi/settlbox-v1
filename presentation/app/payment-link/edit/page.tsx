"use client";
import EditPaymentLinkContainer from "@/presentation/components/PaymentLink/EditPaymentLinkContainer";
import React, { Suspense } from "react";
const EditPaymentLinkPage = () => {
    return (<Suspense fallback={<div>Loading...</div>}>
      <EditPaymentLinkContainer />
    </Suspense>);
};
export default EditPaymentLinkPage;
