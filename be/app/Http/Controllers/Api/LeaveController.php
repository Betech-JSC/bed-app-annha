<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use App\Models\LeaveBalance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class LeaveController extends Controller
{
    public function getRequests(Request $request)
    {
        $user = auth()->user();
        
        $query = LeaveRequest::with(['user', 'project', 'approver', 'creator']);

        // Nếu không phải admin/owner, chỉ xem của mình
        if (!$user->owner && $user->role !== 'admin' && !$user->hasPermission('leave.view')) {
            $query->where('user_id', $user->id);
        } elseif ($request->query('user_id')) {
            $query->where('user_id', $request->query('user_id'));
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($leaveType = $request->query('leave_type')) {
            $query->where('leave_type', $leaveType);
        }

        $requests = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $requests
        ]);
    }

    public function createRequest(Request $request)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('leave.create') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo đơn nghỉ phép.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'project_id' => 'nullable|exists:projects,id',
            'leave_type' => 'required|in:annual,sick,unpaid,maternity,paternity,other',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $startDate = Carbon::parse($request->start_date);
        $endDate = Carbon::parse($request->end_date);
        $days = $startDate->diffInDays($endDate) + 1;

        // Kiểm tra số ngày phép còn lại
        if ($request->leave_type === 'annual') {
            $balance = LeaveBalance::where('user_id', $user->id)
                ->where('year', $startDate->year)
                ->where('leave_type', 'annual')
                ->first();

            if (!$balance || $balance->remaining_days < $days) {
                return response()->json([
                    'success' => false,
                    'message' => 'Số ngày phép còn lại không đủ.'
                ], 422);
            }
        }

        $leaveRequest = LeaveRequest::create([
            'user_id' => $user->id,
            'project_id' => $request->project_id,
            'leave_type' => $request->leave_type,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'days' => $days,
            'reason' => $request->reason,
            'status' => 'pending',
            'created_by' => $user->id,
        ]);

        $leaveRequest->load(['user', 'project']);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo đơn nghỉ phép thành công.',
            'data' => $leaveRequest
        ], 201);
    }

    public function approve(Request $request, string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('leave.approve') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền duyệt đơn nghỉ phép.'
            ], 403);
        }

        $leaveRequest = LeaveRequest::findOrFail($id);

        if ($leaveRequest->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Đơn nghỉ phép đã được xử lý.'
            ], 422);
        }

        $leaveRequest->update([
            'status' => 'approved',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        // Cập nhật leave balance nếu là phép năm
        if ($leaveRequest->leave_type === 'annual') {
            $balance = LeaveBalance::firstOrCreate([
                'user_id' => $leaveRequest->user_id,
                'year' => Carbon::parse($leaveRequest->start_date)->year,
                'leave_type' => 'annual',
            ], [
                'total_days' => 12, // Mặc định 12 ngày/năm
                'used_days' => 0,
                'remaining_days' => 12,
            ]);

            $balance->increment('used_days', $leaveRequest->days);
            $balance->decrement('remaining_days', $leaveRequest->days);
        }

        $leaveRequest->load(['user', 'project', 'approver']);

        return response()->json([
            'success' => true,
            'message' => 'Đã duyệt đơn nghỉ phép thành công.',
            'data' => $leaveRequest
        ]);
    }

    public function reject(Request $request, string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('leave.approve') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền từ chối đơn nghỉ phép.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'rejection_reason' => 'required|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Vui lòng nhập lý do từ chối.',
                'errors' => $validator->errors()
            ], 422);
        }

        $leaveRequest = LeaveRequest::findOrFail($id);

        if ($leaveRequest->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Đơn nghỉ phép đã được xử lý.'
            ], 422);
        }

        $leaveRequest->update([
            'status' => 'rejected',
            'approved_by' => $user->id,
            'approved_at' => now(),
            'rejection_reason' => $request->rejection_reason,
        ]);

        $leaveRequest->load(['user', 'project', 'approver']);

        return response()->json([
            'success' => true,
            'message' => 'Đã từ chối đơn nghỉ phép.',
            'data' => $leaveRequest
        ]);
    }

    public function getBalance(Request $request)
    {
        $user = auth()->user();
        $userId = $request->query('user_id') ?? $user->id;

        // Chỉ admin/owner mới xem balance của người khác
        if ($userId !== $user->id && !$user->owner && $user->role !== 'admin' && !$user->hasPermission('leave.view')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem số ngày phép của người khác.'
            ], 403);
        }

        $year = $request->query('year') ?? date('Y');
        $balances = LeaveBalance::where('user_id', $userId)
            ->where('year', $year)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $balances
        ]);
    }
}
