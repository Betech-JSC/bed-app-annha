import api from "./api";

export interface Attachment {
  id: number;
  original_name: string;
  type: "image" | "video" | "document";
  file_name: string;
  file_path: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_by: number;
  sort_order: number;
  description?: string;
  attachment_id?: number; // For compatibility with upload response
}

export interface UploadResponse {
  success: boolean;
  file_url: string;
  file: string;
  location: string;
  attachment_id: number;
}

export const attachmentApi = {
  // Upload files
  upload: async (files: FormData) => {
    const response = await api.post("/upload", files, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      transformRequest: (data, headers) => {
        // Don't set Content-Type header - let axios set it automatically with boundary
        // React Native FormData needs this to work correctly
        if (headers) {
          delete headers['Content-Type'];
        }
        return data;
      },
    });
    return response.data;
  },

  // Get attachment by ID
  getAttachment: async (id: number) => {
    const response = await api.get(`/attachments/${id}`);
    return response.data;
  },

  // Delete attachment
  deleteAttachment: async (id: number) => {
    const response = await api.delete(`/attachments/${id}`);
    return response.data;
  },
};

