<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeInsurance;
use App\Models\EmployeeBenefit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class InsuranceController extends Controller
{
    // ========== INSURANCE METHODS ==========

    public function getInsurance(Request $request)
    {
        $user = auth()->user();
        $userId = $request->query('user_id') ?? $user->id;

        // Chỉ admin/owner mới xem insurance của người khác
        if ($userId !== $user->id && !$user->owner && $user->role !== 'admin' && !$user->hasPermission('insurance.view')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem bảo hiểm của người khác.'
            ], 403);
        }

        $insurance = EmployeeInsurance::where('user_id', $userId)
            ->where('status', 'active')
            ->first();

        return response()->json([
            'success' => true,
            'data' => $insurance
        ]);
    }

    public function updateInsurance(Request $request)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('insurance.update') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền cập nhật bảo hiểm.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'social_insurance_number' => 'nullable|string|max:50',
            'health_insurance_number' => 'nullable|string|max:50',
            'unemployment_insurance_number' => 'nullable|string|max:50',
            'insurance_start_date' => 'nullable|date',
            'insurance_end_date' => 'nullable|date|after:insurance_start_date',
            'social_insurance_rate' => 'nullable|numeric|min:0|max:100',
            'health_insurance_rate' => 'nullable|numeric|min:0|max:100',
            'unemployment_insurance_rate' => 'nullable|numeric|min:0|max:100',
            'base_salary_for_insurance' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $insurance = EmployeeInsurance::updateOrCreate(
            ['user_id' => $request->user_id],
            [
                'social_insurance_number' => $request->social_insurance_number,
                'health_insurance_number' => $request->health_insurance_number,
                'unemployment_insurance_number' => $request->unemployment_insurance_number,
                'insurance_start_date' => $request->insurance_start_date,
                'insurance_end_date' => $request->insurance_end_date,
                'social_insurance_rate' => $request->social_insurance_rate ?? 8.0,
                'health_insurance_rate' => $request->health_insurance_rate ?? 1.5,
                'unemployment_insurance_rate' => $request->unemployment_insurance_rate ?? 1.0,
                'base_salary_for_insurance' => $request->base_salary_for_insurance,
                'notes' => $request->notes,
                'status' => 'active',
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật thông tin bảo hiểm thành công.',
            'data' => $insurance
        ]);
    }

    // ========== BENEFITS METHODS ==========

    public function getBenefits(Request $request)
    {
        $user = auth()->user();
        $userId = $request->query('user_id') ?? $user->id;

        // Chỉ admin/owner mới xem benefits của người khác
        if ($userId !== $user->id && !$user->owner && $user->role !== 'admin' && !$user->hasPermission('insurance.view')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem phúc lợi của người khác.'
            ], 403);
        }

        $query = EmployeeBenefit::where('user_id', $userId);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $benefits = $query->orderBy('start_date', 'desc')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $benefits
        ]);
    }

    public function createBenefit(Request $request)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('insurance.update') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo phúc lợi.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'benefit_type' => 'required|string|max:100',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'amount' => 'required|numeric|min:0',
            'calculation_type' => 'required|in:fixed,percentage',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after:start_date',
            'notes' => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $benefit = EmployeeBenefit::create([
            'user_id' => $request->user_id,
            'benefit_type' => $request->benefit_type,
            'name' => $request->name,
            'description' => $request->description,
            'amount' => $request->amount,
            'calculation_type' => $request->calculation_type,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'status' => 'active',
            'notes' => $request->notes,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo phúc lợi thành công.',
            'data' => $benefit
        ], 201);
    }

    public function updateBenefit(Request $request, string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('insurance.update') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền cập nhật phúc lợi.'
            ], 403);
        }

        $benefit = EmployeeBenefit::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'benefit_type' => 'sometimes|required|string|max:100',
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'amount' => 'sometimes|required|numeric|min:0',
            'calculation_type' => 'sometimes|required|in:fixed,percentage',
            'start_date' => 'sometimes|required|date',
            'end_date' => 'nullable|date|after:start_date',
            'status' => 'in:active,inactive,expired',
            'notes' => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $benefit->update($request->only([
            'benefit_type', 'name', 'description', 'amount', 'calculation_type',
            'start_date', 'end_date', 'status', 'notes'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật phúc lợi thành công.',
            'data' => $benefit
        ]);
    }

    public function deleteBenefit(string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('insurance.delete') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xóa phúc lợi.'
            ], 403);
        }

        $benefit = EmployeeBenefit::findOrFail($id);
        $benefit->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa phúc lợi thành công.'
        ]);
    }
}
