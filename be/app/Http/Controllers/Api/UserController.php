<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Hash;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Facades\Storage;


class UserController extends Controller
{

    public function savePushToken(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'token' => 'required|string',
        ]);

        $user = User::find($request->user_id);
        $user->fcm_token = $request->token; // hoặc expo_push_token
        $user->save();

        return response()->json(['success' => true]);
    }

    public function show(Request $request)
    {
        return response()->json($request->user());
    }

    /**
     * Lấy thông tin user theo ID (public profile)
     */
    public function showById($id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy người dùng'
            ], 404);
        }

        // Thống kê đơn hàng
        $ordersAsSender = Order::where('sender_id', $user->id)
            ->where('status', 'completed')
            ->count();
        $ordersAsCustomer = Order::where('customer_id', $user->id)
            ->where('status', 'completed')
            ->count();
        $totalOrders = Order::where(function ($query) use ($user) {
            $query->where('sender_id', $user->id)
                ->orWhere('customer_id', $user->id);
        })->count();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'avatar' => $user->avatar,
                'role' => $user->role,
                'kyc_status' => $user->kyc_status,
                'verified' => $user->kyc_status === 'verified',
                'rating' => 5.0, // TODO: Tính toán rating thực tế từ reviews
                'total_orders' => $totalOrders,
                'completed_orders' => $ordersAsSender + $ordersAsCustomer,
            ],
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();

        // Validate dữ liệu
        $validatedData = $request->validate([
            'name' => 'sometimes|string|max:255',
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'email' => [
                'sometimes',
                'email',
                'max:255',
                Rule::unique('users')->ignore($user->id),
            ],
            'phone' => 'sometimes|string|max:20',
            'password' => 'sometimes|string|min:6|confirmed',
            'avatar' => 'sometimes|image|mimes:jpeg,png,jpg,webp|max:5120', // max 5MB
        ]);

        // Hash password nếu có
        if (isset($validatedData['password'])) {
            $validatedData['password'] = Hash::make($validatedData['password']);
        }

        // Lưu avatar nếu có
        if ($request->hasFile('avatar')) {
            $file = $request->file('avatar');

            // Tạo tên file unique
            $extension = $file->getClientOriginalExtension();
            $fileName = 'avatar_' . $user->id . '_' . time() . '.' . $extension;
            $path = $file->storeAs('avatars', $fileName, 'public');

            $validatedData['avatar'] = $path;

            // Xóa avatar cũ nếu có
            if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
            }
        }

        // Cập nhật user
        $user->update($validatedData);
        $user->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật thông tin thành công',
            'data' => [
                'user' => $user,
                'avatar_url' => $user->avatar ? asset('storage/' . $user->avatar) : null,
            ],
        ]);
    }


    public function changePassword(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'current_password' => ['required'],
            'new_password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Mật khẩu hiện tại không đúng.'], 422);
        }

        $user->password = bcrypt($request->new_password);
        $user->save();

        return response()->json(['message' => 'Đổi mật khẩu thành công.']);
    }

    public function uploadAvatar(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'avatar' => 'required|image|max:2048',
        ]);

        $path = $request->file('avatar')->store('avatars', 'public');

        $user->avatar = $path;
        $user->save();

        return response()->json([
            'message' => 'Upload avatar thành công.',
            'avatar_url' => asset('storage/' . $path),
        ]);
    }

    /**
     * Xóa tài khoản của user hiện tại (yêu cầu của Apple App Store)
     */
    public function deleteAccount(Request $request)
    {
        $user = $request->user();

        // Không cho phép xóa tài khoản super admin
        if ($user->owner === true) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa tài khoản Super Admin.'
            ], 403);
        }

        try {
            // Xóa avatar nếu có
            if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
            }

            // Xóa tài khoản (soft delete)
            $user->delete();

            // Revoke all tokens
            $user->tokens()->delete();

            return response()->json([
                'success' => true,
                'message' => 'Tài khoản đã được xóa thành công.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi xóa tài khoản.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
