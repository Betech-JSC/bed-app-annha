import api from "./api";

export interface ProjectDocument {
  id: number;
  original_name: string;
  type: "image" | "video" | "document";
  file_name: string;
  file_path: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_by: number;
  created_at: string;
}

export const documentApi = {
  // Get documents for project
  getDocuments: async (projectId: string | number, params?: { type?: string }) => {
    const response = await api.get(`/projects/${projectId}/documents`, { params });
    return response.data;
  },

  // Attach document to project
  attachDocument: async (projectId: string | number, attachmentId: number) => {
    const response = await api.post(`/projects/${projectId}/documents`, {
      attachment_id: attachmentId,
    });
    return response.data;
  },
};
