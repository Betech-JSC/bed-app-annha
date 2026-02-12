import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    RefreshControl,
    Image,
} from "react-native";
import { useRouter } from "expo-router";
import { projectApi } from "@/api/projectApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { PermissionGuard } from "@/components/PermissionGuard";
import { Permissions } from "@/constants/Permissions";

export default function HrScreen() {
    const router = useRouter();
    const tabBarHeight = useTabBarHeight();
    const [users, setUsers] = useState<any[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchText, setSearchText] = useState("");

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const response = await projectApi.getAllUsers();
            if (response.success) {
                setUsers(response.data || []);
                setFilteredUsers(response.data || []);
            }
        } catch (error) {
            console.error("Error loading users:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadUsers();
    };

    useEffect(() => {
        if (searchText.trim() === "") {
            setFilteredUsers(users);
        } else {
            const lowerSearch = searchText.toLowerCase();
            const filtered = users.filter(
                (user) =>
                    user.name?.toLowerCase().includes(lowerSearch) ||
                    user.email?.toLowerCase().includes(lowerSearch) ||
                    user.phone?.toLowerCase().includes(lowerSearch)
            );
            setFilteredUsers(filtered);
        }
    }, [searchText, users]);

    const renderUserItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.userCard}
            onPress={() => router.push(`/hr/${item.id}`)}
        >
            <View style={styles.userInfo}>
                <View style={styles.avatarContainer}>
                    {item.image ? (
                        <Image source={{ uri: item.image }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarText}>{item.name?.charAt(0)?.toUpperCase() || "?"}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.userDetails}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                    {item.phone && <Text style={styles.userPhone}>{item.phone}</Text>}
                </View>
            </View>
            <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{item.role || "N/A"}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Nhân Sự"
                rightComponent={
                    <View style={{ flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity
                            onPress={() => router.push("/hr/kpis")}
                            style={styles.kpiButton}
                        >
                            <Ionicons name="trophy" size={20} color="#3B82F6" />
                        </TouchableOpacity>
                        {/* <PermissionGuard permission={Permissions.SETTINGS_MANAGE}>
                            <TouchableOpacity onPress={() => { }} style={styles.addButton}>
                                <Ionicons name="add" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </PermissionGuard> */}
                    </View>
                }
            />

            <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={20} color="#9CA3AF" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm kiếm nhân sự..."
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholderTextColor="#9CA3AF"
                />
                {searchText.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchText("")}>
                        <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                )}
            </View>

            {loading && !refreshing ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            ) : (
                <FlatList
                    data={filteredUsers}
                    renderItem={renderUserItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 20 }]}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={64} color="#D1D5DB" />
                            <Text style={styles.emptyText}>Chưa có nhân sự nào</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF",
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        height: 48,
    },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: "#1F2937" },
    listContent: { paddingHorizontal: 16 },
    userCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#FFF",
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    userInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
    avatarContainer: { marginRight: 12 },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    avatarPlaceholder: { backgroundColor: "#E0E7FF", justifyContent: "center", alignItems: "center" },
    avatarText: { fontSize: 20, fontWeight: "600", color: "#4F46E5" },
    userDetails: { flex: 1 },
    userName: { fontSize: 16, fontWeight: "600", color: "#111827" },
    userEmail: { fontSize: 14, color: "#6B7280" },
    userPhone: { fontSize: 13, color: "#9CA3AF" },
    roleBadge: {
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    roleText: { fontSize: 12, fontWeight: "500", color: "#374151" },
    emptyContainer: { alignItems: "center", marginTop: 60 },
    emptyText: { marginTop: 16, color: "#9CA3AF", fontSize: 16 },
    addButton: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: "#3B82F6", alignItems: "center", justifyContent: "center"
    },
    kpiButton: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center"
    }
});
