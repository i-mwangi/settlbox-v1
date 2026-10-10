"use client";
import toast from "react-hot-toast";
import { ActionButton } from "@/presentation/components/Common/ActionButton";
const socialLinks = [
    {
        handle: "@settlbox",
        link: "https://x.com/settlbox",
        icon: "/social/twitter.svg",
    },
];
export default function MobilePage() {
    const handleBackToHome = () => {
        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
        const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
        const isMobileDevice = mobileRegex.test(userAgent) || window.innerWidth <= 768;
        if (isMobileDevice) {
        }
        else {
            window.location.href = "/";
        }
    };
    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            toast.success("Link copied to clipboard!");
        }
        catch (err) {
            console.error("Failed to copy link:", err);
            toast.error("Failed to copy link");
        }
    };
    return (<div className="flex min-h-screen w-full flex-col bg-white absolute top-0 left-0">
      
      <div className="flex items-center gap-[9.319px] mt-5 ml-5">
        <div className="h-7 w-7 shrink-0">
          <img alt="" className="size-full" src="/logo/settlbox-icon.svg"/>
        </div>
        <div className="font-['Schibsted_Grotesk:ExtraBold',_sans-serif] text-[19.96px] font-extrabold leading-[1.2] tracking-[-0.2003px] text-[#2470ff] whitespace-pre shrink-0">
          Settlbox
        </div>
      </div>

      
      <div className="flex flex-1 flex-col items-center justify-center">
        
        <img alt="" className="w-[400px] h-[400px]" src="/mobile/desktop-only.svg"/>

        
        <div className=" w-full">
          <span className="block bg-[#066eff] p-[10px] text-center text-5xl font-bold text-white mix-blend-darken">
            NOW AVAILABLE ON DESKTOP
          </span>
        </div>

        
        <div className="mt-8 w-[250px] text-center font-['Neue_Montreal:Medium',_sans-serif] text-[16px] uppercase leading-none tracking-[-0.32px] text-[#0059ff]">
          For the best experience, please visit this website on a desktop
        </div>

        
        <div className="mt-8 flex w-[300px] flex-row gap-[7px]">
          
          <ActionButton text="Copy link" onClick={handleCopyLink} className="flex-1 h-10"/>
        </div>
      </div>

      
      <div className="mt-5 flex justify-center pb-[34px]">
        <div className="flex w-[329px] flex-row items-center justify-center text-center">
          {socialLinks.map((social, index) => (<div key={social.link} className="flex items-center gap-2">
              <span className="font-['Neue_Montreal:Regular',_sans-serif] text-[14px] leading-none text-[#0059ff] whitespace-pre cursor-pointer hover:underline" onClick={() => window.open(social.link, "_blank")}>
                {social.handle}
              </span>
              <div className={`w-[15px] h-[15px] shrink-0`}>
                <img alt="" className="size-full" src={social.icon}/>
              </div>
              {index < socialLinks.length - 1 && <span>●</span>}
            </div>))}
        </div>
      </div>
    </div>);
}
