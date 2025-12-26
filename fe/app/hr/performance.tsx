import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  performanceApi,
  PerformanceEvaluation,
  CreateEvaluationData,
} from "@/api/performanceApi";
import { employeesApi } from "@/api/employeesApi";
import { projectApi } from "@/api/projectApi";
import DateTimePicker from "@react-native-community/datetimepicker";
import BackButton from "@/components/BackButton";

const EVALUATION_TYPE_LABELS: Record<string, string> = {
  monthly: "Hàng tháng",
  quarterly: "Hàng quý",
  annual: "Hàng năm",
  project_based: "Theo dự án",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Nháp",
  submitted: "Đã gửi",
  reviewed: "Đã xem xét",
  approved: "Đã duyệt",
};

export default function PerformanceScreen() {
  const router = useRouter();
  const [evaluations, setEvaluations] = useState<PerformanceEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState<PerformanceEvaluation | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [formData, setFormData] = useState<Partial<CreateEvaluationData>>({
    user_id: undefined,
    project_id: undefined,
    evaluation_period: "",
    evaluation_type: "monthly",
    evaluation_date: new Date().toISOString().split("T")[0],
    overall_score: undefined,
    strengths: "",
    weaknesses: "",
    improvements: "",
    goals: "",
    comments: "",
    kpis: [],
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingKPI, setEditingKPI] = useState<any>(null);
  const [showKPIModal, setShowKPIModal] = useState(false);

  useEffect(() => {
    loadEvaluations();
    loadEmployees();
    loadProjects();
  }, []);

  const loadEvaluations = async () => {
    try {
      setLoading(true);
      const response = await performanceApi.getEvaluations();
      if (response.success) {
        setEvaluations(response.data.data || []);
      }
    } catch (error) {
      console.error("Error loading evaluations:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await employeesApi.getEmployees({ page: 1, per_page: 1000 });
      if (response.success) {
        setEmployees(response.data.data || []);
      }
    } catch (error) {
      console.error("Error loading employees:", error);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await projectApi.getProjects({ page: 1, per_page: 100 });
      if (response.success) {
        setProjects(response.data.data || []);
      }
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEvaluations();
  };

  const handleCreate = async () => {
    if (!formData.user_id || !formData.evaluation_period || !formData.evaluation_date) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin");
      return;
    }

    try {
      setSubmitting(true);
      const response = editingEvaluation
        ? await performanceApi.updateEvaluation(editingEvaluation.id, formData as any)
        : await performanceApi.createEvaluation(formData as CreateEvaluationData);
      
      if (response.success) {
        Alert.alert("Thành công", editingEvaluation ? "Đã cập nhật đánh giá" : "Đã tạo đánh giá thành công");
        setShowCreateModal(false);
        resetForm();
        loadEvaluations();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể thực hiện thao tác");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (evaluation: PerformanceEvaluation) => {
    setEditingEvaluation(evaluation);
    setFormData({
      user_id: evaluation.user_id,
      project_id: evaluation.project_id,
      evaluation_period: evaluation.evaluation_period,
      evaluation_type: evaluation.evaluation_type,
      evaluation_date: evaluation.evaluation_date.split("T")[0],
      overall_score: evaluation.overall_score,
      strengths: evaluation.strengths || "",
      weaknesses: evaluation.weaknesses || "",
      improvements: evaluation.improvements || "",
      goals: evaluation.goals || "",
      comments: evaluation.comments || "",
      kpis: evaluation.kpis || [],
    });
    const employee = employees.find((e) => e.id === evaluation.user_id);
    if (employee) {
      setSelectedEmployee(employee);
    }
    if (evaluation.project_id) {
      const project = projects.find((p) => p.id === evaluation.project_id);
      if (project) {
        setSelectedProject(project);
      }
    }
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setEditingEvaluation(null);
    setSelectedEmployee(null);
    setSelectedProject(null);
    setFormData({
      user_id: undefined,
      project_id: undefined,
      evaluation_period: "",
      evaluation_type: "monthly",
      evaluation_date: new Date().toISOString().split("T")[0],
      overall_score: undefined,
      strengths: "",
      weaknesses: "",
      improvements: "",
      goals: "",
      comments: "",
      kpis: [],
    });
  };

  const handleAddKPI = () => {
    setEditingKPI(null);
    setShowKPIModal(true);
  };

  const handleEditKPI = (kpi: any, index: number) => {
    setEditingKPI({ ...kpi, index });
    setShowKPIModal(true);
  };

  const handleSaveKPI = (kpi: any) => {
    const kpis = formData.kpis || [];
    if (editingKPI !== null && editingKPI.index !== undefined) {
      kpis[editingKPI.index] = kpi;
    } else {
      kpis.push(kpi);
    }
    setFormData({ ...formData, kpis });
    setShowKPIModal(false);
    setEditingKPI(null);
  };

  const handleRemoveKPI = (index: number) => {
    const kpis = formData.kpis || [];
    kpis.splice(index, 1);
    setFormData({ ...formData, kpis });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "#10B981";
      case "reviewed":
        return "#3B82F6";
      case "submitted":
        return "#F59E0B";
      default:
        return "#6B7280";
    }
  };

  const renderItem = ({ item }: { item: PerformanceEvaluation }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/hr/performance/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardTitle}>
            {item.user?.name || `Đánh giá #${item.id}`}
          </Text>
          <Text style={styles.cardType}>
            {EVALUATION_TYPE_LABELS[item.evaluation_type]}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + "20" },
          ]}
        >
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
      </View>
      {item.overall_score !== null && item.overall_score !== undefined && (
        <Text style={styles.scoreText}>Điểm: {item.overall_score}/100</Text>
      )}
      <Text style={styles.dateText}>
        {new Date(item.evaluation_date).toLocaleDateString("vi-VN")}
      </Text>
      <Text style={styles.periodText}>Kỳ: {item.evaluation_period}</Text>
      {item.kpis && item.kpis.length > 0 && (
        <Text style={styles.kpisCount}>{item.kpis.length} KPI</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Đánh Giá Hiệu Suất</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setShowCreateModal(true);
          }}
        >
          <Ionicons name="add" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={evaluations}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="star-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyText}>Chưa có đánh giá</Text>
            </View>
          }
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingEvaluation ? "Sửa Đánh Giá" : "Tạo Đánh Giá"}
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nhân viên *</Text>
                <TouchableOpacity
                  style={styles.selectInput}
                  onPress={() => setShowEmployeePicker(true)}
                >
                  <Text style={selectedEmployee ? {} : styles.placeholderText}>
                    {selectedEmployee ? selectedEmployee.name : "Chọn nhân viên"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Dự án (tùy chọn)</Text>
                <TouchableOpacity
                  style={styles.selectInput}
                  onPress={() => setShowProjectPicker(true)}
                >
                  <Text style={selectedProject ? {} : styles.placeholderText}>
                    {selectedProject ? selectedProject.name : "Chọn dự án"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Loại đánh giá *</Text>
                <View style={styles.typeContainer}>
                  {Object.entries(EVALUATION_TYPE_LABELS).map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.typeButton,
                        formData.evaluation_type === key && styles.typeButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, evaluation_type: key as any })}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          formData.evaluation_type === key && styles.typeButtonTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Kỳ đánh giá *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: Tháng 1/2024, Q1/2024"
                  value={formData.evaluation_period}
                  onChangeText={(text) => setFormData({ ...formData, evaluation_period: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Ngày đánh giá *</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text>{formData.evaluation_date}</Text>
                  <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={new Date(formData.evaluation_date || new Date())}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (date) {
                        setFormData({
                          ...formData,
                          evaluation_date: date.toISOString().split("T")[0],
                        });
                      }
                    }}
                  />
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Điểm tổng thể (0-100)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={formData.overall_score?.toString()}
                  onChangeText={(text) =>
                    setFormData({ ...formData, overall_score: parseInt(text) || undefined })
                  }
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <View style={styles.kpisHeader}>
                  <Text style={styles.label}>KPI</Text>
                  <TouchableOpacity style={styles.addKPIButton} onPress={handleAddKPI}>
                    <Ionicons name="add-circle" size={20} color="#3B82F6" />
                    <Text style={styles.addKPIText}>Thêm</Text>
                  </TouchableOpacity>
                </View>
                {formData.kpis && formData.kpis.length > 0 ? (
                  <View style={styles.kpisList}>
                    {formData.kpis.map((kpi: any, index: number) => (
                      <View key={index} style={styles.kpiRow}>
                        <View style={styles.kpiInfo}>
                          <Text style={styles.kpiName}>{kpi.kpi_name}</Text>
                          {kpi.score !== null && kpi.score !== undefined && (
                            <Text style={styles.kpiScore}>Điểm: {kpi.score}</Text>
                          )}
                        </View>
                        <View style={styles.kpiActions}>
                          <TouchableOpacity onPress={() => handleEditKPI(kpi, index)}>
                            <Ionicons name="pencil" size={18} color="#3B82F6" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleRemoveKPI(index)}>
                            <Ionicons name="trash" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyKPIsText}>Chưa có KPI. Nhấn "Thêm" để thêm KPI.</Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Điểm mạnh</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Nhập điểm mạnh"
                  value={formData.strengths}
                  onChangeText={(text) => setFormData({ ...formData, strengths: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Điểm yếu</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Nhập điểm yếu"
                  value={formData.weaknesses}
                  onChangeText={(text) => setFormData({ ...formData, weaknesses: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Cải thiện</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Nhập kế hoạch cải thiện"
                  value={formData.improvements}
                  onChangeText={(text) => setFormData({ ...formData, improvements: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleCreate}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editingEvaluation ? "Cập Nhật" : "Tạo Mới"}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Employee Picker Modal */}
      {showEmployeePicker && (
        <Modal
          visible={showEmployeePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowEmployeePicker(false)}
        >
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContent}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Chọn nhân viên</Text>
                <TouchableOpacity onPress={() => setShowEmployeePicker(false)}>
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={employees}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pickerItem}
                    onPress={() => {
                      setSelectedEmployee(item);
                      setFormData({ ...formData, user_id: item.id });
                      setShowEmployeePicker(false);
                    }}
                  >
                    <Text>{item.name}</Text>
                    {selectedEmployee?.id === item.id && (
                      <Ionicons name="checkmark" size={20} color="#3B82F6" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Project Picker Modal */}
      {showProjectPicker && (
        <Modal
          visible={showProjectPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowProjectPicker(false)}
        >
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContent}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Chọn dự án</Text>
                <TouchableOpacity onPress={() => setShowProjectPicker(false)}>
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={projects}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pickerItem}
                    onPress={() => {
                      setSelectedProject(item);
                      setFormData({ ...formData, project_id: item.id });
                      setShowProjectPicker(false);
                    }}
                  >
                    <Text>{item.name}</Text>
                    {selectedProject?.id === item.id && (
                      <Ionicons name="checkmark" size={20} color="#3B82F6" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* KPI Modal */}
      {showKPIModal && (
        <KPIModal
          initialData={editingKPI}
          onSave={handleSaveKPI}
          onCancel={() => {
            setShowKPIModal(false);
            setEditingKPI(null);
          }}
        />
      )}
    </View>
  );
}

function KPIModal({
  initialData,
  onSave,
  onCancel,
}: {
  initialData: any;
  onSave: (kpi: any) => void;
  onCancel: () => void;
}) {
  const [kpiData, setKpiData] = useState({
    kpi_name: initialData?.kpi_name || "",
    description: initialData?.description || "",
    target_value: initialData?.target_value?.toString() || "",
    actual_value: initialData?.actual_value?.toString() || "",
    weight: initialData?.weight?.toString() || "",
    score: initialData?.score?.toString() || "",
    notes: initialData?.notes || "",
  });

  const handleSave = () => {
    if (!kpiData.kpi_name) {
      Alert.alert("Lỗi", "Vui lòng nhập tên KPI");
      return;
    }

    onSave({
      kpi_name: kpiData.kpi_name,
      description: kpiData.description,
      target_value: kpiData.target_value ? parseFloat(kpiData.target_value) : undefined,
      actual_value: kpiData.actual_value ? parseFloat(kpiData.actual_value) : undefined,
      weight: kpiData.weight ? parseFloat(kpiData.weight) : undefined,
      score: kpiData.score ? parseInt(kpiData.score) : undefined,
      notes: kpiData.notes,
    });
  };

  return (
    <Modal visible={true} transparent={true} animationType="slide" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {initialData ? "Sửa KPI" : "Thêm KPI"}
            </Text>
            <TouchableOpacity onPress={onCancel}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Tên KPI *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập tên KPI"
                value={kpiData.kpi_name}
                onChangeText={(text) => setKpiData({ ...kpiData, kpi_name: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Mô tả</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Nhập mô tả"
                value={kpiData.description}
                onChangeText={(text) => setKpiData({ ...kpiData, description: text })}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Giá trị mục tiêu</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={kpiData.target_value}
                onChangeText={(text) => setKpiData({ ...kpiData, target_value: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Giá trị thực tế</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={kpiData.actual_value}
                onChangeText={(text) => setKpiData({ ...kpiData, actual_value: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Trọng số</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={kpiData.weight}
                onChangeText={(text) => setKpiData({ ...kpiData, weight: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Điểm</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={kpiData.score}
                onChangeText={(text) => setKpiData({ ...kpiData, score: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  addButton: {
    padding: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
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
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  cardType: {
    fontSize: 12,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  scoreText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3B82F6",
    marginTop: 8,
  },
  dateText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  periodText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  kpisCount: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalBody: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  selectInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  placeholderText: {
    color: "#9CA3AF",
  },
  typeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  typeButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  typeButtonText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  typeButtonTextActive: {
    color: "#FFFFFF",
  },
  dateInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  kpisHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  addKPIButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addKPIText: {
    color: "#3B82F6",
    fontWeight: "600",
  },
  kpisList: {
    gap: 8,
  },
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 8,
  },
  kpiInfo: {
    flex: 1,
  },
  kpiName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  kpiScore: {
    fontSize: 13,
    color: "#3B82F6",
    marginTop: 4,
  },
  kpiActions: {
    flexDirection: "row",
    gap: 12,
  },
  emptyKPIsText: {
    fontSize: 14,
    color: "#6B7280",
    fontStyle: "italic",
    textAlign: "center",
    padding: 20,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  pickerContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    padding: 16,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  submitButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

