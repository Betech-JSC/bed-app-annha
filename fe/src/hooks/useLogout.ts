import { useDispatch } from "react-redux";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { clearUser } from "@/reducers/userSlice";
import { clearPermissions } from "@/reducers/permissionsSlice";
import { authApi } from "@/api/authApi";

export const useLogout = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  const logout = async (showAlert: boolean = true) => {
    try {
      // Gọi API logout
      await authApi.logout();
    } catch (error) {
      // Bỏ qua lỗi nếu API fail (có thể token đã hết hạn)
      console.log("Logout API error (ignored):", error);
    } finally {
      // Luôn clear user, permissions và redirect về login
      dispatch(clearUser());
      dispatch(clearPermissions());
      router.replace("/login");

      if (showAlert) {
        Alert.alert("Đã đăng xuất", "Bạn đã đăng xuất thành công");
      }
    }
  };

  const logoutWithConfirm = () => {
    Alert.alert(
      "Đăng xuất",
      "Bạn có chắc chắn muốn đăng xuất?",
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Đăng xuất",
          style: "destructive",
          onPress: () => logout(true),
        },
      ]
    );
  };

  return { logout, logoutWithConfirm };
};
