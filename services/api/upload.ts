"use client";

import { useMutation } from "@tanstack/react-query";
export interface UploadResponseDto { url: string; fileName: string; fileSize: number; mimeType: string; storagePath: string; uploadedAt: string }
function useUpload() { return useMutation({ mutationFn: async (file: File): Promise<UploadResponseDto> => { const form = new FormData(); form.set("file", file); const response = await fetch("/api/uploads", { method: "POST", body: form }); const value: unknown = await response.json(); if (!response.ok) throw new Error(value && typeof value === "object" && "error" in value ? String(value.error) : "Image upload failed"); return value as UploadResponseDto; } }); }
export const useUploadCompanyLogo = useUpload;
export const useUploadAvatar = useUpload;
export const useUploadMultisigLogo = useUpload;
