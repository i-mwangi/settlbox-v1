"use client";
import React from "react";
import { TextureButton } from "../ui/texture-button";

interface ActionButtonProps {
  text: string;
  type?: "accept" | "deny" | "neutral";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  buttonType?: "button" | "submit" | "reset";
  icon?: string;
  iconPosition?: "left" | "right";
}

const VARIANT_MAP = {
  accept: "accent",
  deny: "destructive",
  neutral: "secondary",
} as const;

export const ActionButton: React.FC<ActionButtonProps> = ({
  text,
  type = "accept",
  disabled = false,
  loading = false,
  onClick,
  className = "",
  buttonType = "button",
  icon,
  iconPosition = "left",
}) => {
  return (
    <TextureButton
      variant={VARIANT_MAP[type]}
      type={buttonType}
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
    >
      {loading ? (
        <img src="/loading-square.gif" alt="loading" className="h-6 w-6" />
      ) : (
        <>
          {icon && iconPosition === "left" && <img src={icon} alt="" className="h-4 w-4" />}
          <span className="text-[14px]">{text}</span>
          {icon && iconPosition === "right" && <img src={icon} alt="" className="h-4 w-4" />}
        </>
      )}
    </TextureButton>
  );
};
