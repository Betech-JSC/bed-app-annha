# Hướng dẫn Cấu hình Đăng nhập Social (Google & Facebook) - Frontend

## 1. Cài đặt Dependencies

Các packages đã được cài đặt sẵn:
- `expo-auth-session` - Cho Google và Facebook OAuth
- `expo-web-browser` - Để mở browser cho authentication

## 2. Cấu hình Environment Variables

Tạo file `.env` trong thư mục `fe/`:

```env
# API Configuration
API_URL=http://localhost:8000/api

# Google OAuth Configuration
EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID=your_google_expo_client_id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_google_ios_client_id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_google_android_client_id

# Facebook OAuth Configuration
EXPO_PUBLIC_FACEBOOK_APP_ID=your_facebook_app_id
```

## 3. Tạo OAuth Credentials

### Google OAuth Setup:

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project hiện có
3. Enable Google+ API
4. Tạo OAuth 2.0 Client IDs:
   - **Web application** (Expo Client ID):
     - Authorized redirect URIs: `https://auth.expo.io/@your-username/your-app-slug`
   - **iOS**:
     - Bundle ID: `com.toannguyen112.reactnativeboilerplate`
   - **Android**:
     - Package name: `com.toannguyen112.reactnativeboilerplate`
     - SHA-1 certificate fingerprint (lấy từ `expo credentials`)

5. Copy các Client IDs vào file `.env`

### Facebook OAuth Setup:

1. Truy cập [Facebook Developers](https://developers.facebook.com/)
2. Tạo App mới
3. Thêm Facebook Login product
4. Cấu hình:
   - **Valid OAuth Redirect URIs**:
     - `https://auth.expo.io/@your-username/your-app-slug`
     - `fb{APP_ID}://authorize` (cho iOS)
     - `com.toannguyen112.reactnativeboilerplate://authorize` (cho Android)
   - **Bundle ID** (iOS): `com.toannguyen112.reactnativeboilerplate`
   - **Package Name** (Android): `com.toannguyen112.reactnativeboilerplate`

5. Copy App ID vào file `.env`

## 4. Cấu hình app.json

Đã được cập nhật với:
- iOS Google Sign-In config
- Android Google Services config

## 5. Sử dụng

Component `SocialMedia` đã được tích hợp vào màn hình `login.tsx`. 

Khi user bấm vào nút Google hoặc Facebook:
1. Mở browser để đăng nhập
2. Lấy access token
3. Gửi lên backend API `/api/auth/{provider}/login`
4. Nhận user info và token
5. Lưu vào Redux store
6. Redirect đến màn hình home theo role

## 6. Testing

### Development:
- Sử dụng Expo Go app
- Cần cấu hình redirect URIs cho Expo development

### Production:
- Cần build app với `expo build` hoặc EAS Build
- Cấu hình OAuth credentials cho production bundle IDs

## 7. Troubleshooting

### Lỗi "Invalid client"
- Kiểm tra Client IDs trong `.env`
- Đảm bảo redirect URIs đúng

### Lỗi "Redirect URI mismatch"
- Kiểm tra redirect URIs trong Google/Facebook console
- Đảm bảo khớp với app scheme

### Lỗi "Access token required"
- Kiểm tra xem access token có được trả về từ provider không
- Log `responseG` và `responseF` để debug

## 8. Notes

- Component tự động xử lý loading state
- Tự động lưu push token sau khi đăng nhập
- Tự động redirect theo role (sender/customer)
- Hỗ trợ gộp tài khoản nếu email đã tồn tại

