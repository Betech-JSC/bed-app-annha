import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supplierApi, Supplier } from "@/api/supplierApi";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";

export default function SupplierPayablesScreen() {
    const router = useRouter();
    const tabBarHeight = useTabBarHeight();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        loadData();
    }, [searchQuery]);

    const loadData = async () => {
        try {
            setLoading(true);
            const response = await supplierApi.getSuppliers({
                search: searchQuery || undefined,
            });
            if (response.success) {
                // Only show suppliers with debt or significant activity
                setSuppliers(response.data.data || []);
            }
        } catch (error) {
            console.error("Error loading supplier payables:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(amount);
    };

    const totalDebt = suppliers.reduce((sum, s) => sum + (s.remaining_debt || 0), 0);

    const renderItem = ({ item }: { item: Supplier }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/settings/suppliers/${item.id}`)}
        >
            <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardCategory}>{item.category || "Chưa phân loại"}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>

            <View style={styles.debtInfo}>
                <View style={styles.debtItem}>
                    <Text style={styles.debtLabel}>Tổng thanh toán:</Text>
                    <Text style={styles.paidValue}>{formatCurrency(item.total_paid || 0)}</Text>
                </View>
                <View style={styles.debtItem}>
                    <Text style={styles.debtLabel}>Công nợ hiện tại:</Text>
                    <Text style={styles.remainingDebtValue}>{formatCurrency(item.remaining_debt || 0)}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <ScreenHeader title="Phải Thanh Toán Theo NCC" showBackButton />

            <View style={styles.summaryCard}>
                <View style={styles.summaryIcon}>
                    <Ionicons name="alert-circle" size={32} color="#EF4444" />
                </View>
                <View>
                    <Text style={styles.summaryLabel}>Tổng công nợ NCC</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(totalDebt)}</Text>
                </View>
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm kiếm nhà cung cấp..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                        <Ionicons name="close-circle" size={20} color="#6B7280" />
                    </TouchableOpacity>
                )}
            </View>

            {loading && !refreshing ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            ) : (
                <FlatList
                    data={suppliers}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
                            <Text style={styles.emptyText}>Không có dữ liệu công nợ</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    summaryCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        margin: 16,
        padding: 20,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    summaryIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#FEF2F2",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    summaryLabel: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 24,
        fontWeight: "700",
        color: "#EF4444",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        marginHorizontal: 16,
        marginBottom: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: "#1F2937",
    },
    card: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 16,
        marginTop: 12,
        padding: 16,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    cardHeaderLeft: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 2,
    },
    cardCategory: {
        fontSize: 12,
        color: "#6B7280",
    },
    debtInfo: {
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        paddingTop: 12,
    },
    debtItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    debtLabel: {
        fontSize: 13,
        color: "#6B7280",
    },
    paidValue: {
        fontSize: 14,
        fontWeight: "500",
        color: "#10B981",
    },
    remainingDebtValue: {
        fontSize: 15,
        fontWeight: "700",
        color: "#EF4444",
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        color: "#9CA3AF",
        marginTop: 16,
    },
});
