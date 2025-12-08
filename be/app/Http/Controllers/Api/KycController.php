<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Attachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class KycController extends Controller
{
    /**
     * Submit KYC verification documents
     */
    public function submit(Request $request)
    {
        $user = $request->user();

        // Kiểm tra nếu đã verified thì không cho submit lại
        if ($user->kyc_status === 'verified') {
            return response()->json([
                'success' => false,
                'message' => 'Bạn đã được xác minh KYC rồi.',
            ], 400);
        }

        $request->validate([
            'full_name' => 'required|string|max:255',
            'id_number' => 'required|string|max:50',
            'date_of_birth' => 'required|date',
            'front_image' => 'required|image|mimes:jpeg,png,jpg|max:5120', // 5MB
            'back_image' => 'required|image|mimes:jpeg,png,jpg|max:5120',
        ]);

        try {
            return DB::transaction(function () use ($request, $user) {
                // Upload front image
                $frontPath = $request->file('front_image')->store('kyc/' . $user->id, 'public');
                $frontUrl = asset('storage/' . $frontPath);

                // Upload back image
                $backPath = $request->file('back_image')->store('kyc/' . $user->id, 'public');
                $backUrl = asset('storage/' . $backPath);

                // Lưu thông tin KYC
                $user->update([
                    'kyc_status' => 'pending',
                    'kyc_documents' => [
                        'full_name' => $request->full_name,
                        'id_number' => $request->id_number,
                        'date_of_birth' => $request->date_of_birth,
                        'front_image' => $frontUrl,
                        'front_path' => $frontPath,
                        'back_image' => $backUrl,
                        'back_path' => $backPath,
                    ],
                    'kyc_submitted_at' => now(),
                ]);

                // Tạo attachment records (optional, để quản lý file tốt hơn)
                Attachment::create([
                    'original_name' => $request->file('front_image')->getClientOriginalName(),
                    'type' => 'image',
                    'file_name' => basename($frontPath),
                    'file_path' => $frontPath,
                    'file_url' => $frontUrl,
                    'file_size' => $request->file('front_image')->getSize(),
                    'mime_type' => $request->file('front_image')->getMimeType(),
                    'attachable_type' => User::class,
                    'attachable_id' => $user->id,
                    'uploaded_by' => $user->id,
                    'description' => 'KYC - Mặt trước CMND/CCCD',
                    'sort_order' => 1,
                ]);

                Attachment::create([
                    'original_name' => $request->file('back_image')->getClientOriginalName(),
                    'type' => 'image',
                    'file_name' => basename($backPath),
                    'file_path' => $backPath,
                    'file_url' => $backUrl,
                    'file_size' => $request->file('back_image')->getSize(),
                    'mime_type' => $request->file('back_image')->getMimeType(),
                    'attachable_type' => User::class,
                    'attachable_id' => $user->id,
                    'uploaded_by' => $user->id,
                    'description' => 'KYC - Mặt sau CMND/CCCD',
                    'sort_order' => 2,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Đã gửi thông tin KYC thành công. Vui lòng chờ xét duyệt.',
                    'data' => [
                        'kyc_status' => $user->kyc_status,
                        'kyc_submitted_at' => $user->kyc_submitted_at,
                    ],
                ], 200);
            });
        } catch (\Exception $e) {
            Log::error('KYC submission error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi gửi thông tin KYC. Vui lòng thử lại.',
            ], 500);
        }
    }

    /**
     * Get KYC status
     */
    public function status(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'kyc_status' => $user->kyc_status,
                'kyc_submitted_at' => $user->kyc_submitted_at,
                'kyc_verified_at' => $user->kyc_verified_at,
                'kyc_rejection_reason' => $user->kyc_rejection_reason,
                'documents' => $user->kyc_documents,
            ],
        ]);
    }
}


