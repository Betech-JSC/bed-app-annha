import { UploadedFile } from "@/components/UniversalFileUploader";

// Legacy support: Keep ImageItem type for backward compatibility
export interface ImageItem {
  id?: string;
  url: string;
  attachment_id?: number;
}

/**
 * Convert files array to JSON string for storage
 */
export function filesToJson(files: UploadedFile[]): string {
  if (!files || files.length === 0) {
    return JSON.stringify([]);
  }
  
  // Extract URLs and attachment IDs
  const fileData = files.map((file) => ({
    url: file.url || file.file_url || file.location,
    attachment_id: file.attachment_id || file.id,
    id: file.id || file.attachment_id,
    original_name: file.original_name,
    type: file.type,
  }));
  
  return JSON.stringify(fileData);
}

/**
 * Parse JSON string to files array
 */
export function jsonToFiles(jsonString: string | null | undefined): UploadedFile[] {
  if (!jsonString) {
    return [];
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    
    // Handle both array of strings (URLs) and array of objects
    if (Array.isArray(parsed)) {
      return parsed.map((item, index) => {
        if (typeof item === "string") {
          // Legacy format: array of URLs
          return {
            id: index,
            url: item,
            file_url: item,
            location: item,
            type: "image" as const,
          };
        } else {
          // New format: array of objects
          return {
            id: item.id || item.attachment_id || index,
            attachment_id: item.attachment_id || item.id,
            url: item.url || item.file_url || item.location || item,
            file_url: item.url || item.file_url || item.location || item,
            location: item.url || item.file_url || item.location || item,
            original_name: item.original_name || item.file_name,
            type: item.type || "image",
          };
        }
      });
    }
    
    return [];
  } catch (error) {
    console.error("Error parsing files JSON:", error);
    return [];
  }
}

/**
 * Convert files array to simple URLs array (for backward compatibility)
 */
export function filesToUrls(files: UploadedFile[]): string[] {
  return files.map((file) => file.url || file.file_url || file.location || "");
}

/**
 * Convert URLs array to UploadedFile array
 */
export function urlsToFiles(urls: string[]): UploadedFile[] {
  return urls.map((url, index) => ({
    id: index,
    url,
    file_url: url,
    location: url,
    type: "image" as const,
  }));
}

// ==================================================================
// LEGACY SUPPORT: Keep old functions for backward compatibility
// ==================================================================

/**
 * @deprecated Use filesToJson instead
 * Convert images array to JSON string for storage
 */
export function imagesToJson(images: ImageItem[]): string {
  const files: UploadedFile[] = images.map((img) => ({
    id: typeof img.id === "string" ? parseInt(img.id) || 0 : img.id || 0,
    attachment_id: img.attachment_id,
    url: img.url,
    file_url: img.url,
    location: img.url,
    type: "image" as const,
  }));
  return filesToJson(files);
}

/**
 * @deprecated Use jsonToFiles instead
 * Parse JSON string to images array
 */
export function jsonToImages(jsonString: string | null | undefined): ImageItem[] {
  const files = jsonToFiles(jsonString);
  return files.map((file) => ({
    id: file.id?.toString() || file.attachment_id?.toString(),
    url: file.url || file.file_url || file.location || "",
    attachment_id: file.attachment_id || file.id,
  }));
}

/**
 * @deprecated Use filesToUrls instead
 * Convert images array to simple URLs array (for backward compatibility)
 */
export function imagesToUrls(images: ImageItem[]): string[] {
  return images.map((img) => img.url);
}

/**
 * @deprecated Use urlsToFiles instead
 * Convert URLs array to ImageItem array
 */
export function urlsToImages(urls: string[]): ImageItem[] {
  return urls.map((url, index) => ({
    id: `img_${index}`,
    url,
  }));
}

