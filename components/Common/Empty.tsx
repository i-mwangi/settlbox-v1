import React from "react";

export const Empty = ({
  icon = "/no-request-icon.svg",
  title = "No request",
  className,
}: {
  icon?: string;
  title?: string;
  className?: string;
}) => {
  return (
    <div
      className={`flex flex-col gap-1 justify-center items-center self-stretch rounded-xl border border-primary-divider bg-app-background min-h-[100px] max-sm:h-20 ${className}`}
    >
      <img src={icon} alt={title} className="shrink-0 w-6 h-6 opacity-50" />
      <p className="text-sm tracking-tight leading-4 text-text-secondary">{title}</p>
    </div>
  );
};
