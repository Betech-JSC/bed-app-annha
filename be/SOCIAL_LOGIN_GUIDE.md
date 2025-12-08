# Hướng dẫn Đăng nhập Social (Google & Facebook)

## Cấu hình Backend

### 1. Cài đặt Laravel Socialite (Đã có sẵn)

Package `laravel/socialite` đã được cài đặt trong `composer.json`.

### 2. Cấu hình Environment Variables

Thêm vào file `.env`:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://your-domain.com/api/auth/google/callback

# Facebook OAuth
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret
FACEBOOK_REDIRECT_URI=http://your-domain.com/api/auth/facebook/callback
```

### 3. Tạo OAuth Credentials

#### Google OAuth:
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project hiện có
3. Enable Google+ API
4. Tạo OAuth 2.0 Client ID
5. Thêm Authorized redirect URIs:
   - `http://your-domain.com/api/auth/google/callback` (cho web)
   - `com.yourapp://` (cho mobile app - custom scheme)

#### Facebook OAuth:
1. Truy cập [Facebook Developers](https://developers.facebook.com/)
2. Tạo App mới
3. Thêm Facebook Login product
4. Cấu hình Valid OAuth Redirect URIs:
   - `http://your-domain.com/api/auth/facebook/callback` (cho web)
   - `com.yourapp://` (cho mobile app - custom scheme)

## API Endpoints

### 1. Đăng nhập với Google

**Endpoint:** `POST /api/auth/google/login`

**Request Body:**
```json
{
  "access_token": "ya29.a0AfH6SMBx..."
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Social login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": "https://lh3.googleusercontent.com/...",
      "provider": "google",
      "provider_id": "123456789",
      "token": "1|abcdefghijklmnopqrstuvwxyz..."
    }
  }
}
```

### 2. Đăng nhập với Facebook

**Endpoint:** `POST /api/auth/facebook/login`

**Request Body:**
```json
{
  "access_token": "EAAx..."
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Social login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": "https://graph.facebook.com/...",
      "provider": "facebook",
      "provider_id": "123456789",
      "token": "1|abcdefghijklmnopqrstuvwxyz..."
    }
  }
}
```

### 3. Redirect URL (cho Web - Optional)

**Endpoint:** `GET /api/auth/{provider}/redirect`

**Response:**
```json
{
  "success": true,
  "message": "Redirecting to Google",
  "data": {
    "redirect_url": "https://accounts.google.com/o/oauth2/auth?..."
  }
}
```

## Cách sử dụng trong React Native (Expo)

### 1. Cài đặt packages

```bash
npm install @react-native-google-signin/google-signin
npm install expo-auth-session expo-crypto
# hoặc
expo install expo-auth-session expo-crypto
```

### 2. Đăng nhập với Google

```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import api from '@/api/api';

// Cấu hình Google Sign-In
GoogleSignin.configure({
  webClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID', // From Google Cloud Console
});

// Hàm đăng nhập
const signInWithGoogle = async () => {
  try {
    // Đăng nhập với Google
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    
    // Lấy access token
    const tokens = await GoogleSignin.getTokens();
    const accessToken = tokens.accessToken;
    
    // Gửi access token lên backend
    const response = await api.post('/auth/google/login', {
      access_token: accessToken,
    });
    
    // Lưu token vào storage
    await AsyncStorage.setItem('token', response.data.data.user.token);
    await AsyncStorage.setItem('user', JSON.stringify(response.data.data.user));
    
    return response.data.data.user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
};
```

### 3. Đăng nhập với Facebook

```typescript
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import api from '@/api/api';

// Cấu hình Facebook
const discovery = {
  authorizationEndpoint: 'https://www.facebook.com/v18.0/dialog/oauth',
  tokenEndpoint: 'https://graph.facebook.com/v18.0/oauth/access_token',
};

// Hàm đăng nhập
const signInWithFacebook = async () => {
  try {
    const request = new AuthSession.AuthRequest({
      clientId: 'YOUR_FACEBOOK_APP_ID',
      scopes: ['public_profile', 'email'],
      redirectUri: AuthSession.makeRedirectUri({
        scheme: 'com.yourapp',
      }),
      responseType: AuthSession.ResponseType.Token,
    });

    const result = await request.promptAsync(discovery);
    
    if (result.type === 'success') {
      const { access_token } = result.params;
      
      // Gửi access token lên backend
      const response = await api.post('/auth/facebook/login', {
        access_token: access_token,
      });
      
      // Lưu token vào storage
      await AsyncStorage.setItem('token', response.data.data.user.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.data.user));
      
      return response.data.data.user;
    }
  } catch (error) {
    console.error('Facebook Sign-In Error:', error);
    throw error;
  }
};
```

## Lưu ý

1. **Access Token**: Mobile app cần lấy access token từ Google/Facebook SDK và gửi lên backend
2. **Email có thể null**: Một số trường hợp Facebook không trả về email, hệ thống sẽ tạo email tạm
3. **Gộp tài khoản**: Nếu email đã tồn tại, hệ thống sẽ tự động gộp tài khoản (cập nhật provider)
4. **Avatar**: Tự động lấy và cập nhật avatar từ social provider
5. **Token**: Sau khi đăng nhập thành công, sử dụng token trong header `Authorization: Bearer {token}` cho các API calls tiếp theo

## Error Handling

### Invalid Access Token
```json
{
  "success": false,
  "message": "Invalid access token.",
  "error": 401
}
```

### Unsupported Provider
```json
{
  "success": false,
  "message": "Unsupported provider",
  "error": 400
}
```

### Access Token Required
```json
{
  "success": false,
  "message": "Access token is required",
  "error": 400
}
```

