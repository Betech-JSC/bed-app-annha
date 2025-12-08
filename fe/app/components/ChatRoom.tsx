import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    FlatList,
    TextInput,
    Text,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    SafeAreaView,
} from 'react-native';
import { getDatabase, ref, onValue, push, serverTimestamp, get, set, onDisconnect } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { app, storage } from '@/firebaseConfig';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { NotificationService } from '@/NotificationService';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import api from '@/api/api';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface Message {
    id: string;
    sender_id: string;
    text: string;
    timestamp: number;
    to?: number;
    image_url?: string;
    file_url?: string;
    file_name?: string;
    file_type?: string;
}

interface ChatRoomProps {
    chatId: string;
}

export default function ChatRoom({ chatId }: ChatRoomProps) {
    const user = useSelector((state: RootState) => state.user);
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const [otherUserId, setOtherUserId] = useState<number | string | null>(null);
    const [otherUserPushToken, setOtherUserPushToken] = useState<string | null>(null);
    const [otherUserName, setOtherUserName] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [otherUserTyping, setOtherUserTyping] = useState(false);
    const [relatedOrders, setRelatedOrders] = useState<any[]>([]);
    const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    const db = getDatabase(app);

    // Update online status khi vào chat room
    useEffect(() => {
        if (!user?.id) return;

        const onlineRef = ref(db, `users/${user.id}/online`);
        const lastSeenRef = ref(db, `users/${user.id}/last_seen`);

        // Set online = true
        set(onlineRef, true);
        set(lastSeenRef, Date.now() / 1000);

        // Update last_seen mỗi 30 giây
        const interval = setInterval(() => {
            set(lastSeenRef, Date.now() / 1000);
        }, 30000);

        // Cleanup khi unmount
        return () => {
            set(onlineRef, false);
            clearInterval(interval);
        };
    }, [user?.id, db]);

    // Lấy user khác và token push
    useEffect(() => {
        const chatRef = ref(db, `chats/${chatId}`);
        get(chatRef).then(async snapshot => {
            const chat = snapshot.val();

            if (chat?.users) {
                // chat.users can be an array or an object (Firebase). Normalize to array of ids.
                const usersList: any[] = Array.isArray(chat.users) ? chat.users : Object.keys(chat.users || {});
                const other = usersList.find((id: any) => String(id) !== String(user.id));
                setOtherUserId(other ?? null);

                // Lấy token push và thông tin user từ Firebase
                if (other != null) {
                    const userRef = ref(db, `users/${other}`);
                    const userSnap = await get(userRef);
                    const otherUserData = userSnap.val() || {};
                    setOtherUserPushToken(otherUserData.expo_push_token ?? null);
                    setOtherUserName(otherUserData.name ?? null);
                }
            }
        });
    }, [chatId]);

    // Listen typing status của đối phương
    useEffect(() => {
        if (!otherUserId || !chatId) return;

        const typingRef = ref(db, `chats/${chatId}/typing/${otherUserId}`);
        const unsubscribe = onValue(typingRef, (snapshot) => {
            setOtherUserTyping(snapshot.val() === true);
        });

        return () => unsubscribe();
    }, [chatId, otherUserId, db]);

    // Realtime listener
    useEffect(() => {
        const messagesRef = ref(db, `chats/${chatId}/messages`);
        const unsubscribe = onValue(messagesRef, snapshot => {
            const data = snapshot.val() || {};
            const arr: Message[] = Object.entries(data).map(([key, val]: [string, any]) => ({
                id: key,
                sender_id: val.sender_id,
                text: val.text || '',
                timestamp: val.timestamp,
                to: val.to,
                image_url: val.image_url,
                file_url: val.file_url,
                file_name: val.file_name,
                file_type: val.file_type,
            }));
            arr.sort((a, b) => a.timestamp - b.timestamp);
            setMessages(arr);

            // Auto scroll to bottom when new messages arrive
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        });

        return () => unsubscribe();
    }, [chatId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages.length]);

    // Fetch orders liên quan đến chat này
    useEffect(() => {
        const fetchRelatedOrders = async () => {
            try {
                const response = await api.get("orders/getList");
                let ordersData = [];

                if (response.data?.success) {
                    if (response.data.data?.data) {
                        ordersData = response.data.data.data;
                    } else if (Array.isArray(response.data.data)) {
                        ordersData = response.data.data;
                    }
                }

                // Lọc orders có cùng chat_id
                const related = ordersData.filter((order: any) => order.chat_id === chatId);
                setRelatedOrders(related);
            } catch (error) {
                console.error("Error fetching related orders:", error);
            }
        };

        if (chatId) {
            fetchRelatedOrders();
        }
    }, [chatId]);

    // Request permissions
    const requestPermissions = async () => {
        if (Platform.OS !== 'web') {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Quyền bị từ chối', 'Cần cấp quyền để chọn ảnh');
                return false;
            }
        }
        return true;
    };

    // Pick image from library or camera
    const pickImage = async (useCamera: boolean = false) => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) return;

        let result;

        if (useCamera) {
            const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
            if (cameraPerm.status !== 'granted') {
                Alert.alert('Quyền bị từ chối', 'Cần cấp quyền để chụp ảnh');
                return;
            }

            result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                allowsEditing: false,
            });
        } else {
            result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                allowsEditing: false,
            });
        }

        if (result.canceled || !result.assets || result.assets.length === 0) {
            return;
        }

        const asset = result.assets[0];
        setSelectedImage(asset.uri);
        await uploadImage(asset.uri);
    };

    // Pick document/file (using ImagePicker for now, can be extended with expo-document-picker)
    const pickDocument = async () => {
        Alert.alert(
            'Thông báo',
            'Chức năng chọn file sẽ được cập nhật sớm. Hiện tại bạn có thể chọn ảnh từ thư viện.',
            [
                { text: 'OK', onPress: () => pickImage(false) },
                { text: 'Hủy', style: 'cancel' },
            ]
        );
    };

    // Upload image to Firebase Storage
    const uploadImage = async (imageUri: string) => {
        try {
            setUploading(true);

            // Tạo tên file unique
            const timestamp = Date.now();
            const fileName = `chat_images/${chatId}/${user.id}_${timestamp}.jpg`;
            const imageRef = storageRef(storage, fileName);

            // Đọc file từ local URI - React Native compatible
            let blob: Blob;

            if (Platform.OS === 'web') {
                // Web: dùng fetch
                const response = await fetch(imageUri);
                blob = await response.blob();
            } else {
                // React Native: đọc file bằng FileSystem và convert sang blob
                try {
                    // Đọc file dưới dạng base64
                    const base64 = await FileSystem.readAsStringAsync(imageUri, {
                        encoding: 'base64' as any,
                    });

                    // Convert base64 sang Uint8Array
                    const byteCharacters = atob(base64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);

                    // Tạo Blob từ Uint8Array
                    blob = new Blob([byteArray], { type: 'image/jpeg' });
                } catch (fileSystemError) {
                    // Fallback: thử dùng fetch nếu FileSystem không hoạt động
                    console.log('FileSystem failed, trying fetch:', fileSystemError);
                    const response = await fetch(imageUri);
                    blob = await response.blob();
                }
            }

            // Upload lên Firebase Storage
            const uploadTask = uploadBytesResumable(imageRef, blob);

            // Lắng nghe progress (optional)
            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log('Upload progress:', progress + '%');
                },
                (error: any) => {
                    console.error('Upload error details:', {
                        code: error.code,
                        message: error.message,
                        serverResponse: error.serverResponse,
                        customData: error.customData,
                        stack: error.stack,
                    });

                    let errorMessage = 'Không thể tải ảnh lên Firebase Storage.';
                    if (error.code === 'storage/unauthorized') {
                        errorMessage = 'Bạn không có quyền upload. Vui lòng kiểm tra Firebase Storage rules.';
                    } else if (error.code === 'storage/canceled') {
                        errorMessage = 'Upload đã bị hủy.';
                    } else if (error.message) {
                        errorMessage = `Lỗi: ${error.message}`;
                    }

                    Alert.alert('Lỗi upload', errorMessage);
                    setSelectedImage(null);
                    setUploading(false);
                },
                async () => {
                    // Upload thành công, lấy download URL
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        console.log('Image uploaded successfully:', downloadURL);

                        // Gửi message với image URL
                        await sendMessage('', downloadURL);
                        setSelectedImage(null);
                    } catch (error) {
                        console.error('Error getting download URL:', error);
                        Alert.alert('Lỗi', 'Không thể lấy URL ảnh');
                        setSelectedImage(null);
                    } finally {
                        setUploading(false);
                    }
                }
            );
        } catch (err: any) {
            console.error('Error uploading image:', err);
            Alert.alert('Lỗi', err.message || 'Không thể tải ảnh lên');
            setSelectedImage(null);
            setUploading(false);
        }
    };

    // Upload file to server
    const uploadFile = async (fileUri: string, fileName: string, mimeType: string) => {
        try {
            setUploading(true);

            const formData = new FormData();
            formData.append('files[0]', {
                uri: fileUri,
                type: mimeType,
                name: fileName,
            } as any);

            const response = await api.post('upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data && response.data.length > 0 && response.data[0].file_url) {
                const fileUrl = response.data[0].file_url;
                await sendMessage('', undefined, fileUrl, fileName, mimeType);
            } else {
                throw new Error('Upload failed');
            }
        } catch (err: any) {
            console.error('Error uploading file:', err);
            Alert.alert('Lỗi', err.response?.data?.message || 'Không thể tải file lên');
        } finally {
            setUploading(false);
        }
    };

    // Gửi tin nhắn + push notification
    const sendMessage = async (messageText?: string, imageUrl?: string, fileUrl?: string, fileName?: string, fileType?: string) => {
        const finalText = messageText || text;
        if ((!finalText.trim() && !imageUrl && !fileUrl) || !otherUserId) return;

        const messagesRef = ref(db, `chats/${chatId}/messages`);
        const messageData: any = {
            text: finalText || '',
            sender_id: user.id,
            to: otherUserId,
            timestamp: serverTimestamp(),
        };

        if (imageUrl) {
            messageData.image_url = imageUrl;
        }

        if (fileUrl) {
            messageData.file_url = fileUrl;
            messageData.file_name = fileName;
            messageData.file_type = fileType;
        }

        await push(messagesRef, messageData);

        // Push notification vào Firebase cho đối tác
        if (otherUserId) {
            try {
                const notificationRef = ref(db, `notifications/${otherUserId}`);

                // Build data object, chỉ include các properties có giá trị (không phải undefined)
                const notificationData: any = {
                    type: 'chat_message',
                    title: user?.name ? `Tin nhắn từ ${user.name}` : 'Tin nhắn mới',
                    body: imageUrl ? '📷 Đã gửi ảnh' : fileUrl ? `📎 Đã gửi file: ${fileName || 'file'}` : finalText || 'Tin nhắn mới',
                    timestamp: Date.now() / 1000,
                    read: false,
                    data: {
                        chat_id: chatId,
                        sender_id: user.id,
                    },
                };

                // Chỉ thêm các fields có giá trị vào data
                if (user?.name) {
                    notificationData.data.sender_name = user.name;
                }
                if (imageUrl) {
                    notificationData.data.image_url = imageUrl;
                }
                if (fileUrl) {
                    notificationData.data.file_url = fileUrl;
                }
                if (fileName) {
                    notificationData.data.file_name = fileName;
                }

                await push(notificationRef, notificationData);
            } catch (error) {
                console.error('Error pushing notification to Firebase:', error);
            }
        }

        // Gửi push notification từ frontend
        if (otherUserPushToken) {
            // Tạo nội dung thông báo
            let notificationTitle = "Tin nhắn mới";
            let notificationBody = finalText;

            if (imageUrl) {
                notificationBody = "📷 Đã gửi ảnh";
            } else if (fileUrl) {
                notificationBody = `📎 Đã gửi file: ${fileName || 'file'}`;
            } else if (!finalText.trim()) {
                notificationBody = "Tin nhắn mới";
            }

            // Hiển thị tên người gửi trong title
            if (user?.name) {
                notificationTitle = `Tin nhắn từ ${user.name}`;
            }

            // Gửi notification qua Expo Push API
            try {
                await fetch("https://exp.host/--/api/v2/push/send", {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Accept-encoding": "gzip, deflate",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        to: otherUserPushToken,
                        sound: "default",
                        title: notificationTitle,
                        body: notificationBody,
                        data: {
                            type: "chat_message",
                            chat_id: chatId,
                            sender_id: user.id,
                            sender_name: user.name,
                            image_url: imageUrl,
                            file_url: fileUrl,
                        },
                    }),
                });
            } catch (error) {
                console.error("Error sending push notification:", error);
            }
        }

        setText('');
        setSelectedImage(null);

        // Clear typing status khi gửi tin nhắn
        if (isTyping && otherUserId) {
            setIsTyping(false);
            const typingRef = ref(db, `chats/${chatId}/typing/${user.id}`);
            set(typingRef, false);
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        }
    };

    // Show image picker options
    const showImagePickerOptions = () => {
        Alert.alert(
            'Chọn ảnh',
            'Bạn muốn chọn ảnh từ đâu?',
            [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Thư viện', onPress: () => pickImage(false) },
                { text: 'Camera', onPress: () => pickImage(true) },
            ]
        );
    };

    // Show attach options
    const showAttachOptions = () => {
        Alert.alert(
            'Đính kèm',
            'Bạn muốn đính kèm gì?',
            [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Ảnh', onPress: showImagePickerOptions },
                { text: 'File', onPress: pickDocument },
            ]
        );
    };

    // Render typing indicator
    const renderTypingIndicator = () => {
        if (!otherUserTyping) return null;

        return (
            <View style={[styles.messageContainer, styles.otherMessage]}>
                <View style={styles.typingIndicator}>
                    <View style={styles.typingDot} />
                    <View style={[styles.typingDot, { marginLeft: 4 }]} />
                    <View style={[styles.typingDot, { marginLeft: 4 }]} />
                </View>
            </View>
        );
    };

    // Render message
    const renderItem = ({ item }: { item: Message }) => {
        const isMe = item.sender_id === user.id;
        return (
            <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.otherMessage]}>
                {item.image_url && (
                    <Image
                        source={{ uri: item.image_url }}
                        style={styles.messageImage}
                        resizeMode="cover"
                    />
                )}
                {item.file_url && (
                    <TouchableOpacity
                        style={styles.fileContainer}
                        onPress={() => {
                            // Open file URL (you might want to use Linking.openURL)
                            Alert.alert('File', `File: ${item.file_name || 'file'}\nURL: ${item.file_url}`);
                        }}
                    >
                        <MaterialIcons name="insert-drive-file" size={24} color={isMe ? '#fff' : '#000'} />
                        <Text style={[styles.fileName, { color: isMe ? '#fff' : '#000' }]}>
                            {item.file_name || 'File'}
                        </Text>
                    </TouchableOpacity>
                )}
                {item.text ? (
                    <Text style={[styles.messageText, { color: isMe ? '#fff' : '#000' }]}>
                        {item.text}
                    </Text>
                ) : null}
            </View>
        );
    };

    // Render order context header
    const renderOrderContext = () => {
        if (relatedOrders.length === 0) return null;

        return (
            <View style={styles.orderContextContainer}>
                <Text style={styles.orderContextTitle}>
                    Đơn hàng liên quan ({relatedOrders.length})
                </Text>
                {relatedOrders.map((order) => (
                    <TouchableOpacity
                        key={order.id}
                        style={styles.orderItem}
                        onPress={() => {
                            router.push(`/orders_details?id=${order.id}`);
                        }}
                    >
                        <MaterialIcons name="shopping-bag" size={20} color="#2563EB" />
                        <View style={styles.orderItemContent}>
                            <Text style={styles.orderItemCode}>
                                Mã đơn: {order.tracking_code || `#${order.id}`}
                            </Text>
                            <Text style={styles.orderItemStatus}>
                                Trạng thái: {order.status || 'Chưa xác định'}
                            </Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={20} color="#999" />
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 10, paddingBottom: 20 }}
                    ListHeaderComponent={renderOrderContext}
                    ListFooterComponent={renderTypingIndicator}
                    onContentSizeChange={() => {
                        // Auto scroll when content size changes
                        flatListRef.current?.scrollToEnd({ animated: false });
                    }}
                    onLayout={() => {
                        // Scroll to bottom on initial load
                        setTimeout(() => {
                            flatListRef.current?.scrollToEnd({ animated: false });
                        }, 100);
                    }}
                    showsVerticalScrollIndicator={true}
                />
                {uploading && (
                    <View style={styles.uploadingContainer}>
                        <ActivityIndicator size="small" color="#2563EB" />
                        <Text style={styles.uploadingText}>Đang tải lên...</Text>
                    </View>
                )}
                {selectedImage && (
                    <View style={styles.previewContainer}>
                        <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                        <TouchableOpacity
                            style={styles.removePreview}
                            onPress={() => setSelectedImage(null)}
                        >
                            <MaterialIcons name="close" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}
                <View style={styles.inputContainer}>
                    <TouchableOpacity
                        style={styles.attachButton}
                        onPress={showAttachOptions}
                        disabled={uploading}
                    >
                        <MaterialIcons name="attach-file" size={24} color="#2563EB" />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        value={text}
                        onChangeText={(value) => {
                            setText(value);
                            // Scroll to bottom when typing
                            setTimeout(() => {
                                flatListRef.current?.scrollToEnd({ animated: true });
                            }, 50);
                        }}
                        placeholder="Nhập tin nhắn..."
                        multiline
                        editable={!uploading}
                        onFocus={() => {
                            // Scroll to bottom when input is focused
                            setTimeout(() => {
                                flatListRef.current?.scrollToEnd({ animated: true });
                            }, 300);
                        }}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, (!text.trim() && !selectedImage) && styles.sendButtonDisabled]}
                        onPress={() => {
                            sendMessage();
                            // Scroll to bottom after sending
                            setTimeout(() => {
                                flatListRef.current?.scrollToEnd({ animated: true });
                            }, 100);
                        }}
                        disabled={!text.trim() && !selectedImage || uploading}
                    >
                        <MaterialIcons name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    messageContainer: {
        marginVertical: 4,
        padding: 8,
        borderRadius: 8,
        maxWidth: '80%',
    },
    myMessage: {
        backgroundColor: '#2563EB',
        alignSelf: 'flex-end',
    },
    otherMessage: {
        backgroundColor: '#e0e0e0',
        alignSelf: 'flex-start',
    },
    messageText: {
        fontSize: 14,
    },
    messageImage: {
        width: 200,
        height: 200,
        borderRadius: 8,
        marginBottom: 4,
    },
    fileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 8,
        marginBottom: 4,
    },
    fileName: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
    },
    inputContainer: {
        flexDirection: 'row',
        paddingBottom: Platform.OS === 'ios' ? 10 : 20,
        paddingTop: 10,
        paddingLeft: 10,
        paddingRight: 10,
        borderTopWidth: 1,
        borderColor: '#ccc',
        alignItems: 'flex-end',
        backgroundColor: '#fff',
        minHeight: 60,
    },
    attachButton: {
        padding: 8,
        marginRight: 8,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginRight: 8,
        maxHeight: 100,
        fontSize: 14,
    },
    sendButton: {
        backgroundColor: '#2563EB',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#ccc',
    },
    uploadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        backgroundColor: '#f0f0f0',
    },
    uploadingText: {
        marginLeft: 8,
        color: '#666',
        fontSize: 12,
    },
    previewContainer: {
        position: 'relative',
        margin: 10,
        alignSelf: 'flex-start',
    },
    previewImage: {
        width: 100,
        height: 100,
        borderRadius: 8,
    },
    removePreview: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#ef4444',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
    typingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#999',
        marginHorizontal: 2,
    },
    orderContextContainer: {
        backgroundColor: '#f5f5f5',
        padding: 12,
        marginBottom: 10,
        borderRadius: 8,
        marginHorizontal: 10,
    },
    orderContextTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    orderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 6,
        marginBottom: 6,
    },
    orderItemContent: {
        flex: 1,
        marginLeft: 10,
    },
    orderItemCode: {
        fontSize: 13,
        fontWeight: '600',
        color: '#333',
    },
    orderItemStatus: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
});
