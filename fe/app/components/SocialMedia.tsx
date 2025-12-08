// components/SocialMedia.tsx
import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as Facebook from "expo-auth-session/providers/facebook";
import { useDispatch } from "react-redux";
import { setUser } from "@/reducers/userSlice";
import { router, useLocalSearchParams } from "expo-router";
import api from "@/api/api";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { getDatabase, ref, set } from "firebase/database";
import { app } from "@/firebaseConfig";

// Lấy env variables (fallback nếu không có)
const GOOGLE_EXPO_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID || "YOUR_GOOGLE_EXPO_CLIENT_ID";
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "YOUR_IOS_CLIENT_ID";
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "YOUR_ANDROID_CLIENT_ID";
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || "YOUR_FACEBOOK_APP_ID";

WebBrowser.maybeCompleteAuthSession();

interface SocialMediaProps {
    onLoadingChange?: (loading: boolean) => void;
}

const SocialMedia: React.FC<SocialMediaProps> = ({ onLoadingChange }) => {
    const dispatch = useDispatch();
    const { role } = useLocalSearchParams<{ role?: string }>();
    const [loading, setLoading] = useState(false);

    // === GOOGLE ===
    const [requestG, responseG, promptAsyncG] = Google.useAuthRequest({
        expoClientId: GOOGLE_EXPO_CLIENT_ID,
        iosClientId: GOOGLE_IOS_CLIENT_ID,
        androidClientId: GOOGLE_ANDROID_CLIENT_ID,
        scopes: ['openid', 'profile', 'email'],
    });

    // === FACEBOOK ===
    const [requestF, responseF, promptAsyncF] = Facebook.useAuthRequest({
        clientId: FACEBOOK_APP_ID,
        scopes: ['public_profile', 'email'],
    });

    // Update loading state
    useEffect(() => {
        if (onLoadingChange) {
            onLoadingChange(loading);
        }
    }, [loading, onLoadingChange]);

    // === XỬ LÝ RESPONSE ===
    useEffect(() => {
        if (responseG?.type === "success" && responseG.authentication?.accessToken) {
            handleSocialLogin("google", responseG.authentication.accessToken);
        } else if (responseG?.type === "error") {
            setLoading(false);
            Alert.alert("Lỗi Google", responseG.error?.message || "Đăng nhập Google thất bại");
        }

        if (responseF?.type === "success" && responseF.authentication?.accessToken) {
            handleSocialLogin("facebook", responseF.authentication.accessToken);
        } else if (responseF?.type === "cancel") {
            setLoading(false);
            console.log("User cancelled Facebook login");
        } else if (responseF?.type === "error") {
            setLoading(false);
            Alert.alert("Lỗi Facebook", responseF.error?.message || "Đăng nhập Facebook thất bại");
        }
    }, [responseG, responseF]);

    // === GỌI API LARAVEL ===
    const handleSocialLogin = async (provider: string, accessToken: string) => {
        if (!accessToken) {
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            // Gọi API backend với access_token
            const res = await api.post(`/auth/${provider}/login`, {
                access_token: accessToken,
            });

            if (res.data.success && res.data.data?.user) {
                // Response structure: { success: true, data: { user: { ...user, token: "..." } } }
                const userData = res.data.data.user || res.data.data;
                const token = userData.token;
                const user = { ...userData };
                delete user.token; // Remove token from user object để lưu riêng

                // Lấy Expo Push Token
                let expoPushToken = "";
                try {
                    if (Constants.isDevice) {
                        const { status } = await Notifications.requestPermissionsAsync();
                        if (status === "granted") {
                            expoPushToken = (await Notifications.getExpoPushTokenAsync()).data;
                        }
                    } else {
                        expoPushToken = "ExponentPushToken[emulator]";
                    }
                } catch (error) {
                    console.warn("Không lấy được push token:", error);
                }

                // Lưu push token vào Firebase và database
                if (expoPushToken && user.id) {
                    const db = getDatabase(app);
                    await set(ref(db, `users/${user.id}/expo_push_token`), expoPushToken);
                    
                    // Lưu token vào Laravel database
                    try {
                        await api.post('/users/save-token', {
                            user_id: user.id,
                            token: expoPushToken,
                        });
                    } catch (error) {
                        console.warn('Không thể lưu push token vào database:', error);
                    }
                }

                // Gán role từ param hoặc từ user
                const userRole = role === "sender" ? "sender" : (role === "customer" ? "customer" : user.role || "customer");
                const userWithRole = {
                    ...user,
                    role: userRole,
                    token: token, // Token từ API response
                };

                // Lưu vào Redux
                dispatch(setUser(userWithRole));

                // Redirect theo role
                if (userWithRole.role === "sender") {
                    router.replace("/(tabs)/(sender)/home");
                } else {
                    router.replace("/(tabs)/(customer)/home_customer");
                }
            } else {
                Alert.alert("Lỗi", res.data.message || "Đăng nhập thất bại");
            }
        } catch (error: any) {
            console.error("Social login error:", error);
            Alert.alert(
                "Lỗi đăng nhập",
                error.response?.data?.message || "Không thể kết nối đến server"
            );
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        if (!requestG) {
            Alert.alert("Lỗi", "Google login chưa sẵn sàng");
            return;
        }
        setLoading(true);
        try {
            await promptAsyncG();
        } catch (error) {
            setLoading(false);
            Alert.alert("Lỗi", "Không thể mở Google login");
        }
    };

    const handleFacebookLogin = async () => {
        if (!requestF) {
            Alert.alert("Lỗi", "Facebook login chưa sẵn sàng");
            return;
        }
        setLoading(true);
        try {
            await promptAsyncF();
        } catch (error) {
            setLoading(false);
            Alert.alert("Lỗi", "Không thể mở Facebook login");
        }
    };

    return (
        <View className="gap-y-4">
            <View className="flex-row items-center gap-3">
                <View className="flex-1 h-px bg-gray-300" />
                <Text className="text-gray-500 text-sm">Hoặc tiếp tục với</Text>
                <View className="flex-1 h-px bg-gray-300" />
            </View>
            
            <View className="flex-row gap-x-4">
                {/* GOOGLE */}
                <TouchableOpacity
                    disabled={loading || !requestG}
                    onPress={handleGoogleLogin}
                    className="flex-1 flex-row border border-gray-300 rounded-xl justify-center items-center py-3 bg-white"
                    style={{ opacity: loading || !requestG ? 0.6 : 1 }}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#4285F4" />
                    ) : (
                        <Image
                            source={require("@assets/images/social/google.webp")}
                            className="w-6 h-6"
                            resizeMode="contain"
                        />
                    )}
                </TouchableOpacity>

                {/* FACEBOOK */}
                <TouchableOpacity
                    disabled={loading || !requestF}
                    onPress={handleFacebookLogin}
                    className="flex-1 flex-row border border-gray-300 rounded-xl justify-center items-center py-3 bg-white"
                    style={{ opacity: loading || !requestF ? 0.6 : 1 }}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#1877F2" />
                    ) : (
                        <Image
                            source={require("@assets/images/social/fb.webp")}
                            className="w-6 h-6"
                            resizeMode="contain"
                        />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default SocialMedia;