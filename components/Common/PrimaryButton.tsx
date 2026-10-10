"use client";
import React from "react";
import { TextureButton } from "../ui/texture-button";

interface PrimaryButtonProps {
  text: string;
  icon?: string;
  iconPosition?: "left" | "right";
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  containerClassName?: string;
  buttonClassName?: string;
  iconClassName?: string;
  disabled?: boolean;
  loading?: boolean;
}

export const PrimaryButton = ({
  text,
  icon,
  iconPosition,
  onClick,
  type = "button",
  containerClassName,
  buttonClassName,
  iconClassName,
  disabled,
  loading,
}: PrimaryButtonProps) => {
  return (
    <TextureButton
      variant="primary"
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${containerClassName || "w-full"} ${buttonClassName || ""}`}
    >
      {loading ? (
        <img src="/loading-square.gif" alt="loading" className="w-5 h-5" />
      ) : (
        <span className="text-[14px]">{text}</span>
      )}
    </TextureButton>
  );
};
