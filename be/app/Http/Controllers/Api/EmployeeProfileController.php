<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class EmployeeProfileController extends Controller
{
    /**
     * Danh sách hồ sơ nhân sự với filter và pagination
     */
    public function index(Request $request)
    {
        $query = EmployeeProfile::with(['user', 'subcontractor']);

        // Filter theo employee_type
        if ($request->has('employee_type')) {
            $query->where('employee_type', $request->employee_type);
        }

        // Search theo tên, mã nhân sự, CCCD, SĐT
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                    ->orWhere('employee_code', 'like', "%{$search}%")
                    ->orWhere('cccd', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        // Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->get('per_page', 15);
        $profiles = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $profiles->items(),
            'pagination' => [
                'current_page' => $profiles->currentPage(),
                'last_page' => $profiles->lastPage(),
                'per_page' => $profiles->perPage(),
                'total' => $profiles->total(),
            ],
        ]);
    }

    /**
     * Chi tiết hồ sơ nhân sự
     */
    public function show($id)
    {
        $profile = EmployeeProfile::with(['user', 'subcontractor'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $profile,
        ]);
    }

    /**
     * Lấy hồ sơ nhân sự theo user_id
     */
    public function getByUserId($userId)
    {
        $profile = EmployeeProfile::with(['user', 'subcontractor'])
            ->where('user_id', $userId)
            ->first();

        if (!$profile) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy hồ sơ nhân sự',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $profile,
        ]);
    }

    /**
     * Tạo hồ sơ nhân sự mới
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id|unique:employee_profiles,user_id',
            'employee_code' => 'nullable|string|max:50|unique:employee_profiles,employee_code',
            'full_name' => 'nullable|string|max:255',
            'cccd' => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|date',
            'place_of_birth' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:20',
            'education_level' => 'nullable|string|max:255',
            'skills' => 'nullable|string',
            'profile_photo' => 'nullable|string',
            'legal_documents' => 'nullable|array',
            'legal_documents.*' => 'integer|exists:attachments,id',
            'employee_type' => [
                'required',
                Rule::in(['official', 'temporary', 'contracted', 'engineer', 'worker']),
            ],
            'team_name' => 'nullable|string|max:255',
            'subcontractor_id' => 'nullable|exists:subcontractors,id',
        ]);

        try {
            DB::beginTransaction();

            // Tự động tạo mã nhân sự nếu chưa có
            if (empty($validated['employee_code'])) {
                $validated['employee_code'] = EmployeeProfile::generateEmployeeCode();
            }

            $profile = EmployeeProfile::create($validated);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo hồ sơ nhân sự thành công',
                'data' => $profile->load(['user', 'subcontractor']),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi tạo hồ sơ nhân sự',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cập nhật hồ sơ nhân sự
     */
    public function update(Request $request, $id)
    {
        $profile = EmployeeProfile::findOrFail($id);

        $validated = $request->validate([
            'employee_code' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('employee_profiles', 'employee_code')->ignore($profile->id),
            ],
            'full_name' => 'nullable|string|max:255',
            'cccd' => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|date',
            'place_of_birth' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:20',
            'education_level' => 'nullable|string|max:255',
            'skills' => 'nullable|string',
            'profile_photo' => 'nullable|string',
            'legal_documents' => 'nullable|array',
            'legal_documents.*' => 'integer|exists:attachments,id',
            'employee_type' => [
                'sometimes',
                Rule::in(['official', 'temporary', 'contracted', 'engineer', 'worker']),
            ],
            'team_name' => 'nullable|string|max:255',
            'subcontractor_id' => 'nullable|exists:subcontractors,id',
        ]);

        try {
            DB::beginTransaction();

            $profile->update($validated);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật hồ sơ nhân sự thành công',
                'data' => $profile->load(['user', 'subcontractor']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi cập nhật hồ sơ nhân sự',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Xóa hồ sơ nhân sự (soft delete)
     */
    public function destroy($id)
    {
        $profile = EmployeeProfile::findOrFail($id);
        $profile->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa hồ sơ nhân sự thành công',
        ]);
    }

    /**
     * Thống kê hồ sơ nhân sự
     */
    public function statistics()
    {
        $stats = [
            'total' => EmployeeProfile::count(),
            'by_type' => EmployeeProfile::select('employee_type', DB::raw('count(*) as count'))
                ->groupBy('employee_type')
                ->get()
                ->mapWithKeys(function ($item) {
                    return [$item->employee_type => $item->count];
                }),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}
