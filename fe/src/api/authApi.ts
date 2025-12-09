import api from "./api";

export const authApi = {
  // Login
  login: async (email: string, password: string, fcmToken?: string) => {
    const response = await api.post("/login", {
      email,
      password,
      fcm_token: fcmToken,
    });
    return response.data;
  },

  // Logout
  logout: async () => {
    const response = await api.post("/logout");
    return response.data;
  },

  // Register (disabled)
  register: async (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    fcm_token?: string;
  }) => {
    const response = await api.post("/register", data);
    return response.data;
  },

  // Forgot password
  forgotPassword: async (email: string) => {
    const response = await api.post("/forgot-password", { email });
    return response.data;
  },

  // Reset password
  resetPassword: async (data: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) => {
    const response = await api.post("/reset-password", data);
    return response.data;
  },
};
