<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeSalaryConfig;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class EmployeeSalaryConfigController extends Controller
{
    /**
     * Danh sách config lương (HR only)
     */
    public function index(Request $request)
    {
        $query = EmployeeSalaryConfig::with(['user']);

        // Filter by user
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter current only
        if ($request->has('current') && $request->current) {
            $query->current();
        }

        $configs = $query->orderByDesc('effective_from')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $configs
        ]);
    }

    /**
     * Tạo config lương cho user (HR/admin only)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'salary_type' => 'required|in:hourly,daily,monthly,project_based',
            'hourly_rate' => 'nullable|numeric|min:0|required_if:salary_type,hourly',
            'daily_rate' => 'nullable|numeric|min:0|required_if:salary_type,daily',
            'monthly_salary' => 'nullable|numeric|min:0|required_if:salary_type,monthly',
            'project_rate' => 'nullable|numeric|min:0|required_if:salary_type,project_based',
            'effective_from' => 'required|date',
            'effective_to' => 'nullable|date|after:effective_from',
        ]);

        try {
            DB::beginTransaction();

            // Check if config already exists for this user and date
            $exists = EmployeeSalaryConfig::where('user_id', $validated['user_id'])
                ->where('effective_from', $validated['effective_from'])
                ->exists();

            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Đã có cấu hình lương cho ngày này.'
                ], 400);
            }

            $config = EmployeeSalaryConfig::create($validated);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Cấu hình lương đã được tạo.',
                'data' => $config->load(['user'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cập nhật config (HR/admin only)
     */
    public function update(Request $request, $id)
    {
        $config = EmployeeSalaryConfig::findOrFail($id);

        $validated = $request->validate([
            'salary_type' => 'sometimes|in:hourly,daily,monthly,project_based',
            'hourly_rate' => 'nullable|numeric|min:0',
            'daily_rate' => 'nullable|numeric|min:0',
            'monthly_salary' => 'nullable|numeric|min:0',
            'project_rate' => 'nullable|numeric|min:0',
            'effective_from' => 'sometimes|date',
            'effective_to' => 'nullable|date|after:effective_from',
        ]);

        try {
            $config->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'Cấu hình lương đã được cập nhật.',
                'data' => $config->load(['user'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Lấy config hiện tại của user
     */
    public function getCurrentConfig($userId)
    {
        $config = EmployeeSalaryConfig::forUser($userId)
            ->current()
            ->with(['user'])
            ->first();

        if (!$config) {
            return response()->json([
                'success' => false,
                'message' => 'User chưa có cấu hình lương.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $config
        ]);
    }
}
