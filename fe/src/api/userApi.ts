import api from "./api";

export const userApi = {
  // Get current user profile
  getProfile: async () => {
    const response = await api.get("/user/profile");
    return response.data;
  },

  // Update user profile
  updateProfile: async (data: {
    name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    password?: string;
  }) => {
    const response = await api.put("/user/profile", data);
    return response.data;
  },

  // Change password
  changePassword: async (data: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }) => {
    const response = await api.post("/user/change-password", data);
    return response.data;
  },

  // Upload avatar
  uploadAvatar: async (avatar: any) => {
    const formData = new FormData();
    formData.append("avatar", avatar);
    const response = await api.post("/user/upload-avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Delete account (required by Apple App Store)
  deleteAccount: async () => {
    const response = await api.delete("/user/account");
    return response.data;
  },
};

