import { ImageItem } from "@/components/ImagePicker";

/**
 * Convert images array to JSON string for storage
 */
export function imagesToJson(images: ImageItem[]): string {
  if (!images || images.length === 0) {
    return JSON.stringify([]);
  }
  
  // Extract URLs and attachment IDs
  const imageData = images.map((img) => ({
    url: img.url,
    attachment_id: img.attachment_id,
    id: img.id,
  }));
  
  return JSON.stringify(imageData);
}

/**
 * Parse JSON string to images array
 */
export function jsonToImages(jsonString: string | null | undefined): ImageItem[] {
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
            id: `img_${index}`,
            url: item,
          };
        } else {
          // New format: array of objects
          return {
            id: item.id || item.attachment_id?.toString() || `img_${index}`,
            url: item.url || item,
            attachment_id: item.attachment_id,
          };
        }
      });
    }
    
    return [];
  } catch (error) {
    console.error("Error parsing images JSON:", error);
    return [];
  }
}

/**
 * Convert images array to simple URLs array (for backward compatibility)
 */
export function imagesToUrls(images: ImageItem[]): string[] {
  return images.map((img) => img.url);
}

/**
 * Convert URLs array to ImageItem array
 */
export function urlsToImages(urls: string[]): ImageItem[] {
  return urls.map((url, index) => ({
    id: `img_${index}`,
    url,
  }));
}

