<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GlobalSubcontractor;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class GlobalSubcontractorController extends Controller
{
    /**
     * Danh sách nhà thầu phụ
     */
    public function index(Request $request)
    {
        $query = GlobalSubcontractor::with('creator');

        // Filter active - chỉ filter khi active_only được truyền vào và là true
        $activeOnly = $request->query('active_only');
        if ($activeOnly === true || $activeOnly === 'true' || $activeOnly === 1 || $activeOnly === '1') {
            $query->active();
        }

        // Search
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('contact_person', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        // Nếu có param active_only và không có search, trả về tất cả (không paginate) để dùng cho dropdown
        $activeOnly = $request->query('active_only');
        $hasSearch = $request->query('search');
        
        if (($activeOnly === true || $activeOnly === 'true' || $activeOnly === 1 || $activeOnly === '1') && !$hasSearch) {
            $subcontractors = $query->orderBy('name')->get();
            return response()->json([
                'success' => true,
                'data' => $subcontractors
            ]);
        }

        // Có search hoặc không có active_only thì paginate
        $subcontractors = $query->orderBy('name')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $subcontractors
        ]);
    }

    /**
     * Tạo nhà thầu phụ mới
     */
    public function store(Request $request)
    {
        $user = auth()->user();

        // Check permission (owner, admin hoặc có quyền subcontractors.create)
        if (!$user->owner && $user->role !== 'admin' && !$user->hasPermission('subcontractors.create')) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tạo nhà thầu phụ.'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:global_subcontractors,code',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
            'tax_code' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:2000',
            'is_active' => 'nullable|boolean',
        ]);

        $subcontractor = GlobalSubcontractor::create([
            ...$validated,
            'created_by' => $user->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Nhà thầu phụ đã được tạo.',
            'data' => $subcontractor->load('creator')
        ], 201);
    }

    /**
     * Chi tiết nhà thầu phụ
     */
    public function show(string $id)
    {
        $subcontractor = GlobalSubcontractor::with(['creator', 'projects'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $subcontractor
        ]);
    }

    /**
     * Cập nhật nhà thầu phụ
     */
    public function update(Request $request, string $id)
    {
        $user = auth()->user();

        // Check permission (owner, admin hoặc có quyền subcontractors.update)
        if (!$user->owner && $user->role !== 'admin' && !$user->hasPermission('subcontractors.update')) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền cập nhật nhà thầu phụ.'
            ], 403);
        }

        $subcontractor = GlobalSubcontractor::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'nullable|string|max:50|unique:global_subcontractors,code,' . $id,
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
            'tax_code' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:2000',
            'is_active' => 'nullable|boolean',
        ]);

        $subcontractor->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Nhà thầu phụ đã được cập nhật.',
            'data' => $subcontractor->fresh()
        ]);
    }

    /**
     * Xóa nhà thầu phụ
     */
    public function destroy(string $id)
    {
        $user = auth()->user();

        // Check permission (owner, admin hoặc có quyền subcontractors.delete)
        if (!$user->owner && $user->role !== 'admin' && !$user->hasPermission('subcontractors.delete')) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa nhà thầu phụ.'
            ], 403);
        }

        $subcontractor = GlobalSubcontractor::findOrFail($id);

        // Kiểm tra xem có dự án nào đang sử dụng nhà thầu này không
        $projectsCount = $subcontractor->projects()->count();
        if ($projectsCount > 0) {
            return response()->json([
                'success' => false,
                'message' => "Không thể xóa nhà thầu phụ này vì có {$projectsCount} dự án đang sử dụng."
            ], 400);
        }

        $subcontractor->delete();

        return response()->json([
            'success' => true,
            'message' => 'Nhà thầu phụ đã được xóa.'
        ]);
    }
}
