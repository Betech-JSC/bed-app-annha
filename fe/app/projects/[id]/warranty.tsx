import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Linking,
  Platform,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useFocusEffect, useRouter } from "expo-router";
import { useSelector } from "react-redux";
import type { RootState } from "@/reducers/index";
import { warrantyApi, ProjectWarranty, ProjectMaintenance } from "@/api/warrantyApi";
import { projectApi, Project } from "@/api/projectApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, PermissionDenied, DatePickerInput, UniversalFileUploader } from "@/components";
import ImageViewer from "@/components/ImageViewer";
import { UploadedFile } from "@/components/UniversalFileUploader";
import { useProjectPermissions } from "@/hooks/usePermissions";
import { Permissions } from "@/constants/Permissions";
import { format, addMonths } from "date-fns";
import { vi } from "date-fns/locale";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function WarrantyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSelector((state: RootState) => state.user);
  const [warranties, setWarranties] = useState<ProjectWarranty[]>([]);
  const [maintenances, setMaintenances] = useState<ProjectMaintenance[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingWarrantyUuid, setEditingWarrantyUuid] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  
  const [selectedWarranty, setSelectedWarranty] = useState<ProjectWarranty | null>(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState<ProjectMaintenance | null>(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [initialImageIndex, setInitialImageIndex] = useState(0);
  const [activeAttachments, setActiveAttachments] = useState<any[]>([]);

  const statusColors: any = {
    draft: "#94A3B8", // Slate 400
    pending_customer: "#F59E0B", // Amber 500
    approved: "#10B981", // Emerald 500
    rejected: "#F43F5E", // Rose 500
  };

  const statusLabels: any = {
    draft: "Nháp",
    pending_customer: "Chờ KH duyệt",
    approved: "Đã duyệt",
    rejected: "Từ chối",
  };

  const buttonGradients: any = {
    approve: ["#10B981", "#059669"],
    reject: ["#F43F5E", "#E11D48"],
    submit: ["#6366F1", "#4F46E5"],
    close: ["#475569", "#1E293B"],
  };

  // Warranty Form State
  const [showWarrantyForm, setShowWarrantyForm] = useState(false);
  const [warrantyFormData, setWarrantyFormData] = useState({
    handover_date: format(new Date(), "yyyy-MM-dd"),
    warranty_content: "",
    warranty_start_date: format(new Date(), "yyyy-MM-dd"),
    warranty_end_date: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), "yyyy-MM-dd"),
    notes: "",
    attachment_ids: [] as number[],
  });
  const [warrantyFiles, setWarrantyFiles] = useState<UploadedFile[]>([]);

  // Maintenance Form State
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [maintenanceFormData, setMaintenanceFormData] = useState({
    maintenance_date: format(new Date(), "yyyy-MM-dd"),
    next_maintenance_date: format(addMonths(new Date(), 6), "yyyy-MM-dd"),
    notes: "",
    attachment_ids: [] as number[],
  });
  const [maintenanceFiles, setMaintenanceFiles] = useState<UploadedFile[]>([]);
  const [editingMaintenanceUuid, setEditingMaintenanceUuid] = useState<string | null>(null);

  const { hasPermission, loading: loadingPermissions } = useProjectPermissions(id);

  useEffect(() => {
    loadProject();
    fetchData();
  }, [id]);

  useFocusEffect(
    React.useCallback(() => {
      if (id) {
        fetchData();
      }
    }, [id])
  );

  const loadProject = async () => {
    try {
      const response = await projectApi.getProject(id!);
      if (response.success) {
        setProject(response.data);
      }
    } catch (error) {
      console.error("Error loading project:", error);
    }
  };

  const fetchData = async () => {
    try {
      if (!refreshing) setLoading(true);
      setPermissionDenied(false);
      const response = await warrantyApi.getWarranties(id!);
      if (response.success) {
        setWarranties(response.data.warranties || []);
        setMaintenances(response.data.maintenances || []);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        setPermissionDenied(true);
        setPermissionMessage(error.response?.data?.message || "Bạn không có quyền xem thông tin bảo hành của dự án này.");
      } else {
        console.error("Error loading warranty data:", error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleApprove = (uuid: string) => {
    Alert.alert(
      "Xác nhận",
      "Bạn có chắc muốn duyệt phiếu bảo hành này không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Duyệt",
          onPress: async () => {
            try {
              const response = await warrantyApi.approveWarranty(id!, uuid);
              if (response.success) {
                Alert.alert("Thành công", "Đã duyệt phiếu bảo hành.");
                fetchData();
              }
            } catch (error) {
              Alert.alert("Lỗi", "Không thể duyệt phiếu bảo hành.");
            }
          },
        },
      ]
    );
  };

  const handleReject = (uuid: string) => {
    Alert.alert(
      "Xác nhận",
      "Bạn có chắc muốn từ chối phiếu bảo hành này không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Từ chối",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await warrantyApi.rejectWarranty(id!, uuid);
              if (response.success) {
                Alert.alert("Thành công", "Đã từ chối phiếu bảo hành.");
                fetchData();
              }
            } catch (error) {
              Alert.alert("Lỗi", "Không thể từ chối phiếu bảo hành.");
            }
          },
        },
      ]
    );
  };

  const handleSubmitWarranty = (uuid: string) => {
    Alert.alert(
      "Xác nhận gửi duyệt",
      "Bạn có chắc muốn gửi phiếu bảo hành này cho khách hàng duyệt không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Gửi duyệt",
          onPress: async () => {
            try {
              const response = await warrantyApi.submitWarranty(id!, uuid);
              if (response.success) {
                Alert.alert("Thành công", "Đã gửi phiếu bảo hành cho khách hàng.");
                fetchData();
              }
            } catch (error) {
              Alert.alert("Lỗi", "Không thể gửi phiếu bảo hành.");
            }
          },
        },
      ]
    );
  };

  const handleDeleteWarranty = (uuid: string) => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc muốn xóa phiếu bảo hành này không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await warrantyApi.destroyWarranty(id!, uuid);
              if (response.success) {
                Alert.alert("Thành công", "Đã xóa phiếu bảo hành.");
                fetchData();
              }
            } catch (error) {
              Alert.alert("Lỗi", "Không thể xóa phiếu bảo hành.");
            }
          },
        },
      ]
    );
  };

  const handleApproveMaintenance = (uuid: string) => {
    Alert.alert(
      "Xác nhận duyệt",
      "Bạn có chắc muốn duyệt phiếu bảo trì này không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Duyệt",
          onPress: async () => {
            try {
              const response = await warrantyApi.approveMaintenance(id as string, uuid);
              if (response.success) {
                Alert.alert("Thành công", "Đã duyệt phiếu bảo trì.");
                fetchData();
                setSelectedMaintenance(null);
              }
            } catch (error) {
              Alert.alert("Lỗi", "Không thể duyệt phiếu bảo trì.");
            }
          },
        },
      ]
    );
  };

  const handleRejectMaintenance = (uuid: string) => {
    Alert.alert(
      "Xác nhận",
      "Bạn có chắc muốn từ chối phiếu bảo trì này không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Từ chối",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await warrantyApi.rejectMaintenance(id as string, uuid);
              if (response.success) {
                Alert.alert("Thành công", "Đã từ chối phiếu bảo trì.");
                fetchData();
                setSelectedMaintenance(null);
              }
            } catch (error) {
              Alert.alert("Lỗi", "Không thể từ chối phiếu bảo trì.");
            }
          },
        },
      ]
    );
  };

  const handleSubmitMaintenance = (uuid: string) => {
    Alert.alert(
      "Xác nhận gửi duyệt",
      "Bạn có chắc muốn gửi phiếu bảo trì này cho khách hàng duyệt không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Gửi duyệt",
          onPress: async () => {
            try {
              const response = await warrantyApi.submitMaintenance(id as string, uuid);
              if (response.success) {
                Alert.alert("Thành công", "Đã gửi phiếu bảo trì cho khách hàng.");
                fetchData();
              }
            } catch (error) {
              Alert.alert("Lỗi", "Không thể gửi phiếu bảo trì.");
            }
          },
        },
      ]
    );
  };

  const handleDeleteMaintenance = (uuid: string) => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc muốn xóa phiếu bảo trì này không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await warrantyApi.destroyMaintenance(id as string, uuid);
              if (response.success) {
                Alert.alert("Thành công", "Đã xóa phiếu bảo trì.");
                fetchData();
              }
            } catch (error) {
              Alert.alert("Lỗi", "Không thể xóa phiếu bảo trì.");
            }
          },
        },
      ]
    );
  };

  const handleCreateWarranty = async () => {
    if (!warrantyFormData.warranty_content) {
      Alert.alert("Lỗi", "Vui lòng nhập nội dung bảo hành.");
      return;
    }

    try {
      setSaving(true);
      let response;
      if (editingWarrantyUuid) {
        response = await warrantyApi.updateWarranty(id!, editingWarrantyUuid, warrantyFormData);
      } else {
        response = await warrantyApi.createWarranty(id!, warrantyFormData);
      }
      
      if (response.success) {
        Alert.alert("Thành công", editingWarrantyUuid ? "Đã cập nhật phiếu bảo hành." : "Đã tạo phiếu bảo hành.");
        setShowWarrantyForm(false);
        setEditingWarrantyUuid(null);
        fetchData();
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể lưu phiếu bảo hành.");
    } finally {
      setSaving(false);
    }
  };

  const openEditWarranty = (item: ProjectWarranty) => {
    setWarrantyFormData({
      handover_date: item.handover_date.split("T")[0],
      warranty_content: item.warranty_content,
      warranty_start_date: item.warranty_start_date.split("T")[0],
      warranty_end_date: item.warranty_end_date.split("T")[0],
      notes: item.notes || "",
      attachment_ids: item.attachments?.map(a => a.id) || [],
    });
    setWarrantyFiles(item.attachments || []);
    setEditingWarrantyUuid(item.uuid);
    setShowWarrantyForm(true);
  };

  const openEditMaintenance = (item: ProjectMaintenance) => {
    setMaintenanceFormData({
      maintenance_date: item.maintenance_date.split(" ")[0],
      next_maintenance_date: item.next_maintenance_date.split(" ")[0],
      notes: item.notes || "",
      attachment_ids: item.attachments?.map(a => a.id) || [],
    });
    setMaintenanceFiles(item.attachments || []);
    setEditingMaintenanceUuid(item.uuid);
    setShowMaintenanceForm(true);
  };

  const handleCreateMaintenance = async () => {
    if (!maintenanceFormData.maintenance_date) {
      Alert.alert("Lỗi", "Vui lòng chọn ngày thực hiện.");
      return;
    }

    try {
      setSaving(true);
      let response;
      if (editingMaintenanceUuid) {
        response = await warrantyApi.updateMaintenance(id as string, editingMaintenanceUuid, maintenanceFormData);
      } else {
        response = await warrantyApi.createMaintenance(id as string, maintenanceFormData);
      }

      if (response.success) {
        Alert.alert("Thành công", editingMaintenanceUuid ? "Đã cập nhật phiếu bảo trì." : "Đã tạo phiếu bảo trì mới.");
        setShowMaintenanceForm(false);
        setEditingMaintenanceUuid(null);
        resetMaintenanceForm();
        fetchData();
      }
    } catch (error: any) {
      console.error("Save maintenance error:", error);
      Alert.alert("Lỗi", error?.response?.data?.message || "Không thể lưu phiếu bảo trì.");
    } finally {
      setSaving(false);
    }
  };

  const resetWarrantyForm = () => {
    setWarrantyFormData({
      handover_date: format(new Date(), "yyyy-MM-dd"),
      warranty_content: "",
      warranty_start_date: format(new Date(), "yyyy-MM-dd"),
      warranty_end_date: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), "yyyy-MM-dd"),
      notes: "",
      attachment_ids: [],
    });
    setWarrantyFiles([]);
    setEditingWarrantyUuid(null);
  };

  const resetMaintenanceForm = () => {
    setMaintenanceFormData({
      maintenance_date: format(new Date(), "yyyy-MM-dd"),
      next_maintenance_date: format(addMonths(new Date(), 6), "yyyy-MM-dd"),
      notes: "",
      attachment_ids: [],
    });
    setMaintenanceFiles([]);
    setEditingMaintenanceUuid(null);
  };

  const renderWarrantyItem = (item: ProjectWarranty) => {
    const isCustomer = project?.customer_id?.toString() === user?.id?.toString();
    const canApprove = hasPermission(Permissions.WARRANTY_APPROVE) || isCustomer;

    return (
      <View key={item.uuid} style={styles.card}>
        <TouchableOpacity 
          onPress={() => setSelectedWarranty(item)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Phiếu Bảo Hành</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] + "15", borderColor: statusColors[item.status] + "30" }]}>
              <Text style={[styles.statusText, { color: statusColors[item.status] }]}>{statusLabels[item.status]}</Text>
            </View>
            <View style={styles.headerRightActions}>
              {item.status === "draft" && hasPermission(Permissions.WARRANTY_UPDATE) && (
                <TouchableOpacity onPress={() => openEditWarranty(item)} style={styles.headerIconBtn}>
                  <Ionicons name="create-outline" size={20} color="#3B82F6" />
                </TouchableOpacity>
              )}
              {hasPermission(Permissions.WARRANTY_DELETE) && (
                <TouchableOpacity onPress={() => handleDeleteWarranty(item.uuid)} style={styles.headerIconBtn}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text style={styles.infoLabel}>Ngày bàn giao:</Text>
              <Text style={styles.infoValue}>{format(new Date(item.handover_date), "dd/MM/yyyy")}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color="#6B7280" />
              <Text style={styles.infoLabel}>Thời hạn:</Text>
              <Text style={styles.infoValue}>
                {format(new Date(item.warranty_start_date), "dd/MM/yyyy")} - {format(new Date(item.warranty_end_date), "dd/MM/yyyy")}
              </Text>
            </View>

            <View style={styles.contentBox}>
              <Text style={styles.contentText} numberOfLines={2}>{item.warranty_content}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {item.status === "draft" && hasPermission(Permissions.WARRANTY_UPDATE) && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => handleSubmitWarranty(item.uuid)}
            >
              <LinearGradient
                colors={buttonGradients.submit}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientActionBtn}
              >
                <Text style={styles.actionButtonText}>Gửi cho khách hàng duyệt</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {item.status === "pending_customer" && canApprove && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => handleReject(item.uuid)}
            >
              <LinearGradient
                colors={buttonGradients.reject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientActionBtn}
              >
                <Text style={styles.actionButtonText}>Từ chối</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => handleApprove(item.uuid)}
            >
              <LinearGradient
                colors={buttonGradients.approve}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientActionBtn}
              >
                <Text style={styles.actionButtonText}>Duyệt</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderMaintenanceItem = (item: ProjectMaintenance) => {
    const isCustomer = project?.customer_id?.toString() === user?.id?.toString();
    const canApprove = hasPermission(Permissions.WARRANTY_APPROVE) || isCustomer;

    return (
      <View key={item.uuid} style={styles.card}>
        <TouchableOpacity 
          onPress={() => setSelectedMaintenance(item)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Lịch Bảo Trì</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] + "15", borderColor: statusColors[item.status] + "30" }]}>
              <Text style={[styles.statusText, { color: statusColors[item.status] }]}>{statusLabels[item.status] || "Hoàn thành"}</Text>
            </View>
            <View style={styles.headerRightActions}>
              {item.status === "draft" && hasPermission(Permissions.WARRANTY_UPDATE) && (
                <TouchableOpacity onPress={() => openEditMaintenance(item)} style={styles.headerIconBtn}>
                  <Ionicons name="create-outline" size={20} color="#3B82F6" />
                </TouchableOpacity>
              )}
              {hasPermission(Permissions.WARRANTY_DELETE) && (
                <TouchableOpacity onPress={() => handleDeleteMaintenance(item.uuid)} style={styles.headerIconBtn}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text style={styles.infoLabel}>Ngày thực hiện:</Text>
              <Text style={styles.infoValue}>{format(new Date(item.maintenance_date), "dd/MM/yyyy")}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="repeat-outline" size={16} color="#6B7280" />
              <Text style={styles.infoLabel}>Lần tiếp theo:</Text>
              <Text style={[styles.infoValue, { color: "#3B82F6", fontWeight: "bold" }]}>
                {format(new Date(item.next_maintenance_date), "dd/MM/yyyy")}
              </Text>
            </View>

            {item.notes && (
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>{item.notes}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {item.status === "draft" && hasPermission(Permissions.WARRANTY_UPDATE) && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => handleSubmitMaintenance(item.uuid)}
            >
              <LinearGradient
                colors={buttonGradients.submit}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientActionBtn}
              >
                <Text style={styles.actionButtonText}>Gửi cho khách hàng duyệt</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {item.status === "pending_customer" && canApprove && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => handleRejectMaintenance(item.uuid)}
            >
              <LinearGradient
                colors={buttonGradients.reject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientActionBtn}
              >
                <Text style={styles.actionButtonText}>Từ chối</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => handleApproveMaintenance(item.uuid)}
            >
              <LinearGradient
                colors={buttonGradients.approve}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientActionBtn}
              >
                <Text style={styles.actionButtonText}>Duyệt</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const canView = hasPermission(Permissions.WARRANTY_VIEW);

  if (loading || loadingPermissions) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Bảo Hành & Bảo Trì" showBackButton />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  if (!canView || permissionDenied) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Bảo Hành & Bảo Trì" showBackButton />
        <PermissionDenied message={permissionMessage || "Bạn không có quyền xem thông tin bảo hành của dự án này."} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Bảo Hành & Bảo Trì" showBackButton />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Phiếu bảo hành</Text>
            {hasPermission(Permissions.WARRANTY_CREATE) && (
              <TouchableOpacity onPress={() => {
                resetWarrantyForm();
                setShowWarrantyForm(true);
              }} style={styles.addBtn}>
                <Ionicons name="add" size={24} color="#3B82F6" />
              </TouchableOpacity>
            )}
          </View>
          {warranties.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Chưa có phiếu bảo hành nào</Text>
            </View>
          ) : (
            warranties.map(renderWarrantyItem)
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Lịch sử bảo trì</Text>
            {hasPermission(Permissions.WARRANTY_CREATE) && (
              <TouchableOpacity onPress={() => {
                resetMaintenanceForm();
                setShowMaintenanceForm(true);
              }} style={styles.addBtn}>
                <Ionicons name="add" size={24} color="#3B82F6" />
              </TouchableOpacity>
            )}
          </View>
          {maintenances.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="construct-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Chưa có lịch sử bảo trì</Text>
            </View>
          ) : (
            maintenances.map(renderMaintenanceItem)
          )}
        </View>
      </ScrollView>

      {/* Warranty Form Modal */}
      <Modal visible={showWarrantyForm} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingWarrantyUuid ? "Cập nhật phiếu bảo hành" : "Tạo phiếu bảo hành"}</Text>
              <TouchableOpacity onPress={() => {
                setShowWarrantyForm(false);
                setEditingWarrantyUuid(null);
              }}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              <DatePickerInput
                label="Ngày bàn giao"
                value={warrantyFormData.handover_date}
                onDateChange={(date) => setWarrantyFormData({ ...warrantyFormData, handover_date: date })}
                required
              />
              <DatePickerInput
                label="Ngày bắt đầu"
                value={warrantyFormData.warranty_start_date}
                onDateChange={(date) => setWarrantyFormData({ ...warrantyFormData, warranty_start_date: date })}
                required
              />
              <DatePickerInput
                label="Ngày kết thúc"
                value={warrantyFormData.warranty_end_date}
                onDateChange={(date) => setWarrantyFormData({ ...warrantyFormData, warranty_end_date: date })}
                required
              />
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nội dung bảo hành *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  multiline
                  numberOfLines={4}
                  placeholder="Nhập nội dung bảo hành..."
                  value={warrantyFormData.warranty_content}
                  onChangeText={(text) => setWarrantyFormData({ ...warrantyFormData, warranty_content: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Ghi chú</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  multiline
                  numberOfLines={3}
                  placeholder="Ghi chú thêm..."
                  value={warrantyFormData.notes}
                  onChangeText={(text) => setWarrantyFormData({ ...warrantyFormData, notes: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Tài liệu đính kèm</Text>
                <UniversalFileUploader
                  onUploadComplete={(files) => {
                    setWarrantyFiles(files);
                    setWarrantyFormData({
                      ...warrantyFormData,
                      attachment_ids: files.map((f) => f.attachment_id || f.id).filter(Boolean) as number[],
                    });
                  }}
                  initialFiles={warrantyFiles}
                  multiple
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowWarrantyForm(false)}>
                <LinearGradient
                  colors={buttonGradients.close}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.cancelBtnText}>Hủy</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateWarranty} disabled={saving}>
                <LinearGradient
                  colors={buttonGradients.submit}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientButton}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>Lưu</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Maintenance Form Modal */}
      <Modal visible={showMaintenanceForm} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingMaintenanceUuid ? "Cập nhật phiếu bảo trì" : "Ghi nhận bảo trì"}</Text>
              <TouchableOpacity onPress={() => {
                setShowMaintenanceForm(false);
                setEditingMaintenanceUuid(null);
                resetMaintenanceForm();
              }}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              <DatePickerInput
                label="Ngày thực hiện"
                value={maintenanceFormData.maintenance_date}
                onDateChange={(date) => {
                  const nextDate = format(addMonths(new Date(date), 6), "yyyy-MM-dd");
                  setMaintenanceFormData({ 
                    ...maintenanceFormData, 
                    maintenance_date: date,
                    next_maintenance_date: nextDate 
                  });
                }}
                required
              />

              <DatePickerInput
                label="Ngày bảo trì tiếp theo"
                value={maintenanceFormData.next_maintenance_date}
                onDateChange={(date) => setMaintenanceFormData({ ...maintenanceFormData, next_maintenance_date: date })}
                required
              />
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Ghi chú / Nội dung bảo trì</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  multiline
                  numberOfLines={4}
                  placeholder="Nhập nội dung đã bảo trì..."
                  value={maintenanceFormData.notes}
                  onChangeText={(text) => setMaintenanceFormData({ ...maintenanceFormData, notes: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Tài liệu đính kèm</Text>
                <UniversalFileUploader
                  onUploadComplete={(files) => {
                    setMaintenanceFiles(files);
                    setMaintenanceFormData({
                      ...maintenanceFormData,
                      attachment_ids: files.map((f) => f.attachment_id || f.id).filter(Boolean) as number[],
                    });
                  }}
                  initialFiles={maintenanceFiles}
                  multiple
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                setShowMaintenanceForm(false);
                setEditingMaintenanceUuid(null);
                resetMaintenanceForm();
              }}>
                <LinearGradient
                  colors={buttonGradients.close}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.cancelBtnText}>Hủy</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateMaintenance} disabled={saving}>
                <LinearGradient
                  colors={buttonGradients.submit}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientButton}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>{editingMaintenanceUuid ? "Cập nhật" : "Lưu"}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Warranty Detail Modal */}
      <Modal visible={!!selectedWarranty} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setSelectedWarranty(null)}>
        <SafeAreaView style={styles.fullscreenModalContainer}>
          <View style={styles.fullscreenHeader}>
            <TouchableOpacity onPress={() => setSelectedWarranty(null)} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.fullscreenTitle}>Chi tiết phiếu bảo hành</Text>
            <View style={{ width: 44 }} />
          </View>

          {selectedWarranty && (
            <ScrollView style={styles.fullscreenBody}>
              <View style={[styles.detailStatusBadge, { backgroundColor: statusColors[selectedWarranty.status] + "20", borderColor: statusColors[selectedWarranty.status] + "40" }]}>
                <Text style={[styles.detailStatusText, { color: statusColors[selectedWarranty.status] }]}>{statusLabels[selectedWarranty.status] || "Hoàn thành"}</Text>
              </View>

              <View style={styles.infoCard}>
                <View style={styles.fullscreenInfoRow}>
                  <Text style={styles.fullscreenInfoLabel}>Ngày bàn giao</Text>
                  <Text style={styles.fullscreenInfoValue}>{format(new Date(selectedWarranty.handover_date), "dd/MM/yyyy")}</Text>
                </View>
                <View style={styles.fullscreenDivider} />
                <View style={styles.fullscreenInfoRow}>
                  <Text style={styles.fullscreenInfoLabel}>Ngày bắt đầu</Text>
                  <Text style={styles.fullscreenInfoValue}>{format(new Date(selectedWarranty.warranty_start_date), "dd/MM/yyyy")}</Text>
                </View>
                <View style={styles.fullscreenDivider} />
                <View style={styles.fullscreenInfoRow}>
                  <Text style={styles.fullscreenInfoLabel}>Ngày kết thúc</Text>
                  <Text style={styles.fullscreenInfoValue}>{format(new Date(selectedWarranty.warranty_end_date), "dd/MM/yyyy")}</Text>
                </View>
                <View style={styles.fullscreenDivider} />
                <View style={styles.fullscreenInfoRow}>
                  <Text style={styles.fullscreenInfoLabel}>Người tạo</Text>
                  <Text style={styles.fullscreenInfoValue}>{selectedWarranty.creator?.name || "N/A"}</Text>
                </View>
              </View>

              <View style={styles.descriptionSection}>
                <Text style={styles.fullscreenSectionTitle}>Nội dung bảo hành</Text>
                <View style={styles.readOnlyDescription}>
                  <Text style={styles.descriptionText}>{selectedWarranty.warranty_content}</Text>
                </View>
              </View>

              {selectedWarranty.notes && (
                <View style={styles.descriptionSection}>
                  <Text style={styles.fullscreenSectionTitle}>Ghi chú</Text>
                  <View style={styles.readOnlyDescription}>
                    <Text style={styles.descriptionText}>{selectedWarranty.notes}</Text>
                  </View>
                </View>
              )}

              {selectedWarranty.attachments && selectedWarranty.attachments.length > 0 && (
                <View style={styles.descriptionSection}>
                  <Text style={styles.sectionTitle}>Tài liệu đính kèm ({selectedWarranty.attachments.length})</Text>
                  <View style={styles.attachmentList}>
                    {selectedWarranty.attachments.map((file, idx) => (
                      <TouchableOpacity 
                        key={idx} 
                        style={styles.attachmentItem}
                        onPress={() => {
                          const allFiles = selectedWarranty.attachments!;
                          if (file.type === "image" || (file.original_name && /\.(jpg|jpeg|png|gif)$/i.test(file.original_name)) || (file.mime_type && file.mime_type.startsWith('image/'))) {
                            const imageFiles = allFiles.filter(f => f.type === "image" || (f.original_name && /\.(jpg|jpeg|png|gif)$/i.test(f.original_name)) || (f.mime_type && f.mime_type.startsWith('image/')));
                            const index = imageFiles.findIndex(f => f.uuid === file.uuid || f.id === file.id);
                            setActiveAttachments(imageFiles.map(f => ({ uri: f.file_url || f.url, name: f.original_name })));
                            setInitialImageIndex(index !== -1 ? index : 0);
                            setImageViewerVisible(true);
                          } else if (file.file_url || file.url) {
                            Linking.openURL(file.file_url || file.url || "").catch(err => {
                              console.error("Failed to open URL:", err);
                              Alert.alert("Lỗi", "Không thể mở tệp này");
                            });
                          }
                        }}
                      >
                        <Ionicons 
                          name={file.type === 'image' || (file.original_name && /\.(jpg|jpeg|png|gif)$/i.test(file.original_name)) ? "image-outline" : "document-outline"} 
                          size={24} 
                          color="#3B82F6" 
                        />
                        <Text style={styles.attachmentName} numberOfLines={1}>{file.original_name}</Text>
                        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          <View style={styles.fullscreenFooter}>
            {selectedWarranty && selectedWarranty.status === "pending_customer" && (hasPermission(Permissions.WARRANTY_APPROVE) || project?.customer_id?.toString() === user?.id?.toString()) ? (
              <View style={styles.footerActionRow}>
                <TouchableOpacity 
                  style={styles.footerActionButton} 
                  onPress={() => handleReject(selectedWarranty.uuid)}
                >
                  <LinearGradient
                    colors={buttonGradients.reject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientButton}
                  >
                    <Text style={styles.footerActionText}>Từ chối</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.footerActionButton} 
                  onPress={() => handleApprove(selectedWarranty.uuid)}
                >
                  <LinearGradient
                    colors={buttonGradients.approve}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientButton}
                  >
                    <Text style={styles.footerActionText}>Duyệt</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.footerSaveButton} onPress={() => setSelectedWarranty(null)}>
                <LinearGradient
                  colors={buttonGradients.close}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.footerSaveText}>Đóng</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* ImageViewer inside modal context */}
          <ImageViewer
            visible={imageViewerVisible}
            images={activeAttachments}
            initialIndex={initialImageIndex}
            onClose={() => setImageViewerVisible(false)}
          />
        </SafeAreaView>
      </Modal>

      {/* Maintenance Detail Modal */}
      <Modal visible={!!selectedMaintenance} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setSelectedMaintenance(null)}>
        <SafeAreaView style={styles.fullscreenModalContainer}>
          <View style={styles.fullscreenHeader}>
            <TouchableOpacity onPress={() => setSelectedMaintenance(null)} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.fullscreenTitle}>Chi tiết phiếu bảo trì</Text>
            <View style={{ width: 44 }} />
          </View>

          {selectedMaintenance && (
            <ScrollView style={styles.fullscreenBody}>
              <View style={[styles.detailStatusBadge, { backgroundColor: statusColors[selectedMaintenance.status] + "20", borderColor: statusColors[selectedMaintenance.status] + "40" }]}>
                <Text style={[styles.detailStatusText, { color: statusColors[selectedMaintenance.status] }]}>{statusLabels[selectedMaintenance.status] || "Hoàn thành"}</Text>
              </View>

              <View style={styles.infoCard}>
                <View style={styles.fullscreenInfoRow}>
                  <Text style={styles.fullscreenInfoLabel}>Ngày bảo trì</Text>
                  <Text style={styles.fullscreenInfoValue}>{format(new Date(selectedMaintenance.maintenance_date), "dd/MM/yyyy")}</Text>
                </View>
                <View style={styles.fullscreenDivider} />
                <View style={styles.fullscreenInfoRow}>
                  <Text style={styles.fullscreenInfoLabel}>Lần bảo trì tiếp theo</Text>
                  <Text style={[styles.fullscreenInfoValue, { color: '#3B82F6', fontWeight: 'bold' }]}>
                    {format(new Date(selectedMaintenance.next_maintenance_date), "dd/MM/yyyy")}
                  </Text>
                </View>
                <View style={styles.fullscreenDivider} />
                <View style={styles.fullscreenInfoRow}>
                  <Text style={styles.fullscreenInfoLabel}>Người thực hiện</Text>
                  <Text style={styles.fullscreenInfoValue}>{selectedMaintenance.creator?.name || "N/A"}</Text>
                </View>
              </View>

              {selectedMaintenance.notes && (
                <View style={styles.descriptionSection}>
                  <Text style={styles.fullscreenSectionTitle}>Nội dung / Ghi chú</Text>
                  <View style={styles.readOnlyDescription}>
                    <Text style={styles.descriptionText}>{selectedMaintenance.notes}</Text>
                  </View>
                </View>
              )}

              {selectedMaintenance.attachments && selectedMaintenance.attachments.length > 0 && (
                <View style={styles.descriptionSection}>
                  <Text style={styles.sectionTitle}>Tài liệu đính kèm ({selectedMaintenance.attachments.length})</Text>
                  <View style={styles.attachmentList}>
                    {selectedMaintenance.attachments.map((file, idx) => (
                      <TouchableOpacity 
                        key={idx} 
                        style={styles.attachmentItem}
                        onPress={() => {
                          const allFiles = selectedMaintenance.attachments!;
                          if (file.type === "image" || (file.original_name && /\.(jpg|jpeg|png|gif)$/i.test(file.original_name)) || (file.mime_type && file.mime_type.startsWith('image/'))) {
                            const imageFiles = allFiles.filter(f => f.type === "image" || (f.original_name && /\.(jpg|jpeg|png|gif)$/i.test(f.original_name)) || (f.mime_type && f.mime_type.startsWith('image/')));
                            const index = imageFiles.findIndex(f => f.uuid === file.uuid || f.id === file.id);
                            setActiveAttachments(imageFiles.map(f => ({ uri: f.file_url || f.url, name: f.original_name })));
                            setInitialImageIndex(index !== -1 ? index : 0);
                            setImageViewerVisible(true);
                          } else if (file.file_url || file.url) {
                            Linking.openURL(file.file_url || file.url || "").catch(err => {
                              console.error("Failed to open URL:", err);
                              Alert.alert("Lỗi", "Không thể mở tệp này");
                            });
                          }
                        }}
                      >
                        <Ionicons 
                          name={file.type === 'image' || (file.original_name && /\.(jpg|jpeg|png|gif)$/i.test(file.original_name)) ? "image-outline" : "document-outline"} 
                          size={24} 
                          color="#3B82F6" 
                        />
                        <Text style={styles.attachmentName} numberOfLines={1}>{file.original_name}</Text>
                        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          <View style={styles.fullscreenFooter}>
            {selectedMaintenance && selectedMaintenance.status === "pending_customer" && (hasPermission(Permissions.WARRANTY_APPROVE) || project?.customer_id?.toString() === user?.id?.toString()) ? (
              <View style={styles.footerActionRow}>
                <TouchableOpacity 
                  style={styles.footerActionButton} 
                  onPress={() => handleRejectMaintenance(selectedMaintenance.uuid)}
                >
                  <LinearGradient
                    colors={buttonGradients.reject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientButton}
                  >
                    <Text style={styles.footerActionText}>Từ chối</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.footerActionButton} 
                  onPress={() => handleApproveMaintenance(selectedMaintenance.uuid)}
                >
                  <LinearGradient
                    colors={buttonGradients.approve}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientButton}
                  >
                    <Text style={styles.footerActionText}>Duyệt</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.footerSaveButton} onPress={() => setSelectedMaintenance(null)}>
                <LinearGradient
                  colors={buttonGradients.close}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.footerSaveText}>Đóng</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* ImageViewer inside modal context */}
          <ImageViewer
            visible={imageViewerVisible}
            images={activeAttachments}
            initialIndex={initialImageIndex}
            onClose={() => setImageViewerVisible(false)}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  contentBox: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  contentText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  notesBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 2,
  },
  notesText: {
    fontSize: 13,
    color: "#6B7280",
    fontStyle: "italic",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gradientActionBtn: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 0.3,
  },
  approveButton: {
    backgroundColor: "#10B981",
  },
  rejectButton: {
    backgroundColor: "#EF4444",
  },
  submitButton: {
    backgroundColor: "#3B82F6",
  },
  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: "#9CA3AF",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addBtn: {
    padding: 4,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconBtn: {
    padding: 4,
    marginLeft: 8,
  },
  deleteIcon: {
    padding: 4,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  formScroll: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#1F2937",
    backgroundColor: "#F9FAFB",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  detailContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "100%",
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  closeBtn: {
    padding: 4,
  },
  detailScroll: {
    flex: 1,
    padding: 20,
  },
  detailStatusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  detailStatusText: {
    fontSize: 15,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailContentText: {
    fontSize: 16,
    color: "#1F2937",
    lineHeight: 24,
  },
  detailGrid: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 24,
  },
  detailGridItem: {
    flex: 1,
  },
  detailValueText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
  },
  detailNotesText: {
    fontSize: 15,
    color: "#4B5563",
    fontStyle: "italic",
    lineHeight: 22,
  },
  attachmentList: {
    gap: 12,
  },
  attachmentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  attachmentName: {
    flex: 1,
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "500",
  },
  bottomCloseBtn: {
    margin: 20,
    height: 52,
    backgroundColor: "#1F2937",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomCloseBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Fullscreen Modal Styles (Shared with Documents)
  fullscreenModalContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  fullscreenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  fullscreenTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  fullscreenBody: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fullscreenInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  fullscreenInfoLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  fullscreenInfoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    textAlign: "right",
    paddingLeft: 16,
  },
  fullscreenDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 4,
  },
  descriptionSection: {
    marginBottom: 24,
  },
  fullscreenSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  readOnlyDescription: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  descriptionText: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
  },
  fullscreenFooter: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  footerSaveButton: {
    height: 52,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  footerSaveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  footerActionRow: {
    flexDirection: "row",
    gap: 12,
  },
  footerActionButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  gradientButton: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  footerActionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});
