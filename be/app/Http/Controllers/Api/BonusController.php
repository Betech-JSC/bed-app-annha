<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bonus;
use App\Models\Project;
use App\Services\BonusCalculationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BonusController extends Controller
{
    public function __construct(
        private BonusCalculationService $bonusService
    ) {}

    /**
     * Danh sách thưởng (HR only)
     */
    public function index(Request $request)
    {
        $query = Bonus::with(['user', 'project', 'approver']);

        // Filter by user
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by project
        if ($request->has('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by calculation method
        if ($request->has('calculation_method')) {
            $query->where('calculation_method', $request->calculation_method);
        }

        $bonuses = $query->orderByDesc('created_at')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $bonuses
        ]);
    }

    /**
     * Tạo thưởng thủ công (HR/admin only)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'project_id' => 'nullable|exists:projects,id',
            'bonus_type' => 'required|in:performance,project_completion,manual,other',
            'amount' => 'required|numeric|min:0',
            'calculation_method' => 'required|in:auto,manual',
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date',
            'description' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $bonus = Bonus::create([
                'user_id' => $validated['user_id'],
                'project_id' => $validated['project_id'] ?? null,
                'bonus_type' => $validated['bonus_type'],
                'amount' => $validated['amount'],
                'calculation_method' => $validated['calculation_method'],
                'period_start' => $validated['period_start'] ?? null,
                'period_end' => $validated['period_end'] ?? null,
                'description' => $validated['description'] ?? null,
                'status' => 'pending',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Thưởng đã được tạo.',
                'data' => $bonus->load(['user', 'project'])
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
     * Tự động tính thưởng từ dự án (HR/admin only)
     */
    public function calculateFromProject($projectId)
    {
        $project = Project::findOrFail($projectId);

        try {
            DB::beginTransaction();

            $bonuses = $this->bonusService->calculateBonusesForProject($project);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Đã tính thưởng cho " . count($bonuses) . " nhân viên.",
                'data' => $bonuses
            ]);
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
     * Cập nhật thưởng (HR/admin only)
     */
    public function update(Request $request, $id)
    {
        $bonus = Bonus::findOrFail($id);

        $validated = $request->validate([
            'amount' => 'sometimes|numeric|min:0',
            'description' => 'nullable|string',
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date',
        ]);

        try {
            $bonus->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'Thưởng đã được cập nhật.',
                'data' => $bonus->load(['user', 'project'])
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
     * Duyệt thưởng (HR/admin only)
     */
    public function approve(Request $request, $id)
    {
        $user = auth()->user();
        $bonus = Bonus::findOrFail($id);

        try {
            $bonus->approve($user);

            return response()->json([
                'success' => true,
                'message' => 'Thưởng đã được duyệt.',
                'data' => $bonus->load(['user', 'project', 'approver'])
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
     * Đánh dấu đã thanh toán (HR/admin only)
     */
    public function markAsPaid($id)
    {
        $bonus = Bonus::findOrFail($id);

        if ($bonus->status !== 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Thưởng phải được duyệt trước khi đánh dấu đã thanh toán.'
            ], 400);
        }

        try {
            $bonus->markAsPaid();

            return response()->json([
                'success' => true,
                'message' => 'Đã đánh dấu thanh toán.',
                'data' => $bonus->load(['user', 'project'])
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
     * Xóa thưởng (HR/admin only)
     */
    public function destroy($id)
    {
        $bonus = Bonus::findOrFail($id);

        // Chỉ cho phép xóa nếu chưa thanh toán
        if ($bonus->status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa thưởng đã thanh toán.'
            ], 400);
        }

        try {
            $bonus->delete();

            return response()->json([
                'success' => true,
                'message' => 'Thưởng đã được xóa.'
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
     * Thưởng của user hiện tại
     */
    public function myBonuses(Request $request)
    {
        $user = auth()->user();

        $query = Bonus::forUser($user->id)
            ->with(['project', 'approver']);

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $bonuses = $query->orderByDesc('created_at')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $bonuses
        ]);
    }
}
