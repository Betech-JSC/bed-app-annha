import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import UniversalFileUploader, { UploadedFile } from "./UniversalFileUploader";
import { jsonToFiles, filesToJson } from "@/utils/imageUtils";

interface ImagePickerFieldProps {
  label?: string;
  value?: string | null; // JSON string containing files array
  onChange?: (jsonValue: string) => void;
  maxImages?: number;
  multiple?: boolean;
  disabled?: boolean;
  required?: boolean;
}

/**
 * Component để chọn/chụp nhiều ảnh và lưu vào JSON field
 * Sử dụng cho các module cần lưu nhiều ảnh vào database field dạng JSON
 * 
 * @deprecated This component now uses UniversalFileUploader internally
 */
export default function ImagePickerField({
  label,
  value,
  onChange,
  maxImages = 10,
  multiple = true,
  disabled = false,
  required = false,
}: ImagePickerFieldProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  // Parse JSON value to files array
  useEffect(() => {
    if (value) {
      const parsed = jsonToFiles(value);
      setFiles(parsed);
    } else {
      setFiles([]);
    }
  }, [value]);

  // Handle files change
  const handleFilesChange = (newFiles: UploadedFile[]) => {
    setFiles(newFiles);
    const jsonValue = filesToJson(newFiles);
    onChange?.(jsonValue);
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <UniversalFileUploader
        onUploadComplete={handleFilesChange}
        multiple={multiple}
        accept="image"
        maxFiles={maxImages}
        initialFiles={files}
        disabled={disabled}
        showPreview={true}
        label={label ? undefined : "Chọn ảnh"}
      />
      {files.length > 0 && (
        <Text style={styles.countText}>
          Đã chọn {files.length} ảnh
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  required: {
    color: "#EF4444",
  },
  countText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
  },
});

