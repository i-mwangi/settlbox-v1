import { usePathname } from "next/navigation";
import React from "react";
export default function Welcome() {
    const route = usePathname();
    return (<div className="flex flex-col w-full h-full justify-end items-start bg-[#194BFA] rounded-[20px] p-10 relative gap-20 overflow-hidden">
      
      <img src="/logo/settlbox-light.svg" alt="Logo" className="w-[120px] absolute top-10 left-10"/>

      
      <img src="/login/half-circle-login-background-1.svg" alt="" className="w-[520px] absolute top-0 right-0"/>
      <img src="/login/half-circle-login-background-2.svg" alt="" className="w-[400px] absolute bottom-0 left-0"/>
      <img src="/login/square-icon.svg" alt="" className="w-20 absolute top-60 left-60"/>
      <img src="/login/square-icon.svg" alt="" className="w-10 absolute bottom-[360px] right-60"/>

      {route === "/login" && (<div className="relative w-full flex justify-center items-center flex-1">
          <img src="/login/payroll-mockup.svg" alt="payroll-mockup" className="&#xD;&#xA;              w-full&#xD;&#xA;              min-[1200px]:w-[850px]&#xD;&#xA;            "/>
        </div>)}

      <div className="&#xD;&#xA;          flex flex-col justify-center items-start text-left mb-8&#xD;&#xA;          w-[260px]&#xD;&#xA;          min-[1024px]:w-[280px]&#xD;&#xA;          min-[1080px]:w-[300px]&#xD;&#xA;          min-[1140px]:w-[320px]&#xD;&#xA;          min-[1200px]:w-[340px]&#xD;&#xA;          min-[1280px]:w-[360px]&#xD;&#xA;          min-[1366px]:w-[380px]&#xD;&#xA;          min-[1440px]:w-[400px]&#xD;&#xA;          min-[1536px]:w-[420px]&#xD;&#xA;          min-[1600px]:w-[440px]&#xD;&#xA;          min-[1680px]:w-[460px]&#xD;&#xA;          min-[1792px]:w-[480px]&#xD;&#xA;          min-[1920px]:w-[500px]&#xD;&#xA;          min-[2048px]:w-[540px]&#xD;&#xA;          min-[2560px]:w-[600px]&#xD;&#xA;        ">
        <h1 className="&#xD;&#xA;            text-white font-normal mb-4&#xD;&#xA;            text-[24px] leading-[32px]&#xD;&#xA;            min-[1024px]:text-[26px] min-[1024px]:leading-[34px]&#xD;&#xA;            min-[1080px]:text-[28px] min-[1080px]:leading-[36px]&#xD;&#xA;            min-[1140px]:text-[30px] min-[1140px]:leading-[38px]&#xD;&#xA;            min-[1200px]:text-[32px] min-[1200px]:leading-[40px]&#xD;&#xA;            min-[1280px]:text-[34px] min-[1280px]:leading-[42px]&#xD;&#xA;            min-[1366px]:text-[36px] min-[1366px]:leading-[44px]&#xD;&#xA;            min-[1440px]:text-[38px] min-[1440px]:leading-[48px]&#xD;&#xA;            min-[1536px]:text-[40px] min-[1536px]:leading-[50px]&#xD;&#xA;            min-[1600px]:text-[40px] min-[1600px]:leading-[52px]&#xD;&#xA;            min-[1680px]:text-[40px] min-[1680px]:leading-[52px]&#xD;&#xA;            min-[1920px]:text-[44px] min-[1920px]:leading-[56px]&#xD;&#xA;            min-[2560px]:text-[48px] min-[2560px]:leading-[60px]&#xD;&#xA;          ">
          Payment solution built for Web3 businesses
        </h1>
        <span className="&#xD;&#xA;            text-white font-light&#xD;&#xA;            text-[14px]&#xD;&#xA;            min-[1024px]:text-[14px]&#xD;&#xA;            min-[1140px]:text-[15px]&#xD;&#xA;            min-[1280px]:text-[16px]&#xD;&#xA;            min-[1440px]:text-[17px]&#xD;&#xA;            min-[1600px]:text-[18px]&#xD;&#xA;            min-[1920px]:text-[20px]&#xD;&#xA;            min-[2560px]:text-[22px]&#xD;&#xA;          ">
          All-in-one financial platform for Web3 companies to pay, receive, earn, and spend while preserving on-chain
          privacy
        </span>
      </div>
    </div>);
}
