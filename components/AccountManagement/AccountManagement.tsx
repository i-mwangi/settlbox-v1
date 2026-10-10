"use client";

import TeamAccountContainer from "@/components/Setting/TeamSetting/TeamAccountContainer";
import MemberTab from "@/components/Setting/TeamSetting/MemberTab";

export function AccountManagement() {
  return <section className="w-full space-y-5 p-6 text-text-primary"><h1 className="text-2xl font-semibold">Account management</h1><TeamAccountContainer /><MemberTab /></section>;
}

export default AccountManagement;
