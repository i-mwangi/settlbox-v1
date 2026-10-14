"use client";
import { TextureButton, type TextureButtonProps } from "../ui/texture-button";
export default function FinanceButton({className="",variant,children,...props}:TextureButtonProps){
 const primary=className.includes("bg-[#1b1b1b]");
 const classes=className.split(/\s+/).filter(value=>!/^p[xy]?-[0-9]+$/.test(value)&&value!=="bg-[#1b1b1b]"&&value!=="text-white"&&value!=="underline").join(" ");
 return <TextureButton {...props} variant={variant||(primary?"primary":"secondary")} className={`w-auto disabled:opacity-50 disabled:cursor-not-allowed ${classes}`}><span className="text-[14px]">{children}</span></TextureButton>;
}
