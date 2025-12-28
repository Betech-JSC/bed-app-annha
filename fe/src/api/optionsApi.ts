import api from "./api";

export interface Option {
  value: string;
  label: string;
  color?: string;
  description?: string;
}

export interface OptionsResponse {
  project_statuses?: Option[];
  equipment_statuses?: Option[];
  equipment_types?: Option[];
  personnel_roles?: Option[];
  cost_statuses?: Option[];
}

export const optionsApi = {
  // Get all options
  getAllOptions: async (): Promise<OptionsResponse> => {
    const response = await api.get("/options?type=all");
    return response.data.data;
  },

  // Get project statuses
  getProjectStatuses: async (): Promise<Option[]> => {
    const response = await api.get("/options?type=project_statuses");
    return response.data.data;
  },

  // Get equipment statuses
  getEquipmentStatuses: async (): Promise<Option[]> => {
    const response = await api.get("/options?type=equipment_statuses");
    return response.data.data;
  },

  // Get equipment types
  getEquipmentTypes: async (): Promise<Option[]> => {
    const response = await api.get("/options?type=equipment_types");
    return response.data.data;
  },

  // Get personnel roles
  getPersonnelRoles: async (): Promise<Option[]> => {
    const response = await api.get("/options?type=personnel_roles");
    return response.data.data;
  },

  // Get cost statuses
  getCostStatuses: async (): Promise<Option[]> => {
    const response = await api.get("/options?type=cost_statuses");
    return response.data.data;
  },
};

