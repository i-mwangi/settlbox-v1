"use client";
export default function ReviewHeading({id,title,onClose,disabled=false}:{id:string;title:string;onClose:()=>void;disabled?:boolean}){
 return <header className="-mx-6 -mt-6 mb-5 flex items-center justify-between gap-3 rounded-t-2xl border-b border-primary-divider bg-background px-4 py-4"><div className="flex items-center gap-3"><img src="/sidebar/ai-assistant.svg" alt="" className="h-5 w-5"/><h2 id={id} className="text-[16px] font-bold text-text-primary">{title}</h2></div><button type="button" disabled={disabled} onClick={onClose} aria-label="Close review" className="flex h-7 w-7 items-center justify-center rounded-lg border-b-2 border-secondary-divider bg-app-background disabled:opacity-50"><img src="/misc/close-icon.svg" alt="" className="h-4 w-4"/></button></header>;
}
