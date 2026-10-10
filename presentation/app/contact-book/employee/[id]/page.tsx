"use client";
import PayrollDetail from "@/presentation/components/Payroll/PayrollDetail";
import React, { Suspense } from "react";
const EmployeeDetailPage = () => {
    return (<Suspense fallback={<div className="w-full h-full flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary-blue border-t-transparent rounded-full animate-spin"/>
        </div>}>
      <PayrollDetail />
    </Suspense>);
};
export default EmployeeDetailPage;
