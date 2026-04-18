import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { changeRequestApi, ChangeRequest } from "@/api/changeRequestApi";
import { ScreenHeader, PermissionDenied } from "@/components";
import { PermissionGuard } from "@/components/PermissionGuard";
import { Permissions } from "@/constants/Permissions";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";

const STATUS_COLORS: Record<string, string> = {
  draft: "#6B7280",
  submitted: "#F59E0B",
  under_review: "#3B82F6",
  approved: "#10B981",
  rejected: "#EF4444",
  implemented: "#8B5CF6",
  cancelled: "#9CA3AF"
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Nháp",
  submitted: "Đã gửi y/c",
  under_review: "Đang xem xét",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  implemented: "Đã thực hiện",
  cancelled: "Đã hủy"
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#DC2626",
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#10B981"
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Khẩn cấp",
  high: "Cao",
  medium: "Trung bình",
  low: "Thấp"
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
  scope: "Phạm vi",
  schedule: "Tiến độ",
  cost: "Chi phí",
  quality: "Chất lượng",
  resource: "Nhân sự",
  other: "Khác"
};

export default function ChangeRequestDetailScreen() {
  const router = useRouter();
  const { id, requestId } = useLocalSearchParams<{ id: string; requestId: string }>();
  const tabBarHeight = useTabBarHeight();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [request, setRequest] = useState<ChangeRequest | null>(null);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveNotes, setApproveNotes] = useState("");

  useEffect(() => {
    loadData();
  }, [id, requestId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await changeRequestApi.getChangeRequest(id!, requestId!);
      if (res.success) {
        setRequest(res.data);
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể tải cấu hình thay đổi");
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAction = async (action: string) => {
    let confirmMsg = "";
    switch (action) {
      case "submit":
        confirmMsg = "Gửi yêu cầu thay đổi này để xem xét?";
        break;
      case "implement":
        confirmMsg = "Đánh dấu yêu cầu thay đổi này đã được thực hiện?";
        break;
    }

    Alert.alert("Xác nhận", confirmMsg, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đồng ý",
        onPress: async () => {
          try {
            setActionLoading(true);
            let res;
            if (action === "submit") {
              res = await changeRequestApi.submitChangeRequest(id!, requestId!);
            } else if (action === "implement") {
              res = await changeRequestApi.markAsImplemented(id!, requestId!);
            }
            if (res?.success) {
              Alert.alert("Thành công", res.message);
              loadData();
            }
          } catch (e: any) {
            Alert.alert("Lỗi", e.response?.data?.message || "Thao tác thất bại");
          } finally {
            setActionLoading(false);
          }
        }
      }
    ]);
  };

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      const res = await changeRequestApi.approveChangeRequest(id!, requestId!, approveNotes);
      if (res.success) {
        Alert.alert("Thành công", res.message);
        setShowApproveModal(false);
        loadData();
      }
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Không thể phê duyệt");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập lý do từ chối");
      return;
    }
    try {
      setActionLoading(true);
      const res = await changeRequestApi.rejectChangeRequest(id!, requestId!, rejectReason);
      if (res.success) {
        Alert.alert("Thành công", res.message);
        setShowRejectModal(false);
        loadData();
      }
    } catch (e: any) {
      Alert.alert("Lỗi", e.response?.data?.message || "Không thể từ chối");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Chi Tiết Yêu Cầu" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  if (!request) return null;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Chi Tiết Yêu Cầu" showBackButton />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Status Badge */}
        <View style={styles.headerArea}>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[request.status] + "20" }]}>
            <Text style={[styles.statusText, { color: STATUS_COLORS[request.status] }]}>
              {STATUS_LABELS[request.status]}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: PRIORITY_COLORS[request.priority] + "20" }]}>
            <Text style={[styles.statusText, { color: PRIORITY_COLORS[request.priority] }]}>
              {PRIORITY_LABELS[request.priority]}
            </Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.card}>
          <Text style={styles.title}>{request.title}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Loại thay đổi</Text>
            <Text style={styles.value}>{CHANGE_TYPE_LABELS[request.change_type]}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Người yêu cầu</Text>
            <Text style={styles.value}>{request.requester?.name || "N/A"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Ngày tạo</Text>
            <Text style={styles.value}>{new Date(request.created_at).toLocaleDateString("vi-VN")}</Text>
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nội Dung Khóa Học & Đánh Giá</Text>
          <Text style={styles.sectionTitle}>Mô tả</Text>
          <Text style={styles.description}>{request.description}</Text>

          {request.reason && (
            <>
              <Text style={styles.sectionTitle}>Lý do thay đổi</Text>
              <Text style={styles.description}>{request.reason}</Text>
            </>
          )}

          {request.impact_analysis && (
            <>
              <Text style={styles.sectionTitle}>Đánh giá tác động</Text>
              <Text style={styles.description}>{request.impact_analysis}</Text>
            </>
          )}

          {(request.estimated_cost_impact || request.estimated_schedule_impact_days) ? (
             <View style={styles.impactsContainer}>
               {request.estimated_cost_impact ? (
                 <View style={styles.impactRow}>
                    <Text style={styles.label}>Tác động chi phí:</Text>
                    <Text style={[styles.value, { color: '#F59E0B' }]}>
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(request.estimated_cost_impact)}
                    </Text>
                 </View>
               ) : null}
               {request.estimated_schedule_impact_days ? (
                 <View style={styles.impactRow}>
                    <Text style={styles.label}>Tác động tiến độ (ngày):</Text>
                    <Text style={[styles.value, { color: '#EF4444' }]}>{request.estimated_schedule_impact_days} ngày</Text>
                 </View>
               ) : null}
             </View>
          ) : null}
        </View>

        {/* Approval Card */}
        {(request.status === "approved" || request.status === "implemented" || request.status === "rejected") && (
          <View style={styles.card}>
             <Text style={styles.cardTitle}>Thông Tin Phê Duyệt</Text>
             {request.status === "rejected" ? (
               <>
                 <View style={styles.infoRow}>
                   <Text style={styles.label}>Bị từ chối bởi</Text>
                   <Text style={[styles.value, { color: '#EF4444' }]}>{request.approver?.name || "N/A"}</Text>
                 </View>
                 <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>Lý do từ chối</Text>
                 <Text style={styles.description}>{request.rejection_reason}</Text>
               </>
             ) : (
               <>
                 <View style={styles.infoRow}>
                   <Text style={styles.label}>Phê duyệt bởi</Text>
                   <Text style={styles.value}>{request.approver?.name || "N/A"}</Text>
                 </View>
                 <View style={styles.infoRow}>
                   <Text style={styles.label}>Ngày duyệt</Text>
                   <Text style={styles.value}>{request.approved_at ? new Date(request.approved_at).toLocaleDateString("vi-VN") : "N/A"}</Text>
                 </View>
                 {request.notes && (
                   <>
                    <Text style={styles.sectionTitle}>Ghi chú phê duyệt</Text>
                    <Text style={styles.description}>{request.notes}</Text>
                   </>
                 )}
               </>
             )}
          </View>
        )}
      </ScrollView>

      {/* Action Bar Bottom Fixed */}
      <View style={styles.actionBar}>
        {request.status === "draft" && (
          <PermissionGuard permission={Permissions.PROJECT_REPORT_CREATE} projectId={id}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#3B82F6" }]}
              onPress={() => handleAction("submit")}
              disabled={actionLoading}
            >
              {actionLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.actionBtnText}>Gửi Yêu Cầu</Text>}
            </TouchableOpacity>
          </PermissionGuard>
        )}
        
        {(request.status === "submitted" || request.status === "under_review") && (
           <PermissionGuard permission={Permissions.PROJECT_REPORT_UPDATE} projectId={id}>
              <View style={styles.rowActions}>
                 <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#EF4444", flex: 1, marginRight: 8 }]}
                    onPress={() => setShowRejectModal(true)}
                    disabled={actionLoading}
                 >
                    <Text style={styles.actionBtnText}>Từ Chối</Text>
                 </TouchableOpacity>
                 <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#10B981", flex: 1 }]}
                    onPress={() => setShowApproveModal(true)}
                    disabled={actionLoading}
                 >
                    <Text style={styles.actionBtnText}>Duyệt</Text>
                 </TouchableOpacity>
              </View>
           </PermissionGuard>
        )}

        {request.status === "approved" && (
           <PermissionGuard permission={Permissions.PROJECT_REPORT_UPDATE} projectId={id}>
             <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#8B5CF6" }]}
              onPress={() => handleAction("implement")}
              disabled={actionLoading}
             >
                {actionLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.actionBtnText}>Đánh dấu Đã Thực Hiện</Text>}
             </TouchableOpacity>
           </PermissionGuard>
        )}
      </View>

      {/* Approve Modal */}
      <Modal visible={showApproveModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
           <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Phê Duyệt Yêu Cầu</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ghi chú thêm (không bắt buộc)..."
                value={approveNotes}
                onChangeText={setApproveNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#F3F4F6" }]} onPress={() => setShowApproveModal(false)}>
                  <Text style={{ color: "#4B5563", fontWeight: '600' }}>Hủy Bỏ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#10B981" }]} onPress={handleApprove} disabled={actionLoading}>
                  {actionLoading ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: "#FFF", fontWeight: '600' }}>Xác Nhận</Text>}
                </TouchableOpacity>
              </View>
           </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reject Modal */}
      <Modal visible={showRejectModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
           <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Từ Chối Yêu Cầu</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Lý do từ chối (bắt buộc)..."
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#F3F4F6" }]} onPress={() => setShowRejectModal(false)}>
                  <Text style={{ color: "#4B5563", fontWeight: '600' }}>Hủy Bỏ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#EF4444" }, !rejectReason.trim() && { opacity: 0.5 }]} disabled={!rejectReason.trim() || actionLoading} onPress={handleReject}>
                  {actionLoading ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: "#FFF", fontWeight: '600' }}>Xác Nhận</Text>}
                </TouchableOpacity>
              </View>
           </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  headerArea: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: "#6B7280",
  },
  value: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 12,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 8,
  },
  impactsContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700'
  },
  rowActions: {
    flexDirection: 'row',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 16,
    backgroundColor: '#F9FAFB'
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  }
});
