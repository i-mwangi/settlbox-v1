"use client";
import React, { Suspense } from "react";
import PaymentLinkDetailContainer from "@/presentation/components/PaymentLink/PaymentLinkDetailContainer";
const PaymentLinkDetailPage = () => {
    return (<Suspense fallback={<div>Loading...</div>}>
      <PaymentLinkDetailContainer />
    </Suspense>);
};
export default PaymentLinkDetailPage;
