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
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'email' => 'required|string|email|max:255',
                'password' => 'required|string',
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
     * Public self-registration (SaaS — App Store requirement)
     */
    public function register(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'email' => 'required|string|email|max:255|unique:users',
                'password' => 'required|string|min:8|confirmed',
                'phone' => 'nullable|string|max:20',
            ], [
                'name.required' => 'Vui lòng nhập họ và tên.',
                'email.required' => 'Vui lòng nhập email.',
                'email.email' => 'Email không hợp lệ.',
                'email.unique' => 'Email đã được sử dụng.',
                'password.required' => 'Vui lòng nhập mật khẩu.',
                'password.min' => 'Mật khẩu phải có ít nhất 8 ký tự.',
                'password.confirmed' => 'Xác nhận mật khẩu không khớp.',
            ]);

            if ($validator->fails()) {
                return ApiResponse::validationError($validator);
            }

            // Tạo người dùng mới
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'phone' => $request->phone,
            ]);

            // Lưu FCM token nếu có
            if ($request->has('fcm_token') && !empty($request->fcm_token)) {
                $user->fcm_token = $request->fcm_token;
                $user->save();
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
            ], 'Đăng ký thành công');
        } catch (\Exception $e) {
            Log::error('Registration error: ' . $e->getMessage());
            return ApiResponse::error('Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.');
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
                'password' => 'required|string|confirmed',
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
