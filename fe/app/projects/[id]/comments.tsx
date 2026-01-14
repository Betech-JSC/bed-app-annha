import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { projectCommentApi, ProjectComment, CreateProjectCommentData } from "@/api/projectCommentApi";
import { ScreenHeader, PermissionGuard } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { useSelector } from "react-redux";
import type { RootState } from "@/reducers/index";
import { Permissions } from "@/constants/Permissions";
import { usePermissions } from "@/hooks/usePermissions";

export default function ProjectCommentsScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const tabBarHeight = useTabBarHeight();
    const user = useSelector((state: RootState) => state.user);
    const { hasPermission, permissions, loading: permissionsLoading, refresh: refreshPermissions } = usePermissions();

    const [comments, setComments] = useState<ProjectComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [replyText, setReplyText] = useState("");
    const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());
    const [editingComment, setEditingComment] = useState<number | null>(null);
    const [editText, setEditText] = useState("");
    const lastLoadTimeRef = React.useRef<number>(0);
    const loadCommentsTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const loadComments = useCallback(async (force: boolean = false) => {
        // Debounce: Chỉ load nếu đã qua ít nhất 1 giây từ lần load trước (trừ khi force)
        const now = Date.now();
        if (!force && now - lastLoadTimeRef.current < 1000) {
            return;
        }

        // Clear timeout nếu có
        if (loadCommentsTimeoutRef.current) {
            clearTimeout(loadCommentsTimeoutRef.current);
            loadCommentsTimeoutRef.current = null;
        }

        try {
            setLoading(true);
            const response = await projectCommentApi.getComments(id!, { per_page: 100 });
            if (response.success) {
                setComments(response.data || []);
                lastLoadTimeRef.current = Date.now();
            } else {
                Alert.alert("Lỗi", response.message || "Không thể tải bình luận");
            }
        } catch (error: any) {
            console.error("Error loading comments:", error);
            const errorMessage = error.response?.data?.message || "Không thể tải bình luận";

            if (error.response?.status === 403) {
                Alert.alert("Không có quyền", errorMessage, [
                    { text: "OK", onPress: () => router.back() }
                ]);
            } else if (error.response?.status === 429) {
                // Rate limiting: Retry sau 2 giây
                const retryAfter = error.response?.headers?.['retry-after'] || 2;
                console.warn(`Rate limited. Retrying after ${retryAfter} seconds...`);

                loadCommentsTimeoutRef.current = setTimeout(() => {
                    loadComments(true);
                }, retryAfter * 1000);

                // Không hiển thị alert cho 429, chỉ retry tự động
            } else {
                Alert.alert("Lỗi", errorMessage);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id, router]);

    useFocusEffect(
        useCallback(() => {
            // Chỉ load nếu đã qua ít nhất 2 giây từ lần load trước
            const now = Date.now();
            if (now - lastLoadTimeRef.current > 2000) {
                loadComments(true);
            }
            // Refresh permissions khi screen được focus (chỉ nếu cần)
            if (permissions.length === 0) {
                refreshPermissions();
            }

            // Cleanup: Clear timeout khi component unmount
            return () => {
                if (loadCommentsTimeoutRef.current) {
                    clearTimeout(loadCommentsTimeoutRef.current);
                    loadCommentsTimeoutRef.current = null;
                }
            };
        }, [loadComments, refreshPermissions, permissions.length])
    );

    const handleRefresh = () => {
        setRefreshing(true);
        loadComments(true); // Force reload khi user pull to refresh
    };

    const handleSubmitComment = async () => {
        if (!newComment.trim()) {
            Alert.alert("Lỗi", "Vui lòng nhập nội dung bình luận");
            return;
        }

        try {
            setSubmitting(true);
            const data: CreateProjectCommentData = {
                content: newComment.trim(),
            };

            const response = await projectCommentApi.createComment(id!, data);
            if (response.success) {
                setNewComment("");
                await loadComments(true); // Force reload sau khi tạo
            } else {
                Alert.alert("Lỗi", response.message || "Không thể tạo bình luận");
            }
        } catch (error: any) {
            console.error("Error creating comment:", error);
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể tạo bình luận");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitReply = async (parentId: number) => {
        if (!replyText.trim()) {
            Alert.alert("Lỗi", "Vui lòng nhập nội dung phản hồi");
            return;
        }

        try {
            setSubmitting(true);
            const data: CreateProjectCommentData = {
                content: replyText.trim(),
                parent_id: parentId,
            };

            const response = await projectCommentApi.createComment(id!, data);
            if (response.success) {
                setReplyText("");
                setReplyingTo(null);
                await loadComments(true); // Force reload sau khi tạo reply
            } else {
                Alert.alert("Lỗi", response.message || "Không thể tạo phản hồi");
            }
        } catch (error: any) {
            console.error("Error creating reply:", error);
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể tạo phản hồi");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditComment = (comment: ProjectComment) => {
        setEditingComment(comment.id);
        setEditText(comment.content);
    };

    const handleCancelEdit = () => {
        setEditingComment(null);
        setEditText("");
    };

    const handleUpdateComment = async (commentId: number) => {
        if (!editText.trim()) {
            Alert.alert("Lỗi", "Vui lòng nhập nội dung bình luận");
            return;
        }

        try {
            setSubmitting(true);
            const response = await projectCommentApi.updateComment(id!, commentId, {
                content: editText.trim(),
            });
            if (response.success) {
                setEditingComment(null);
                setEditText("");
                await loadComments(true); // Force reload sau khi update
            } else {
                Alert.alert("Lỗi", response.message || "Không thể cập nhật bình luận");
            }
        } catch (error: any) {
            console.error("Error updating comment:", error);
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể cập nhật bình luận");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteComment = (commentId: number) => {
        Alert.alert(
            "Xác nhận xóa",
            "Bạn có chắc chắn muốn xóa bình luận này?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await projectCommentApi.deleteComment(id!, commentId);
                            if (response.success) {
                                await loadComments(true); // Force reload sau khi xóa
                            } else {
                                Alert.alert("Lỗi", response.message || "Không thể xóa bình luận");
                            }
                        } catch (error: any) {
                            console.error("Error deleting comment:", error);
                            Alert.alert("Lỗi", error.response?.data?.message || "Không thể xóa bình luận");
                        }
                    },
                },
            ]
        );
    };

    const toggleReplies = (commentId: number) => {
        const newExpanded = new Set(expandedReplies);
        if (newExpanded.has(commentId)) {
            newExpanded.delete(commentId);
        } else {
            newExpanded.add(commentId);
        }
        setExpandedReplies(newExpanded);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return "Vừa xong";
        if (minutes < 60) return `${minutes} phút trước`;
        if (hours < 24) return `${hours} giờ trước`;
        if (days < 7) return `${days} ngày trước`;
        return date.toLocaleDateString("vi-VN", {
            day: "numeric",
            month: "short",
            year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
        });
    };

    const rootComments = comments.filter((c) => !c.parent_id);
    const getReplies = (parentId: number) => {
        const comment = comments.find((c) => c.id === parentId);
        return comment?.replies || [];
    };

    const renderComment = (comment: ProjectComment, isReply: boolean = false) => {
        const replies = getReplies(comment.id);
        const hasReplies = replies.length > 0;
        const isExpanded = expandedReplies.has(comment.id);
        const isOwnComment = comment.user_id?.toString() === user?.id?.toString();
        // Logic: User có thể edit/delete comment của chính mình HOẶC nếu có permission
        // Backend sẽ kiểm tra quyền chi tiết, frontend chỉ cần check permission cơ bản
        const hasUpdatePermission = hasPermission(Permissions.PROJECT_COMMENT_UPDATE);
        const hasDeletePermission = hasPermission(Permissions.PROJECT_COMMENT_DELETE);
        const canEdit = isOwnComment || hasUpdatePermission;
        const canDelete = isOwnComment || hasDeletePermission;

        // Debug log for first comment only
        if (comment.id === comments[0]?.id && !isReply) {
            console.log("Comment render debug:", {
                commentId: comment.id,
                isOwnComment,
                hasUpdatePermission,
                hasDeletePermission,
                canEdit,
                canDelete,
                userId: user?.id,
                commentUserId: comment.user_id
            });
        }

        return (
            <View key={comment.id} style={[styles.commentItem, isReply && styles.replyItem]}>
                <View style={styles.commentHeader}>
                    <View style={styles.commentAvatar}>
                        <Ionicons name="person" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.commentInfo}>
                        <Text style={styles.commentAuthor}>{comment.user?.name || "Người dùng"}</Text>
                        <Text style={styles.commentTime}>{formatDate(comment.created_at)}</Text>
                    </View>
                    {canEdit && !isReply && (
                        <View style={styles.commentActionsHeader}>
                            <TouchableOpacity
                                onPress={() => handleEditComment(comment)}
                                style={styles.editButton}
                            >
                                <Ionicons name="create-outline" size={18} color="#3B82F6" />
                            </TouchableOpacity>
                            {canDelete && (
                                <TouchableOpacity
                                    onPress={() => handleDeleteComment(comment.id)}
                                    style={styles.deleteButton}
                                >
                                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                    {canDelete && isReply && (
                        <TouchableOpacity
                            onPress={() => handleDeleteComment(comment.id)}
                            style={styles.deleteButton}
                        >
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                    )}
                </View>
                {editingComment === comment.id ? (
                    <View style={styles.editContainer}>
                        <TextInput
                            style={styles.editInput}
                            value={editText}
                            onChangeText={setEditText}
                            multiline
                            placeholderTextColor="#9CA3AF"
                            autoFocus
                        />
                        <View style={styles.editActions}>
                            <TouchableOpacity
                                style={styles.cancelEditButton}
                                onPress={handleCancelEdit}
                                disabled={submitting}
                            >
                                <Text style={styles.cancelEditText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveEditButton, submitting && styles.submitButtonDisabled]}
                                onPress={() => handleUpdateComment(comment.id)}
                                disabled={submitting || !editText.trim()}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.saveEditText}>Lưu</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <Text style={styles.commentContent}>{comment.content}</Text>
                )}
                {!isReply && (
                    <View style={styles.commentActions}>
                        <PermissionGuard permission={Permissions.PROJECT_COMMENT_CREATE}>
                            <TouchableOpacity
                                style={styles.replyButton}
                                onPress={() => {
                                    setReplyingTo(comment.id);
                                    setReplyText("");
                                }}
                            >
                                <Ionicons name="chatbubble-outline" size={16} color="#3B82F6" />
                                <Text style={styles.replyButtonText}>Phản hồi</Text>
                            </TouchableOpacity>
                        </PermissionGuard>
                        {hasReplies && (
                            <TouchableOpacity
                                style={styles.toggleRepliesButton}
                                onPress={() => toggleReplies(comment.id)}
                            >
                                <Ionicons
                                    name={isExpanded ? "chevron-up" : "chevron-down"}
                                    size={16}
                                    color="#6B7280"
                                />
                                <Text style={styles.toggleRepliesText}>
                                    {isExpanded ? "Ẩn" : "Hiện"} {replies.length} phản hồi
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
                {hasReplies && isExpanded && (
                    <View style={styles.repliesContainer}>
                        {replies.map((reply) => renderComment(reply, true))}
                    </View>
                )}
                {replyingTo === comment.id && !isReply && (
                    <View style={styles.replyInputContainer}>
                        <TextInput
                            style={styles.replyInput}
                            placeholder="Viết phản hồi..."
                            value={replyText}
                            onChangeText={setReplyText}
                            multiline
                            placeholderTextColor="#9CA3AF"
                        />
                        <View style={styles.replyActions}>
                            <TouchableOpacity
                                style={styles.cancelReplyButton}
                                onPress={() => {
                                    setReplyingTo(null);
                                    setReplyText("");
                                }}
                            >
                                <Text style={styles.cancelReplyText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.submitReplyButton, submitting && styles.submitButtonDisabled]}
                                onPress={() => handleSubmitReply(comment.id)}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.submitReplyText}>Gửi</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    // Debug: Log permissions for troubleshooting
    useEffect(() => {
        if (!permissionsLoading && permissions.length > 0) {
            console.log("User permissions:", permissions);
            console.log("Has PROJECT_COMMENT_CREATE:", hasPermission(Permissions.PROJECT_COMMENT_CREATE));
            console.log("Has PROJECT_COMMENT_UPDATE:", hasPermission(Permissions.PROJECT_COMMENT_UPDATE));
            console.log("Has PROJECT_COMMENT_DELETE:", hasPermission(Permissions.PROJECT_COMMENT_DELETE));
            console.log("User ID:", user?.id);
            console.log("User role:", user?.role);
            console.log("User owner:", user?.owner);
        }
    }, [permissions, permissionsLoading, hasPermission, user]);

    if (loading || permissionsLoading) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Bình Luận Dự Án" showBackButton />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    {permissionsLoading && (
                        <Text style={styles.loadingText}>Đang tải quyền...</Text>
                    )}
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
            <ScreenHeader title="Bình Luận Dự Án" showBackButton />
            <FlatList
                data={rootComments}
                renderItem={({ item }) => renderComment(item)}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 100 }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
                        <Text style={styles.emptyText}>Chưa có bình luận nào</Text>
                        <Text style={styles.emptySubtext}>Hãy là người đầu tiên bình luận!</Text>
                    </View>
                }
            />
            <PermissionGuard permission={Permissions.PROJECT_COMMENT_CREATE}>
                <View style={styles.inputContainer}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.commentInput}
                            placeholder="Viết bình luận..."
                            value={newComment}
                            onChangeText={setNewComment}
                            multiline
                            placeholderTextColor="#9CA3AF"
                            maxLength={1000}
                        />
                        <TouchableOpacity
                            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                            onPress={handleSubmitComment}
                            disabled={submitting || !newComment.trim()}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Ionicons name="send" size={20} color="#FFFFFF" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </PermissionGuard>
        </KeyboardAvoidingView>
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
    listContent: {
        padding: 16,
    },
    commentItem: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    replyItem: {
        marginLeft: 40,
        marginTop: 8,
        backgroundColor: "#F9FAFB",
    },
    commentHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    commentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#3B82F6",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    commentInfo: {
        flex: 1,
    },
    commentAuthor: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 2,
    },
    commentTime: {
        fontSize: 12,
        color: "#9CA3AF",
    },
    commentActionsHeader: {
        flexDirection: "row",
        gap: 8,
    },
    editButton: {
        padding: 4,
    },
    deleteButton: {
        padding: 4,
    },
    editContainer: {
        marginTop: 8,
        marginBottom: 12,
    },
    editInput: {
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: "#374151",
        minHeight: 80,
        maxHeight: 150,
        textAlignVertical: "top",
        borderWidth: 1,
        borderColor: "#3B82F6",
        marginBottom: 8,
    },
    editActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 8,
    },
    cancelEditButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    cancelEditText: {
        fontSize: 14,
        color: "#6B7280",
        fontWeight: "500",
    },
    saveEditButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: "#3B82F6",
        borderRadius: 6,
        minWidth: 60,
        alignItems: "center",
    },
    saveEditText: {
        fontSize: 14,
        color: "#FFFFFF",
        fontWeight: "600",
    },
    commentContent: {
        fontSize: 14,
        color: "#374151",
        lineHeight: 20,
        marginBottom: 12,
    },
    commentActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    replyButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    replyButtonText: {
        fontSize: 14,
        color: "#3B82F6",
        fontWeight: "500",
    },
    toggleRepliesButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    toggleRepliesText: {
        fontSize: 14,
        color: "#6B7280",
    },
    repliesContainer: {
        marginTop: 12,
        paddingLeft: 0,
    },
    replyInputContainer: {
        marginTop: 12,
        padding: 12,
        backgroundColor: "#F9FAFB",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    replyInput: {
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: "#374151",
        minHeight: 60,
        maxHeight: 120,
        textAlignVertical: "top",
        marginBottom: 8,
    },
    replyActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 8,
    },
    cancelReplyButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    cancelReplyText: {
        fontSize: 14,
        color: "#6B7280",
        fontWeight: "500",
    },
    submitReplyButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: "#3B82F6",
        borderRadius: 6,
    },
    submitReplyText: {
        fontSize: 14,
        color: "#FFFFFF",
        fontWeight: "600",
    },
    inputContainer: {
        backgroundColor: "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        padding: 12,
        paddingBottom: 16,
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 8,
    },
    commentInput: {
        flex: 1,
        backgroundColor: "#F9FAFB",
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        color: "#374151",
        maxHeight: 100,
        textAlignVertical: "top",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    submitButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#3B82F6",
        justifyContent: "center",
        alignItems: "center",
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 64,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#6B7280",
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: "#9CA3AF",
        marginTop: 8,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: "#6B7280",
    },
});
