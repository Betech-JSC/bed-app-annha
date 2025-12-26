<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmploymentContract;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class EmploymentContractController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        
        $query = EmploymentContract::with(['user', 'creator']);

        // Nếu không phải admin/owner, chỉ xem của mình
        if (!$user->owner && $user->role !== 'admin' && !$user->hasPermission('contracts.view')) {
            $query->where('user_id', $user->id);
        } elseif ($request->query('user_id')) {
            $query->where('user_id', $request->query('user_id'));
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($contractType = $request->query('contract_type')) {
            $query->where('contract_type', $contractType);
        }

        $contracts = $query->orderBy('start_date', 'desc')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $contracts
        ]);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('contracts.create') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo hợp đồng lao động.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'contract_type' => 'required|in:probation,fixed_term,indefinite,part_time,internship',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after:start_date',
            'base_salary' => 'required|numeric|min:0',
            'job_title' => 'nullable|string|max:255',
            'job_description' => 'nullable|string|max:2000',
            'benefits' => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        // Kiểm tra hợp đồng đang active
        if ($request->contract_type !== 'probation') {
            $activeContract = EmploymentContract::where('user_id', $request->user_id)
                ->where('status', 'active')
                ->first();

            if ($activeContract) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nhân viên đã có hợp đồng đang active.'
                ], 422);
            }
        }

        $contract = EmploymentContract::create([
            'user_id' => $request->user_id,
            'contract_type' => $request->contract_type,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'base_salary' => $request->base_salary,
            'job_title' => $request->job_title,
            'job_description' => $request->job_description,
            'benefits' => $request->benefits,
            'status' => 'draft',
            'created_by' => $user->id,
        ]);

        $contract->load(['user', 'creator']);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo hợp đồng lao động thành công.',
            'data' => $contract
        ], 201);
    }

    public function show(string $id)
    {
        $user = auth()->user();
        
        $contract = EmploymentContract::with(['user', 'creator'])->findOrFail($id);

        // Kiểm tra quyền
        if ($contract->user_id !== $user->id && !$user->owner && $user->role !== 'admin' && !$user->hasPermission('contracts.view')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem hợp đồng này.'
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $contract
        ]);
    }

    public function update(Request $request, string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('contracts.update') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền cập nhật hợp đồng lao động.'
            ], 403);
        }

        $contract = EmploymentContract::findOrFail($id);

        if ($contract->status === 'terminated') {
            return response()->json([
                'success' => false,
                'message' => 'Không thể cập nhật hợp đồng đã chấm dứt.'
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'contract_type' => 'sometimes|required|in:probation,fixed_term,indefinite,part_time,internship',
            'start_date' => 'sometimes|required|date',
            'end_date' => 'nullable|date|after:start_date',
            'base_salary' => 'sometimes|required|numeric|min:0',
            'job_title' => 'nullable|string|max:255',
            'job_description' => 'nullable|string|max:2000',
            'benefits' => 'nullable|string|max:2000',
            'status' => 'in:draft,active,expired,terminated,renewed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $contract->update($request->only([
            'contract_type', 'start_date', 'end_date', 'base_salary',
            'job_title', 'job_description', 'benefits', 'status'
        ]));

        $contract->load(['user', 'creator']);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật hợp đồng lao động thành công.',
            'data' => $contract
        ]);
    }

    public function renew(Request $request, string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('contracts.update') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền gia hạn hợp đồng.'
            ], 403);
        }

        $contract = EmploymentContract::findOrFail($id);

        if ($contract->status !== 'active' && $contract->status !== 'expired') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể gia hạn hợp đồng đang active hoặc đã hết hạn.'
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'end_date' => 'required|date|after:' . $contract->end_date,
            'base_salary' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        // Đánh dấu hợp đồng cũ là renewed
        $contract->update(['status' => 'renewed']);

        // Tạo hợp đồng mới
        $newContract = EmploymentContract::create([
            'user_id' => $contract->user_id,
            'contract_type' => $contract->contract_type,
            'start_date' => Carbon::parse($contract->end_date)->addDay(),
            'end_date' => $request->end_date,
            'base_salary' => $request->base_salary ?? $contract->base_salary,
            'job_title' => $contract->job_title,
            'job_description' => $contract->job_description,
            'benefits' => $contract->benefits,
            'status' => 'active',
            'created_by' => $user->id,
        ]);

        $newContract->load(['user', 'creator']);

        return response()->json([
            'success' => true,
            'message' => 'Đã gia hạn hợp đồng thành công.',
            'data' => $newContract
        ]);
    }

    public function terminate(Request $request, string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('contracts.update') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền chấm dứt hợp đồng.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'termination_reason' => 'required|string|max:1000',
            'terminated_date' => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Vui lòng nhập lý do chấm dứt.',
                'errors' => $validator->errors()
            ], 422);
        }

        $contract = EmploymentContract::findOrFail($id);

        if ($contract->status === 'terminated') {
            return response()->json([
                'success' => false,
                'message' => 'Hợp đồng đã được chấm dứt.'
            ], 422);
        }

        $contract->update([
            'status' => 'terminated',
            'terminated_date' => $request->terminated_date,
            'termination_reason' => $request->termination_reason,
        ]);

        $contract->load(['user', 'creator']);

        return response()->json([
            'success' => true,
            'message' => 'Đã chấm dứt hợp đồng thành công.',
            'data' => $contract
        ]);
    }

    public function destroy(string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('contracts.delete') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xóa hợp đồng lao động.'
            ], 403);
        }

        $contract = EmploymentContract::findOrFail($id);

        if ($contract->status === 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa hợp đồng đang active. Vui lòng chấm dứt hợp đồng trước.'
            ], 422);
        }

        $contract->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa hợp đồng lao động thành công.'
        ]);
    }
}
