<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Helpers\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use App\Http\Controllers\Controller;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        // Disable register - chỉ tạo user qua seeder hoặc admin panel
        return ApiResponse::error('Đăng ký tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.', 403);

        // Code cũ đã được comment để tham khảo
        /*
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'email' => 'required|string|email|max:255|unique:users',
                'phone' => 'nullable|string|max:20',
                'password' => 'required|string|min:8',
                'role' => 'nullable|string|in:admin', // Chỉ cho phép admin
                'fcm_token' => 'nullable|string', // FCM token từ frontend
            ]);

            if ($validator->fails()) {
                return ApiResponse::validationError($validator);
            }

            // Chỉ cho phép tạo user với role admin (super admin)
            $userData = [
                'name' => $request->name,
                'email' => $request->email,
                'phone' => $request->phone,
                'password' => Hash::make($request->password),
                'role' => 'admin', // Chỉ tạo admin
            ];

            // Lưu FCM token nếu có
            if ($request->has('fcm_token') && !empty($request->fcm_token)) {
                $userData['fcm_token'] = $request->fcm_token;
                Log::info('FCM token provided during registration', ['fcm_token' => $request->fcm_token]);
            } else {
                Log::info('FCM token not provided during registration', [
                    'has_fcm_token' => $request->has('fcm_token'),
                    'fcm_token_value' => $request->input('fcm_token'),
                ]);
            }

            $user = User::create($userData);

            $token = $user->createToken('MyApp')->plainTextToken;

            $user->remember_token = $token;
            $user->save();

            return ApiResponse::success([
                'user' => array_merge($user->toArray(), ['token' => $token]),
            ], 'User created successfully');
        } catch (\Throwable $th) {
            return ApiResponse::error('An error occurred: ' . $th->getMessage());
        }
        */
    }

    public function login(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'email' => 'required|string|email|max:255',
                'password' => 'required|string|min:8',
                'fcm_token' => 'nullable|string', // FCM token từ frontend
            ]);

            if ($validator->fails()) {
                return ApiResponse::validationError($validator);
            }

            $user = User::where('email', $request->email)->first();

            if (!$user || !Hash::check($request->password, $user->password)) {
                throw ValidationException::withMessages([
                    'email' => ['The provided credentials are incorrect.'],
                ]);
            }

            // Lưu FCM token nếu có
            if ($request->has('fcm_token') && !empty($request->fcm_token)) {
                $user->fcm_token = $request->fcm_token;
                $user->save();
                Log::info('FCM token saved for user: ' . $user->id, ['fcm_token' => $request->fcm_token]);
            } else {
                Log::info('FCM token not provided or empty for user: ' . $user->id, [
                    'has_fcm_token' => $request->has('fcm_token'),
                    'fcm_token_value' => $request->input('fcm_token'),
                ]);
            }

            $token = $user->createToken('MyApp')->plainTextToken;

            // Load roles relationship
            $user->load('roles');

            $userData = $user->toArray();
            $userData['token'] = $token;
            $userData['roles'] = $user->roles->map(function ($role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'description' => $role->description,
                ];
            })->toArray();

            return ApiResponse::success([
                'user' => $userData,
            ], 'User Login successful');
        } catch (ValidationException $e) {
            return ApiResponse::validationError($e->validator);
        } catch (\Exception $e) {
            return ApiResponse::error('An error occurred while logging in: ' . $e->getMessage());
        }
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return ApiResponse::success(null, 'Logged out successfully');
    }

    /**
     * Redirect to provider (Google/Facebook)
     */
    public function redirectToProvider($provider)
    {
        $validProviders = ['google', 'facebook'];

        if (!in_array($provider, $validProviders)) {
            return ApiResponse::error('Unsupported provider', 400);
        }

        try {
            $redirectUrl = Socialite::driver($provider)
                ->stateless()
                ->redirect()
                ->getTargetUrl();

            return ApiResponse::success(['redirect_url' => $redirectUrl], 'Redirecting to ' . ucfirst($provider));
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to redirect: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Handle callback from provider
     */
    public function handleProviderCallback(Request $request, $provider)
    {
        $validProviders = ['google', 'facebook'];

        if (!in_array($provider, $validProviders)) {
            return ApiResponse::error('Unsupported provider', 400);
        }

        try {
            // Lấy access_token từ frontend (Expo gửi qua POST)
            $accessToken = $request->input('access_token');

            if (!$accessToken) {
                return ApiResponse::error('Access token is required', 400);
            }

            // Dùng access_token để lấy thông tin user từ provider
            $socialUser = Socialite::driver($provider)
                ->stateless()
                ->userFromToken($accessToken);

            // Tìm user theo provider_id hoặc email
            $user = User::where('provider', $provider)
                ->where('provider_id', $socialUser->getId())
                ->first();

            if (!$user) {
                $email = $socialUser->getEmail();
                $name = $socialUser->getName() ?? 'User';
                $avatar = $socialUser->getAvatar();
                $providerId = $socialUser->getId();

                // Kiểm tra email đã tồn tại chưa (tránh duplicate)
                // Nếu email null (một số trường hợp Facebook), chỉ tìm theo provider_id
                if ($email) {
                    $existingUser = User::where('email', $email)->first();
                } else {
                    $existingUser = null;
                }

                if ($existingUser) {
                    // Gộp tài khoản: cập nhật provider
                    $existingUser->update([
                        'provider' => $provider,
                        'provider_id' => $providerId,
                        'avatar' => $avatar ?? $existingUser->avatar,
                    ]);
                    $user = $existingUser;
                } else {
                    // Tạo user mới
                    // Nếu email null, tạo email tạm từ provider_id
                    if (!$email) {
                        $email = $provider . '_' . $providerId . '@social.local';
                    }

                    $user = User::create([
                        'name' => $name,
                        'email' => $email,
                        'provider' => $provider,
                        'provider_id' => $providerId,
                        'password' => Hash::make(Str::random(16)),
                        'avatar' => $avatar,
                    ]);
                }
            } else {
                // Cập nhật avatar nếu thay đổi
                if ($user->avatar !== $socialUser->getAvatar()) {
                    $user->avatar = $socialUser->getAvatar();
                    $user->save();
                }
            }

            // Tạo token
            $token = $user->createToken('MyApp')->plainTextToken;

            return ApiResponse::success([
                'user' => array_merge($user->toArray(), ['token' => $token]),
            ], 'Social login successful');
        } catch (\Laravel\Socialite\Two\InvalidStateException $e) {
            return ApiResponse::error('Invalid state. Please try again.', 400);
        } catch (\GuzzleHttp\Exception\ClientException $e) {
            return ApiResponse::error('Invalid access token.', 401);
        } catch (\Exception $e) {
            return ApiResponse::error('Authentication failed: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Send password reset link
     */
    public function forgotPassword(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'email' => 'required|string|email|max:255',
            ]);

            if ($validator->fails()) {
                return ApiResponse::validationError($validator);
            }

            // Send password reset link
            $status = \Illuminate\Support\Facades\Password::sendResetLink(
                $request->only('email')
            );

            if ($status != \Illuminate\Support\Facades\Password::RESET_LINK_SENT) {
                return ApiResponse::error(
                    'Không thể gửi email đặt lại mật khẩu. Vui lòng kiểm tra lại email của bạn.',
                    400
                );
            }

            return ApiResponse::success(
                null,
                'Chúng tôi đã gửi link đặt lại mật khẩu đến email của bạn. Vui lòng kiểm tra hộp thư.'
            );
        } catch (\Exception $e) {
            return ApiResponse::error('Có lỗi xảy ra: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Reset password with token
     */
    public function resetPassword(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'token' => 'required|string',
                'email' => 'required|string|email|max:255',
                'password' => 'required|string|min:8|confirmed',
            ]);

            if ($validator->fails()) {
                return ApiResponse::validationError($validator);
            }

            // Reset password
            $status = \Illuminate\Support\Facades\Password::reset(
                $request->only('email', 'password', 'password_confirmation', 'token'),
                function ($user) use ($request) {
                    $user->forceFill([
                        'password' => Hash::make($request->password),
                        'remember_token' => Str::random(60),
                    ])->save();

                    event(new \Illuminate\Auth\Events\PasswordReset($user));
                }
            );

            if ($status != \Illuminate\Support\Facades\Password::PASSWORD_RESET) {
                return ApiResponse::error(
                    'Token không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu link mới.',
                    400
                );
            }

            return ApiResponse::success(
                null,
                'Mật khẩu đã được đặt lại thành công. Bạn có thể đăng nhập với mật khẩu mới.'
            );
        } catch (\Exception $e) {
            return ApiResponse::error('Có lỗi xảy ra: ' . $e->getMessage(), 500);
        }
    }
}
