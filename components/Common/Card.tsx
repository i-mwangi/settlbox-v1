import React from "react";
import { Tooltip } from "react-tooltip";

const Card = ({ title, amount, info }: { title: string; amount: string; info?: string }) => {
  // Unique per-instance id so each card's tooltip targets its OWN anchor
  // (a shared id made the tooltip render on the adjacent card).
  const tooltipId = `card-tip-${React.useId().replace(/:/g, "")}`;
  return (
    <div className="relative w-full h-full rounded-xl border border-primary-divider p-5 flex flex-col overflow-hidden">
      <img
        src="/card/background.svg"
        alt=""
        className="pointer-events-none absolute -top-3.5 right-5 w-[152px] h-[154px] opacity-50"
        aria-hidden="true"
      />

      <div className="relative z-[1] flex flex-row gap-2 items-center">
        <span className="text-text-secondary text-sm">{title}</span>
        {info && <img src="/misc/gray-info-icon.svg" alt="info" className="w-3 shrink-0" data-tooltip-id={tooltipId} />}
      </div>
      <span className="num text-text-primary text-3xl relative z-[1]">{amount}</span>

      {info && (
        <Tooltip
          id={tooltipId}
          clickable
          style={{
            zIndex: 20,
            borderRadius: "16px",
            padding: "0",
          }}
          place="bottom"
          noArrow
          border="none"
          opacity={1}
          render={() => (
            <div className="bg-[#444444] p-2 rounded-lg shadow-lg max-w-xs">
              <p className="text-sm text-white ">{info}</p>
            </div>
          )}
        />
      )}
    </div>
  );
};

export default Card;
