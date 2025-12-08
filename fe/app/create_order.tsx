import React, { useState } from "react";
import { useRouter } from "expo-router";
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    Image,
    ScrollView,
    Pressable,
    Alert,
    Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import api from "@/api/api";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import LocationForm from "./components/LocationForm";
import PackageSelector from "./components/PackageSelector";

interface ImageFile {
    uri: string;
    type: string;
    name: string;
}

function CreateOrder() {
    const router = useRouter();
    const user = useSelector((state: RootState) => state.user);
    const role = user?.role;

    const [formData, setFormData] = useState({
        role: role,
        shipment_description: "",
        pickup_location: "",
        delivery_location: "",
        flight_number: "",
        flight_time: new Date(),
        package_weight: "",
        package_dimensions: "",
        special_instructions: "",
        images: [] as ImageFile[],
    });

    // Yêu cầu quyền truy cập
    const requestPermission = async () => {
        if (Platform.OS !== "web") {
            const { status } =
                await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Quyền bị từ chối", "Cần cấp quyền để chọn ảnh");
                return false;
            }
        }
        return true;
    };

    // Chọn ảnh từ thư viện hoặc camera
    const pickImage = async (useCamera: boolean = false) => {
        if (formData.images.length >= 3) {
            Alert.alert("Giới hạn", "Bạn chỉ có thể chọn tối đa 3 ảnh.");
            return;
        }

        let result;

        if (useCamera) {
            const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
            if (cameraPerm.status !== "granted") {
                Alert.alert("Quyền bị từ chối", "Cần cấp quyền để chụp ảnh");
                return;
            }

            result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                allowsEditing: false,
            });
        } else {
            const hasPermission = await requestPermission();
            if (!hasPermission) return;

            result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                allowsEditing: false,
            });
        }

        if (result.canceled || !result.assets || result.assets.length === 0) {
            return;
        }

        const asset = result.assets[0];
        const fileName = asset.uri.split("/").pop() || `img_${Date.now()}.jpg`;
        const match = /\.(\w+)$/.exec(fileName);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        const imageFile: ImageFile = {
            uri: asset.uri,
            type: type,
            name: fileName,
        };

        setFormData((prev) => ({
            ...prev,
            images: [...prev.images, imageFile],
        }));
    };

    // Xóa ảnh
    const removeImage = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index),
        }));
    };

    const handleInputChange = (name: string, value: any) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        if (formData.images.length === 0) {
            Alert.alert("Thiếu ảnh", "Vui lòng tải lên ít nhất 1 ảnh hàng hóa.");
            return;
        }

        try {
            const data = new FormData();

            // Các trường text
            data.append("role", formData.role);
            data.append("shipment_description", formData.shipment_description);
            data.append("pickup_location", formData.pickup_location);
            data.append("delivery_location", formData.delivery_location);
            data.append("package_weight", formData.package_weight || "");

            if (formData.flight_number) data.append("flight_number", formData.flight_number);
            if (formData.flight_time)
                data.append("flight_time", formData.flight_time.toISOString());

            // Gửi ảnh
            formData.images.forEach((image) => {
                data.append("images[]", {
                    uri: image.uri,
                    type: image.type,
                    name: image.name,
                } as any);
            });

            const response = await api.post("orders/create", data, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (response.status === 200) {
                Alert.alert("Thành công!", "Đơn hàng đã được tạo.");
                router.push({
                    pathname: "/create_order_success",
                    params: { order: response.data.data.order.id },
                });
            }
        } catch (error: any) {
            console.log("Submit error:", error.response?.data || error);
            Alert.alert(
                "Lỗi",
                error.response?.data?.message || "Không thể tạo đơn hàng"
            );
        }
    };

    return (
        <View className="p-4 h-full bg-gray-50">
            <ScrollView className="gap-y-4">
                {/* Hành trình */}
                <View className="bg-white p-4 rounded-xl gap-y-3 shadow-sm">
                    <Text className="text-lg font-bold text-[#0F172A]">
                        Hành trình của bạn
                    </Text>
                    <LocationForm
                        formData={formData}
                        handleInputChange={handleInputChange}
                    />
                </View>

                {/* Hàng hóa */}
                <View className="bg-white p-4 rounded-xl gap-y-3 shadow-sm mt-2">
                    <Text className="text-lg font-bold text-[#0F172A]">
                        Thông tin hàng hóa
                    </Text>
                    <PackageSelector
                        formData={formData}
                        handleInputChange={handleInputChange}
                    />
                    <TextInput
                        className="p-4 border border-gray-300 rounded-2xl text-base"
                        placeholder="Cân nặng ước tính (kg)"
                        keyboardType="numeric"
                        value={formData.package_weight}
                        onChangeText={(text) => {
                            const numeric = text.replace(/[^0-9.]/g, "");
                            handleInputChange("package_weight", numeric);
                        }}
                    />
                    <TextInput
                        className="p-4 border border-gray-300 rounded-2xl text-base"
                        placeholder="Ghi chú (mô tả hàng hóa)"
                        value={formData.shipment_description}
                        onChangeText={(text) =>
                            handleInputChange("shipment_description", text)
                        }
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        style={{ minHeight: 100 }}
                    />
                </View>

                {/* Ảnh hàng hóa */}
                <View className="bg-white p-4 rounded-xl pb-20 shadow-sm mt-2">
                    <View className="flex-row justify-center gap-6 py-6 border-2 border-dashed border-[#D0D5DD] rounded-xl">
                        {/* Chụp ảnh */}
                        <TouchableOpacity
                            onPress={() => pickImage(true)}
                            className="items-center gap-y-2"
                        >
                            <View className="bg-blue-100 p-4 ro
                            unded-full">
                                <Image
                                    source={require("@assets/images/camera.webp")}
                                    className="w-8 h-8"
                                    resizeMode="contain"
                                />
                            </View>
                            <Text className="text-sm font-semibold text-blue-600">
                                Chụp ảnh
                            </Text>
                        </TouchableOpacity>

                        <View className="w-px bg-gray-300" />

                        {/* Thư viện */}
                        <TouchableOpacity
                            onPress={() => pickImage(false)}
                            className="items-center gap-y-2"
                        >
                            <View className="bg-green-100 p-4 rounded-full">
                                <Image
                                    source={require("@assets/images/gallery.webp")}
                                    className="w-8 h-8"
                                    resizeMode="contain"
                                />
                            </View>
                            <Text className="text-sm font-semibold text-green-600">
                                Thư viện
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Text className="text-xs text-gray-600 mt-3 text-center">
                        *Vui lòng đăng 1–3 ảnh thực tế. Ảnh giúp tăng độ tin cậy và an toàn
                    </Text>

                    {/* Preview ảnh */}
                    {formData.images.length > 0 && (
                        <View className="mt-4">
                            <Text className="font-bold text-[#0F172A] mb-3 text-center">
                                Ảnh đã chọn ({formData.images.length}/3)
                            </Text>
                            <View className="flex-row flex-wrap gap-3 justify-center">
                                {formData.images.map((image, index) => (
                                    <View key={index} className="relative">
                                        <Image
                                            source={{ uri: image.uri }}
                                            className="w-24 h-24 rounded-xl border border-gray-200"
                                            resizeMode="cover"
                                        />
                                        <TouchableOpacity
                                            onPress={() => removeImage(index)}
                                            className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1.5 shadow-md"
                                        >
                                            <Text className="text-white text-sm font-bold">×</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Nút tạo đơn */}
            <View className="absolute inset-x-0 bottom-0 px-5 bg-white pb-6 pt-4 shadow-lg">
                <Pressable onPress={handleSubmit}>
                    <View className="bg-[#FFD700] rounded-xl py-4 shadow-md">
                        <Text className="text-[#0F172A] font-bold text-center text-lg">
                            Tạo đơn hàng
                        </Text>
                    </View>
                </Pressable>
            </View>
        </View>
    );
}

export default CreateOrder;