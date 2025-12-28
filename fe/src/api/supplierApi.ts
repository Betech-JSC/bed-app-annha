import api from "./api";

export interface Supplier {
  id: number;
  uuid: string;
  name: string;
  code?: string;
  category?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_code?: string;
  bank_name?: string;
  bank_account?: string;
  bank_account_holder?: string;
  description?: string;
  status: "active" | "inactive" | "blacklisted";
  total_debt: number;
  total_paid: number;
  remaining_debt: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierData {
  name: string;
  code?: string;
  category?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_code?: string;
  bank_name?: string;
  bank_account?: string;
  bank_account_holder?: string;
  description?: string;
  status?: "active" | "inactive" | "blacklisted";
}

export interface SupplierDebtStatistics {
  supplier: {
    id: number;
    name: string;
  };
  statistics: {
    total_contract_value: number;
    total_accepted: number;
    total_paid: number;
    total_debt: number;
    remaining_debt: number;
    payment_percentage: number;
  };
}

export const supplierApi = {
  // Danh sách nhà cung cấp
  getSuppliers: async (params?: {
    active_only?: boolean;
    search?: string;
    category?: string;
    page?: number;
  }) => {
    const response = await api.get("/admin/suppliers", { params });
    return response.data;
  },

  // Chi tiết nhà cung cấp
  getSupplier: async (id: number) => {
    const response = await api.get(`/admin/suppliers/${id}`);
    return response.data;
  },

  // Tạo nhà cung cấp
  createSupplier: async (data: CreateSupplierData) => {
    const response = await api.post("/admin/suppliers", data);
    return response.data;
  },

  // Cập nhật nhà cung cấp
  updateSupplier: async (id: number, data: Partial<CreateSupplierData>) => {
    const response = await api.put(`/admin/suppliers/${id}`, data);
    return response.data;
  },

  // Xóa nhà cung cấp
  deleteSupplier: async (id: number) => {
    const response = await api.delete(`/admin/suppliers/${id}`);
    return response.data;
  },

  // Thống kê công nợ
  getDebtStatistics: async (id: number): Promise<{ success: boolean; data: SupplierDebtStatistics }> => {
    const response = await api.get(`/admin/suppliers/${id}/debt-statistics`);
    return response.data;
  },
};

