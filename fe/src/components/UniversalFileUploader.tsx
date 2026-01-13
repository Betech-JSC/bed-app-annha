import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Alert,
    ActivityIndicator,
    ScrollView,
    Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import { attachmentApi } from "@/api/attachmentApi";

export interface UploadedFile {
    id?: number;
    attachment_id?: number;
    file_url?: string;
    url?: string;
    location?: string;
    original_name?: string;
    file_name?: string;
    type?: "image" | "video" | "document";
    file_size?: number;
    mime_type?: string;
}

interface UniversalFileUploaderProps {
    onUploadComplete: (files: UploadedFile[]) => void;
    multiple?: boolean;
    accept?: "image" | "document" | "all";
    maxFiles?: number;
    initialFiles?: UploadedFile[];
    disabled?: boolean;
    showPreview?: boolean;
    label?: string;
}

export default function UniversalFileUploader({
    onUploadComplete,
    multiple = false,
    accept = "all",
    maxFiles = 5,
    initialFiles = [],
    disabled = false,
    showPreview = true,
    label = "Chọn file để upload",
}: UniversalFileUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(initialFiles);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});

    // Sync với initialFiles
    useEffect(() => {
        if (initialFiles && initialFiles.length > 0) {
            setUploadedFiles(initialFiles);
        }
    }, [initialFiles]);

    // Request camera permissions
    const requestCameraPermission = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
            Alert.alert(
                "Cần quyền truy cập",
                "Ứng dụng cần quyền truy cập camera để chụp ảnh."
            );
            return false;
        }
        return true;
    };

    // Request media library permissions
    const requestMediaLibraryPermission = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert(
                "Cần quyền truy cập",
                "Ứng dụng cần quyền truy cập thư viện ảnh để chọn ảnh."
            );
            return false;
        }
        return true;
    };

    // Take photo from camera
    const takePhoto = async () => {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) return;

        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                await uploadFiles([result.assets[0]]);
            }
        } catch (error) {
            console.error("Error taking photo:", error);
            Alert.alert("Lỗi", "Không thể chụp ảnh");
        }
    };

    // Pick images from library
    const pickImage = async () => {
        const hasPermission = await requestMediaLibraryPermission();
        if (!hasPermission) return;

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: multiple,
                quality: 0.8,
                selectionLimit: multiple ? maxFiles - uploadedFiles.length : 1,
            });

            if (!result.canceled && result.assets) {
                await uploadFiles(result.assets);
            }
        } catch (error) {
            console.error("Error picking image:", error);
            Alert.alert("Lỗi", "Không thể chọn ảnh");
        }
    };

    // Pick documents
    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: "*/*",
                multiple: multiple,
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets) {
                // Convert DocumentPicker result to upload format
                const filesToUpload = result.assets.map((asset) => ({
                    uri: asset.uri,
                    name: asset.name,
                    mimeType: asset.mimeType || "application/octet-stream",
                    size: asset.size || 0,
                }));

                await uploadFiles(filesToUpload);
            }
        } catch (error) {
            console.error("Error picking document:", error);
            Alert.alert("Lỗi", "Không thể chọn tài liệu");
        }
    };

    // Upload files to server
    const uploadFiles = async (files: any[]) => {
        if (uploadedFiles.length + files.length > maxFiles) {
            Alert.alert("Lỗi", `Chỉ được upload tối đa ${maxFiles} file`);
            return;
        }

        // Validate file size (2MB limit)
        const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes
        const oversizedFiles: string[] = [];
        
        for (const file of files) {
            let fileSize = file.size || file.fileSize || 0;
            
            // If fileSize is not available, try to get it from FileSystem
            if (fileSize === 0 && file.uri) {
                try {
                    const fileInfo = await FileSystem.getInfoAsync(file.uri);
                    if (fileInfo.exists && fileInfo.size) {
                        fileSize = fileInfo.size;
                    }
                } catch (error) {
                    console.warn("Could not get file size:", error);
                }
            }
            
            if (fileSize > MAX_FILE_SIZE) {
                const fileName = file.name || file.fileName || "file";
                const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
                oversizedFiles.push(`${fileName} (${fileSizeMB}MB)`);
            }
        }

        if (oversizedFiles.length > 0) {
            Alert.alert(
                "Lỗi",
                `Các file sau vượt quá giới hạn 2MB:\n${oversizedFiles.join("\n")}\n\nVui lòng chọn file nhỏ hơn 2MB.`
            );
            return;
        }

        setUploading(true);

        try {
            const formData = new FormData();

            files.forEach((file, index) => {
                // Determine file extension and type
                const uri = file.uri || file.localUri;
                if (!uri) {
                    console.error("File URI is missing:", file);
                    return;
                }

                const fileName = file.name || file.fileName || `file_${Date.now()}_${index}`;
                
                // Extract extension from filename or URI
                let extension = fileName.split(".").pop()?.toLowerCase() || "";
                if (!extension && uri) {
                    const uriParts = uri.split(".");
                    extension = uriParts.length > 1 ? uriParts.pop()?.toLowerCase() || "" : "";
                }

                // Determine MIME type - prioritize from file object
                let mimeType = file.mimeType || file.type;
                if (!mimeType) {
                    // Auto-detect MIME type from extension
                    if (['jpg', 'jpeg'].includes(extension)) {
                        mimeType = 'image/jpeg';
                    } else if (extension === 'png') {
                        mimeType = 'image/png';
                    } else if (extension === 'gif') {
                        mimeType = 'image/gif';
                    } else if (extension === 'webp') {
                        mimeType = 'image/webp';
                    } else if (extension === 'pdf') {
                        mimeType = 'application/pdf';
                    } else if (extension === 'mp4') {
                        mimeType = 'video/mp4';
                    } else {
                        mimeType = 'application/octet-stream';
                    }
                }

                // Ensure fileName has extension
                const finalFileName = fileName.includes('.') ? fileName : `${fileName}.${extension || 'jpg'}`;

                // Create proper file object for FormData (React Native format)
                // React Native FormData requires: { uri, type, name }
                const fileObject: any = {
                    uri: uri,
                    type: mimeType,
                    name: finalFileName,
                };

                // Append with correct format: files[0], files[1], etc.
                // Backend expects files as array
                formData.append(`files[${index}]`, fileObject as any);
            });

            console.log("Uploading files:", {
                count: files.length,
                formDataKeys: Object.keys(formData),
            });

            const response = await attachmentApi.upload(formData);

            if (response.success && response.data) {
                const newFiles: UploadedFile[] = response.data.map((item: any) => ({
                    id: item.attachment_id,
                    attachment_id: item.attachment_id,
                    file_url: item.file_url || item.file || item.location,
                    url: item.file_url || item.file || item.location,
                    location: item.file_url || item.file || item.location,
                    original_name: item.original_name,
                    type: item.type,
                }));

                const allFiles = [...uploadedFiles, ...newFiles];
                setUploadedFiles(allFiles);
                onUploadComplete(allFiles);

                Alert.alert("Thành công", `Đã upload thành công ${newFiles.length} file(s)`);
            } else {
                throw new Error(response.message || "Upload thất bại");
            }
        } catch (error: any) {
            console.error("Upload error:", error);
            console.error("Upload error details:", {
                response: error.response?.data,
                status: error.response?.status,
                message: error.message,
            });

            // Extract detailed error message
            let errorMessage = "Upload thất bại. Vui lòng thử lại.";
            
            if (error.response?.data) {
                // Check for validation errors
                if (error.response.data.errors) {
                    const errors = error.response.data.errors;
                    const firstError = Object.values(errors)[0];
                    errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
                } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            Alert.alert("Lỗi upload", errorMessage);
        } finally {
            setUploading(false);
            setUploadProgress({});
        }
    };

    const removeFile = async (file: UploadedFile, index: number) => {
        Alert.alert(
            "Xác nhận xóa",
            "Bạn có chắc chắn muốn xóa file này?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // If file has attachment_id, delete from server
                            if (file.attachment_id || file.id) {
                                try {
                                    await attachmentApi.deleteAttachment(file.attachment_id || file.id!);
                                } catch (error) {
                                    console.error("Error deleting file from server:", error);
                                    // Continue to remove from UI even if server delete fails
                                }
                            }

                            // Remove from local state
                            const newFiles = uploadedFiles.filter((_, i) => i !== index);
                            setUploadedFiles(newFiles);
                            onUploadComplete(newFiles);
                        } catch (error) {
                            console.error("Error removing file:", error);
                            Alert.alert("Lỗi", "Không thể xóa file");
                        }
                    },
                },
            ]
        );
    };

    const showPicker = () => {
        if (disabled || uploading) return;

        if (accept === "image") {
            Alert.alert("Chọn ảnh", "Bạn muốn chụp ảnh mới hay chọn từ thư viện?", [
                { text: "Hủy", style: "cancel" },
                { text: "Chụp ảnh", onPress: takePhoto },
                { text: "Chọn từ thư viện", onPress: pickImage },
            ]);
        } else if (accept === "document") {
            pickDocument();
        } else {
            Alert.alert("Chọn loại file", "", [
                { text: "Hủy", style: "cancel" },
                { text: "Chụp ảnh", onPress: takePhoto },
                { text: "Chọn ảnh", onPress: pickImage },
                { text: "Tài liệu", onPress: pickDocument },
            ]);
        }
    };

    const getFileIcon = (type?: string, mimeType?: string) => {
        if (type === "image" || mimeType?.startsWith("image/")) {
            return "image-outline";
        }
        if (type === "video" || mimeType?.startsWith("video/")) {
            return "videocam-outline";
        }
        if (mimeType === "application/pdf") {
            return "document-text-outline";
        }
        return "document-outline";
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return "";
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[
                    styles.uploadButton,
                    (disabled || uploading || uploadedFiles.length >= maxFiles) && styles.uploadButtonDisabled,
                ]}
                onPress={showPicker}
                disabled={disabled || uploading || uploadedFiles.length >= maxFiles}
            >
                {uploading ? (
                    <>
                        <ActivityIndicator color="#3B82F6" size="small" />
                        <Text style={styles.uploadButtonText}>Đang upload...</Text>
                    </>
                ) : (
                    <>
                        <Ionicons name="cloud-upload-outline" size={24} color="#3B82F6" />
                        <Text style={styles.uploadButtonText}>
                            {uploadedFiles.length >= maxFiles
                                ? `Đã đạt giới hạn (${maxFiles} file)`
                                : label}
                        </Text>
                    </>
                )}
            </TouchableOpacity>

            {/* Preview uploaded files */}
            {showPreview && uploadedFiles.length > 0 && (
                <View style={styles.filesContainer}>
                    <Text style={styles.previewTitle}>
                        Đã tải lên ({uploadedFiles.length}/{maxFiles})
                    </Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filesGrid}
                    >
                        {uploadedFiles.map((file, index) => {
                            const imageUrl = file.file_url || file.url || file.location;
                            const isImage = file.type === "image" || (imageUrl && imageUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i));

                            return (
                                <View key={file.attachment_id || file.id || index} style={styles.fileWrapper}>
                                    {isImage && imageUrl ? (
                                        <TouchableOpacity
                                            onPress={() => setPreviewImage(imageUrl)}
                                            activeOpacity={0.8}
                                        >
                                            <Image
                                                source={{ uri: imageUrl }}
                                                style={styles.fileThumbnail}
                                                resizeMode="cover"
                                            />
                                        </TouchableOpacity>
                                    ) : (
                                        <View style={styles.fileIconContainer}>
                                            <Ionicons
                                                name={getFileIcon(file.type, file.mime_type) as any}
                                                size={32}
                                                color="#3B82F6"
                                            />
                                            {file.original_name && (
                                                <Text style={styles.fileNameSmall} numberOfLines={1}>
                                                    {file.original_name}
                                                </Text>
                                            )}
                                        </View>
                                    )}
                                    <TouchableOpacity
                                        style={styles.removeFileButton}
                                        onPress={() => removeFile(file, index)}
                                    >
                                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                                    </TouchableOpacity>
                                    {!isImage && file.file_size && (
                                        <View style={styles.fileInfoOverlay}>
                                            <Text style={styles.fileSizeText}>
                                                {formatFileSize(file.file_size)}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* Fullscreen image preview modal */}
            <Modal
                visible={previewImage !== null}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setPreviewImage(null)}
            >
                <TouchableOpacity
                    style={styles.previewOverlay}
                    activeOpacity={1}
                    onPress={() => setPreviewImage(null)}
                >
                    <View style={styles.previewContainer}>
                        {previewImage && (
                            <Image
                                source={{ uri: previewImage }}
                                style={styles.previewImage}
                                resizeMode="contain"
                            />
                        )}
                        <TouchableOpacity
                            style={styles.closePreviewButton}
                            onPress={() => setPreviewImage(null)}
                        >
                            <Ionicons name="close" size={32} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 8,
    },
    uploadButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        borderWidth: 2,
        borderColor: "#3B82F6",
        borderStyle: "dashed",
        borderRadius: 12,
        backgroundColor: "#EFF6FF",
        gap: 8,
    },
    uploadButtonDisabled: {
        opacity: 0.5,
        borderColor: "#9CA3AF",
        backgroundColor: "#F3F4F6",
    },
    uploadButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#3B82F6",
    },
    filesContainer: {
        marginTop: 16,
    },
    previewTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 12,
    },
    filesGrid: {
        flexDirection: "row",
        gap: 16,
        paddingHorizontal: 4,
    },
    fileWrapper: {
        position: "relative",
        marginRight: 16,
        marginBottom: 8,
    },
    fileThumbnail: {
        width: 100,
        height: 100,
        borderRadius: 8,
        backgroundColor: "#E5E7EB",
    },
    fileIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 8,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
        padding: 8,
    },
    fileNameSmall: {
        fontSize: 10,
        color: "#6B7280",
        marginTop: 4,
        textAlign: "center",
    },
    removeFileButton: {
        position: "absolute",
        top: -8,
        right: -8,
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 2,
    },
    fileInfoOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        padding: 4,
    },
    fileSizeText: {
        fontSize: 10,
        color: "#FFFFFF",
        textAlign: "center",
    },
    previewOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        justifyContent: "center",
        alignItems: "center",
    },
    previewContainer: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
    },
    previewImage: {
        width: "90%",
        height: "90%",
    },
    closePreviewButton: {
        position: "absolute",
        top: 40,
        right: 20,
        padding: 8,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        borderRadius: 20,
    },
});

