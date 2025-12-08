import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Image } from "react-native";
import { Stack, useRouter } from "expo-router";
import SocialMedia from "./components/SocialMedia";

function Main() {
    const router = useRouter();

    return (
        <>
            <View className="flex-col justify-between  px-[20px] py-[32px] bg-white h-full">
                <View className="flex-row justify-center py-[48px]">
                    <Image source={require("../assets/images/role.webp")} className="w-[261px] max-h-[278px]" />
                </View>
                <View className="gap-y-[12px]">
                    <Text className="text-center text-[24px] font-bold text-[#3C3C43]">Đăng nhập hoặc đăng ký</Text>
                    <Text className="text-center">Nhận tài khoản của Skysend để nhận các trải nghiệm tốt nhất về dịch vụ vận chuyển</Text>
                    <View className="mt-[8px]">
                        <Pressable onPress={() => router.push("/login")} className="bg-[#0D6EFD] w-full  py-[14px] px-[32px] rounded-[14px]">
                            <Text className="text-center text-white">Đăng nhập</Text>
                        </Pressable>
                    </View>
                    <View className="mt-[8] ">
                        <Pressable onPress={() => router.push("/register")} className="bg-[#F2F2F7] w-full  py-[14px] px-[32px] rounded-[14px]">
                            <Text className="text-center text-[#0D6EFD] text-[17px] font-semibold">Bạn chưa có tài khoản đăng ký ngay</Text>
                        </Pressable>
                    </View>
                    <View className="mt-[12px]">
                        <SocialMedia />
                    </View>
                </View>
                <View>
                    <Text className="text-[#61677C]">
                        Bằng cách đăng ký và đăng nhập, bạn đã hiểu và đồng ý với
                        <Text className="text-[#517CFF]">Điều Khoản Sử dụng</Text> và <Text className="text-[#517CFF]">Chính sách bảo mật</Text> của Skysend
                    </Text>
                </View>
            </View >
        </>
    );
}

export default Main;
