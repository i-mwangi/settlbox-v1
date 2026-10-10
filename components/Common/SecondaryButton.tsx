"use client";
import React from "react";
import { TextureButton } from "../ui/texture-button";

interface SecondaryButtonProps {
  text: string | React.ReactNode;
  icon?: string;
  iconPosition?: "left" | "right";
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  buttonClassName?: string;
  iconClassName?: string;
  disabled?: boolean;
  loading?: boolean;
  variant?: "dark" | "light" | "red";
  closeIcon?: boolean;
  onCloseIconClick?: () => void;
  type?: "button" | "submit" | "reset";
}

const VARIANT_MAP = {
  dark: "primary",
  light: "secondary",
  red: "destructive",
} as const;

export const SecondaryButton = ({
  text,
  icon,
  iconPosition,
  onClick,
  buttonClassName,
  iconClassName,
  disabled,
  variant = "dark",
  closeIcon = false,
  onCloseIconClick,
  type = "button",
}: SecondaryButtonProps) => {
  return (
    <TextureButton
      variant={VARIANT_MAP[variant]}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={buttonClassName || "w-full"}
    >
      {typeof text === "string" ? <span className="text-[14px]">{text}</span> : text}
      {closeIcon && (
        <img
          src="/misc/circle-close-icon.svg"
          alt="Close"
          className="h-4 w-4 cursor-pointer"
          onClick={e => {
            e.stopPropagation();
            onCloseIconClick?.();
          }}
        />
      )}
    </TextureButton>
  );
};
