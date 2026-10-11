"use client";
import React, { useState } from "react";
import SettingHeader from "./SettingHeader";
import { ToggleSwitch } from "../Common/ToggleSwitch";
import toast from "react-hot-toast";
import { SecondaryButton } from "../Common/SecondaryButton";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { workspaceFetch } from "@/presentation/services/api/seeded-workspace";
import type { NotificationPreferences } from "@/services/server/notifications";
interface EmailItem {
    id: string;
    email: string;
}
export default function NotificationSettings() {
    const client=useQueryClient();
    type PreferencesResponse={preferences:NotificationPreferences;canEdit:boolean;deliveryConfigured:boolean};
    const query=useQuery({queryKey:["notification-preferences"],queryFn:()=>workspaceFetch<PreferencesResponse>("/api/notifications/preferences"),retry:false});
    const [saving,setSaving]=useState(false);
    const notificationsEnabled=query.data?.preferences.enabled||false;
    const emailList:EmailItem[]=(query.data?.preferences.emails||[]).map(email=>({id:email,email}));
    const save=async(enabled:boolean,emails:string[])=>{
      if(!query.data || !query.data.canEdit || saving)return false;
      setSaving(true);
      try {
        const result=await workspaceFetch<PreferencesResponse>("/api/notifications/preferences","PATCH",{enabled,emails,revision:query.data.preferences.revision});
        client.setQueryData(["notification-preferences"],result);toast.success("Notification preferences saved");return true;
      }catch(error){toast.error(error instanceof Error?error.message:"Preferences were not saved");await query.refetch();return false;}
      finally{setSaving(false);}
    };
    const [newEmail, setNewEmail] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingEmail, setEditingEmail] = useState("");
    const handleAddEmail = async () => {
        if (!newEmail) {
            toast.error("Please enter an email");
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            toast.error("Please enter a valid email");
            return;
        }
        if(await save(notificationsEnabled,[...emailList.map(item=>item.email),newEmail]))setNewEmail("");
    };
    const handleDeleteEmail = async (id: string) => {
        await save(notificationsEnabled,emailList.filter(item=>item.id!==id).map(item=>item.email));
    };
    const handleStartEdit = (id: string, email: string) => {
        setEditingId(id);
        setEditingEmail(email);
    };
    const handleUpdateEmail = async () => {
        if (!editingEmail || !editingId)
            return;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(editingEmail)) {
            toast.error("Please enter a valid email");
            return;
        }
        if(await save(notificationsEnabled,emailList.map(item=>item.id===editingId?editingEmail:item.email))){setEditingId(null);setEditingEmail("");}
    };
    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingEmail("");
    };
    return (<div className="flex flex-col">
      <SettingHeader icon="/misc/notification-icon.svg" title="Notifications"/>
      {query.error && <p role="alert" className="text-sm">{query.error.message}</p>}
      {query.isLoading && <p className="text-sm">Loading preferences…</p>}
      {query.data && !query.data.deliveryConfigured && <p className="text-sm text-text-secondary mb-3">Preferences are saved. Email delivery is not connected.</p>}

      <fieldset disabled={saving||!query.data?.canEdit} className="border border-primary-divider rounded-2xl p-5 flex flex-col gap-4 min-w-[600px]">
        
        <h2 className="text-lg font-semibold text-text-primary tracking-[-0.36px] leading-none">Email notifications</h2>

        
        <div className="flex items-center justify-between w-full">
          <p className="text-sm text-text-primary leading-5 tracking-[-0.21px]">When i receive new invoice</p>
          <ToggleSwitch key={`${query.data?.preferences.revision}:${saving}`} enabled={notificationsEnabled} onChange={enabled=>{void save(enabled,emailList.map(item=>item.email));}}/>
        </div>

        
        <div className="flex flex-col gap-4 w-full">
          <h3 className="text-sm font-semibold text-text-primary leading-5 tracking-[-0.14px]">
            Email list to receive notifications
          </h3>

          <div className="flex flex-col gap-3 w-full">
            
            {emailList.map(item => (<div key={item.id} className="flex items-center justify-between w-full">
                <p className="text-sm text-text-primary leading-5 tracking-[-0.21px]">{item.email}</p>
                <div className="flex gap-2 items-center justify-center">
                  <button onClick={() => handleDeleteEmail(item.id)} className="w-4 h-4 flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity">
                    <img src="/trashcan-icon.svg" alt="Delete" className="w-4 h-4"/>
                  </button>
                  <button onClick={() => handleStartEdit(item.id, item.email)} className="w-4 h-4 flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity">
                    <img src="/misc/edit-icon.svg" alt="Edit" className="w-4 h-4"/>
                  </button>
                </div>
              </div>))}

            
            {editingId && (<div className="flex flex-col gap-1 w-full">
                <input type="email" value={editingEmail} onChange={e => setEditingEmail(e.target.value)} className="text-sm font-medium text-text-primary leading-5 tracking-[-0.56px] outline-none w-full bg-app-background px-2 py-1 border border-primary-divider rounded-lg" placeholder="Enter email" autoFocus/>
                <div className="flex justify-end gap-2">
                  <SecondaryButton text="Cancel" onClick={handleCancelEdit} variant="light" buttonClassName="w-fit whitespace-nowrap"/>
                  <SecondaryButton text="Update" onClick={handleUpdateEmail} buttonClassName="w-fit whitespace-nowrap"/>
                </div>
              </div>)}

            
            {!editingId && (<div className="flex flex-col gap-1 w-full">
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddEmail()} className="text-sm font-medium text-text-primary leading-5 tracking-[-0.56px] outline-none w-full bg-app-background px-2 py-1 border border-primary-divider rounded-lg" placeholder="Enter new email"/>
                <div className="flex justify-end">
                  <SecondaryButton text="Update" onClick={handleAddEmail} buttonClassName="w-fit whitespace-nowrap"/>
                </div>
              </div>)}

            
            <button onClick={() => {
            const input = document.querySelector<HTMLInputElement>("input[type=\"email\"]");
            input?.focus();
        }} className="border border-primary-divider rounded-lg px-3 py-1.5 flex items-center justify-center gap-2 w-full hover:bg-app-background transition-colors">
              <img src="/misc/circle-plus-icon.svg" alt="Add" className="w-5 h-5"/>
              <span className="text-sm font-medium text-text-primary tracking-[-0.56px] leading-5">Add item</span>
            </button>
          </div>
        </div>
      </fieldset>
    </div>);
}
