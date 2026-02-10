import React, { useState } from "react";
import { View, Image, StyleSheet, Modal, TouchableOpacity, Text, Dimensions, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface ImageViewerProps {
    images: { uri: string; name?: string }[];
    visible: boolean;
    initialIndex?: number;
    onClose: () => void;
}

export default function ImageViewer({ images, visible, initialIndex = 0, onClose }: ImageViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const { width, height } = Dimensions.get("window");

    // Cập nhật index khi initialIndex thay đổi (nếu cần)
    React.useEffect(() => {
        setCurrentIndex(initialIndex);
    }, [initialIndex]);

    if (!visible || !images || images.length === 0) return null;

    const currentImage = images[currentIndex];
    if (!currentImage) return null;

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleNext = () => {
        if (currentIndex < images.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handleDownload = async () => {
        try {
            if (!currentImage?.uri) return;

            const filename = currentImage.name || `image_${Date.now()}.jpg`;
            // Ensure documentDirectory is treated as string or fallback
            // Using template literal to force string if type is weird, but usually simple check works
            // @ts-ignore
            const docDir = FileSystem.documentDirectory;
            if (!docDir) {
                console.error("Document directory is not available");
                return;
            }
            const fileUri = docDir + filename;

            // @ts-ignore
            const { uri } = await FileSystem.downloadAsync(currentImage.uri, fileUri);

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri);
            }
        } catch (error) {
            console.error("Error downloading image:", error);
        }
    };

    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={styles.container}>
                <StatusBar hidden />

                {/* Header controls used to be here, moved to overlay */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close" size={28} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.counter}>
                        {currentIndex + 1} / {images.length}
                    </Text>
                    <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
                        <Ionicons name="download-outline" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Main Image */}
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: currentImage.uri }}
                        style={[styles.image, { width, height: height * 0.8 }]}
                        resizeMode="contain"
                    />
                </View>

                {/* Navigation Buttons */}
                {images.length > 1 && (
                    <>
                        <TouchableOpacity
                            style={[styles.navButton, styles.leftButton, currentIndex === 0 && styles.disabledButton]}
                            onPress={handlePrevious}
                            disabled={currentIndex === 0}
                        >
                            <Ionicons name="chevron-back" size={30} color="#FFFFFF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.navButton, styles.rightButton, currentIndex === images.length - 1 && styles.disabledButton]}
                            onPress={handleNext}
                            disabled={currentIndex === images.length - 1}
                        >
                            <Ionicons name="chevron-forward" size={30} color="#FFFFFF" />
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000000",
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        position: 'absolute',
        top: 40,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        zIndex: 10,
    },
    closeButton: {
        padding: 10,
    },
    downloadButton: {
        padding: 10,
    },
    counter: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    imageContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
    },
    image: {
        flex: 1,
    },
    navButton: {
        position: "absolute",
        top: "50%",
        padding: 15,
        backgroundColor: "rgba(0,0,0,0.3)",
        borderRadius: 30,
        transform: [{ translateY: -25 }],
    },
    leftButton: {
        left: 20,
    },
    rightButton: {
        right: 20,
    },
    disabledButton: {
        opacity: 0.3,
    },
});
