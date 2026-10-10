import { useMutation } from "@tanstack/react-query";

export interface UploadResponseDto {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  uploadedAt: string;
}
function useImageUpload() {
  return useMutation({ mutationFn: async (file: File): Promise<UploadResponseDto> => {
    if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error("Choose a PNG or JPEG image of at most 2 MB");
    const body = new FormData();
    body.set("file", file);
    const response = await fetch("/api/uploads", { method: "POST", body });
    const result: unknown = await response.json();
    if (!response.ok) throw new Error(result && typeof result === "object" && "error" in result ? String(result.error) : "Image upload failed");
    return result as UploadResponseDto;
  } });
}
export const useUploadCompanyLogo = useImageUpload;
export const useUploadAvatar = useImageUpload;
export const useUploadMultisigLogo = useImageUpload;
