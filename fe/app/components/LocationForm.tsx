import api from "@/api/api";
import React, { useState, useEffect } from "react";
import { View } from "react-native";
import DropDownPicker from "react-native-dropdown-picker";

export default function LocationForm({ formData, handleInputChange }) {
    const [openPickup, setOpenPickup] = useState(false);
    const [openDelivery, setOpenDelivery] = useState(false);

    const [pickupItems, setPickupItems] = useState([]);
    const [deliveryItems, setDeliveryItems] = useState([]);

    // Khi một dropdown mở, đóng dropdown còn lại
    useEffect(() => {
        if (openPickup) setOpenDelivery(false);
    }, [openPickup]);

    useEffect(() => {
        if (openDelivery) setOpenPickup(false);
    }, [openDelivery]);

    // Fetch danh sách regions từ API
    useEffect(() => {
        const fetchRegions = async () => {
            try {
                const response = await api.get("/regions");

                if (response.data.data && Array.isArray(response.data.data)) {
                    // Giả sử API trả về array [{ id: 1, name: "Hà Nội" }, ...]
                    const regions = response.data.data.map(region => ({
                        label: region.name,
                        value: region.id.toString(), // value là string
                    }));

                    setPickupItems(regions);
                    setDeliveryItems(regions);
                }
            } catch (error) {
                console.log("Error fetching regions:", error);
            }
        };

        fetchRegions();
    }, []);

    return (
        <>
            {/* Pickup */}
            <View style={{ zIndex: openPickup ? 3000 : 1000, elevation: openPickup ? 3000 : 1000 }}>
                <DropDownPicker
                    open={openPickup}
                    value={formData.pickup_location}
                    items={pickupItems}
                    setOpen={setOpenPickup}
                    setItems={setPickupItems}
                    onSelectItem={(item) => handleInputChange("pickup_location", item.value)}
                    style={{ borderColor: "#D1D5DB", borderRadius: 16, paddingVertical: 10 }}
                    placeholder="Chọn điểm khởi hành"
                    listMode="MODAL"
                />
            </View>

            {/* Delivery */}
            <View style={{ marginTop: 2, zIndex: openDelivery ? 3000 : 1000, elevation: openDelivery ? 3000 : 1000 }}>
                <DropDownPicker
                    open={openDelivery}
                    value={formData.delivery_location}
                    items={deliveryItems}
                    setOpen={setOpenDelivery}
                    setItems={setDeliveryItems}
                    onSelectItem={(item) => handleInputChange("delivery_location", item.value)}
                    placeholder="Chọn điểm đến"
                    listMode="MODAL"
                />
            </View>
        </>
    );
}
