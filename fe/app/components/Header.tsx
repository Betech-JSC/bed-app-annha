// Reusable Header Component for consistent navigation
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

interface HeaderProps {
    title: string;
    showBack?: boolean;
    onBackPress?: () => void;
    rightComponent?: React.ReactNode;
    transparent?: boolean;
}

export default function Header({
    title,
    showBack = true,
    onBackPress,
    rightComponent,
    transparent = false,
}: HeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const handleBack = () => {
        if (onBackPress) {
            onBackPress();
        } else {
            if (router.canGoBack()) {
                router.back();
            } else {
                // Fallback to home if can't go back
                router.replace('/(tabs)/(sender)/home');
            }
        }
    };

    return (
        <View
            style={[
                styles.container,
                transparent && styles.transparent,
                isDark && styles.darkContainer,
            ]}
        >
            <View style={styles.content}>
                {showBack && (
                    <TouchableOpacity
                        onPress={handleBack}
                        style={styles.backButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <MaterialIcons
                            name="arrow-back"
                            size={24}
                            color={isDark ? '#F3F4F6' : '#1F2937'}
                        />
                    </TouchableOpacity>
                )}
                {!showBack && <View style={styles.backButton} />}

                <Text
                    style={[styles.title, isDark && styles.darkTitle]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {title}
                </Text>

                {rightComponent ? (
                    <View style={styles.rightComponent}>{rightComponent}</View>
                ) : (
                    <View style={styles.backButton} />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 56,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E7EB',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    darkContainer: {
        backgroundColor: '#1F2937',
        borderBottomColor: '#374151',
    },
    transparent: {
        backgroundColor: 'transparent',
        borderBottomWidth: 0,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        textAlign: 'center',
        marginHorizontal: 8,
    },
    darkTitle: {
        color: '#F3F4F6',
    },
    rightComponent: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

