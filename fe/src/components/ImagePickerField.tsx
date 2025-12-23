import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import ImagePicker, { ImageItem } from "./ImagePicker";
import { jsonToImages, imagesToJson } from "@/utils/imageUtils";

interface ImagePickerFieldProps {
  label?: string;
  value?: string | null; // JSON string containing images array
  onChange?: (jsonValue: string) => void;
  maxImages?: number;
  multiple?: boolean;
  disabled?: boolean;
  required?: boolean;
}

/**
 * Component để chọn/chụp nhiều ảnh và lưu vào JSON field
 * Sử dụng cho các module cần lưu nhiều ảnh vào database field dạng JSON
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
  const [images, setImages] = useState<ImageItem[]>([]);

  // Parse JSON value to images array
  useEffect(() => {
    if (value) {
      const parsed = jsonToImages(value);
      setImages(parsed);
    } else {
      setImages([]);
    }
  }, [value]);

  // Handle images change
  const handleImagesChange = (newImages: ImageItem[]) => {
    setImages(newImages);
    const jsonValue = imagesToJson(newImages);
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
      <ImagePicker
        value={images}
        onChange={handleImagesChange}
        maxImages={maxImages}
        multiple={multiple}
        disabled={disabled}
      />
      {images.length > 0 && (
        <Text style={styles.countText}>
          Đã chọn {images.length} ảnh
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

