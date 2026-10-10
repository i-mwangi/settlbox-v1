"use client";
import React, { Suspense } from "react";
import ReimbursementReviewContainer from "@/presentation/components/Reimbursement/ReimbursementReviewContainer";
const ReimbursementReviewPage = () => {
    return (<Suspense fallback={<div className="w-full h-full flex items-center justify-center">
          <span className="text-text-secondary">Loading review...</span>
        </div>}>
      <ReimbursementReviewContainer />
    </Suspense>);
};
export default ReimbursementReviewPage;
