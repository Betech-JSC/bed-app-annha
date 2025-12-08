import { useRouter } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";

function ItemOrder({ item }: any) {

    const router = useRouter();

    return (
        <Pressable onPress={() => router.push(`/orders/${item.id}`)}>
            <View className="bg-white p-[20px] mb-[12px] rounded-[12px]">
                <View className="gap-y-[2px]">
                    <View className="flex-row items-start justify-between ">
                        {item.matched_order ?
                            <View className="gap-x-[12px] flex-row items-center">
                                <View>
                                    <Image source={item.matched_order?.avatar?.url} className="w-[48px] h-[48px]" />
                                </View>
                                <View className="flex-row">
                                    <View>
                                        <View className="flex-row items-center gap-x-2">
                                            <Text className="text-[#1B1B1B] font-semibold"> {item.matched_order?.user.name} </Text>
                                        </View>
                                        <View className="flex-row items-center gap-x-[2px] ">
                                            <Image source={require("@assets/images/star.png")} className="w-[10px] h-[10px]" />
                                            <Image source={require("@assets/images/star.png")} className="w-[10px] h-[10px]" />
                                            <Image source={require("@assets/images/star.png")} className="w-[10px] h-[10px]" />
                                            <Image source={require("@assets/images/star.png")} className="w-[10px] h-[10px]" />
                                            <Image source={require("@assets/images/star.png")} className="w-[10px] h-[10px]" />
                                        </View>
                                    </View>
                                </View>
                            </View> : <View></View>
                        }
                        <View className="bg-[#2DD4BF]  rounded-[80px]">
                            <Text className="text-white py-[2px] px-[6px]  text-center"> {item.status} </Text>
                        </View>
                    </View>
                    <View className="flex-row items-center gap-x-[6px]">
                        {
                            item.images && item.images.length > 0 ? (
                                item.images.map((imageUrl: string, index: number) => {
                                    console.log(imageUrl);

                                    return <Image
                                        key={index}
                                        source={{ uri: imageUrl }}
                                        className="w-[60px] h-[60px] rounded-[8px]"
                                    />
                                })
                            ) : (
                                <Text className="text-[#667085]">Không có hình ảnh</Text>
                            )
                        }
                    </View>
                    <View className="gap-y-3">
                        <View>
                            <Text className="font-medium text-[16px]">Đơn hàng {item.id} </Text>
                        </View>
                        <View className="flex-row items-center gap-x-2">
                            <View className="w-3 h-3 bg-blue-500 rounded-full" />
                            <View className="flex-1">
                                <Text className="font-semibold"> {item.pickup_location?.name} </Text>
                            </View>
                        </View>

                        <View className="flex-row items-center gap-x-2">

                            <View className="w-3 h-3 bg-blue-900 rounded-full" />
                            <View className="flex-1">
                                <Text className="font-semibold"> {item.delivery_location?.name} </Text>
                            </View>
                        </View>
                        <View className="flex-row items-center gap-x-[8px]">
                            <View className="rounded-[80px]">
                                {item.package_weight && <Text className="py-[2px] px-[6px] bg-[#DCEDFF] ">{item.package_weight} </Text>}
                            </View>
                            <View className="rounded-[80px]">
                                {item.package_dimensions && <Text className="py-[2px] px-[6px] bg-[#DCEDFF] ">{item.package_dimensions} </Text>}
                            </View>
                        </View>
                        <View className="flex-row items-center gap-x-[8px]">
                            <View className="rounded-[80px]">
                                {item.shipment_description && <Text className="py-[2px] px-[6px] bg-[#DCEDFF] ">{item.shipment_description} </Text>}

                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </Pressable >
    )
}

export default ItemOrder