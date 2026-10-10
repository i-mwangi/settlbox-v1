"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTitle } from "@/contexts/TitleProvider";

export const Title = () => {
  const pathname = usePathname();
  const { title, showBackArrow, onBackClick, resetTitle } = useTitle();

  useEffect(() => {
    resetTitle();
  }, [pathname]);

  return (
    <div className="flex flex-row gap-2 mx-[24px] pt-1">
      <div className="w-[100%] px-1 py-2 justify-center items-center flex gap-3">
        {showBackArrow && (
          <img src="/arrow/thin-arrow-left.svg" alt="back" className="w-5 cursor-pointer" onClick={onBackClick} />
        )}
        <div className="leading-none text-text-secondary text-lg flex-1">{title}</div>
      </div>
    </div>
  );
};
