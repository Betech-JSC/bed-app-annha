<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Subcontractor;
use App\Models\GlobalSubcontractor;
use App\Models\Cost;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubcontractorController extends Controller
{
    /**
     * Danh sách nhà thầu phụ
     */
    public function index(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $subcontractors = $project->subcontractors()
            ->with(['approver', 'attachments', 'items', 'payments' => function ($q) {
                $q->orderByDesc('created_at');
            }])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $subcontractors
        ]);
    }

    /**
     * Chi tiết nhà thầu phụ
     */
    public function show(string $projectId, string $id)
    {
        $subcontractor = Subcontractor::where('project_id', $projectId)
            ->with(['approver', 'attachments', 'items', 'payments', 'project'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $subcontractor
        ]);
    }

    /**
     * Xóa nhà thầu phụ
     */
    public function destroy(string $projectId, string $id)
    {
        $subcontractor = Subcontractor::where('project_id', $projectId)->findOrFail($id);
        
        // Xử lý chi phí liên quan: Set subcontractor_id = null để giữ lại dữ liệu chi phí
        \App\Models\Cost::where('subcontractor_id', $subcontractor->id)
            ->update(['subcontractor_id' => null]);
        
        $subcontractor->delete();

        return response()->json([
            'success' => true,
            'message' => 'Nhà thầu phụ đã được xóa. Các chi phí liên quan đã được tách khỏi nhà thầu phụ này.'
        ]);
    }

    /**
     * Duyệt nhà thầu phụ
     */
    public function approve(Request $request, string $projectId, string $id)
    {
        $subcontractor = Subcontractor::where('project_id', $projectId)->findOrFail($id);
        $user = $request->user();

        $subcontractor->approve($user);

        return response()->json([
            'success' => true,
            'message' => 'Nhà thầu phụ đã được duyệt.',
            'data' => $subcontractor->fresh(['approver'])
        ]);
    }

    /**
     * Tạo nhà thầu phụ
     */
    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);

        $validated = $request->validate([
            'global_subcontractor_id' => 'nullable|exists:global_subcontractors,id',
            'name' => 'required_without:global_subcontractor_id|string|max:255',
            'category' => 'nullable|string|max:255',
            'bank_name' => 'nullable|string|max:255',
            'bank_account_number' => 'nullable|string|max:255',
            'bank_account_name' => 'nullable|string|max:255',
            'total_quote' => 'required|numeric|min:0',
            'progress_start_date' => 'nullable|date',
            'progress_end_date' => 'nullable|date|after_or_equal:progress_start_date',
            'progress_status' => ['nullable', 'in:not_started,in_progress,completed,delayed'],
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'exists:attachments,id',
            'create_cost' => 'nullable|boolean',
            'cost_group_id' => 'nullable|exists:cost_groups,id',
            'cost_date' => 'nullable|date',
            'payment_schedule' => 'nullable|array',
            'payment_schedule.*.milestone' => 'required|string',
            'payment_schedule.*.percentage' => 'required|numeric|min:0|max:100',
            'payment_schedule.*.amount' => 'nullable|numeric',
            'payment_schedule.*.due_date' => 'nullable|date',
        ]);

        try {
            DB::beginTransaction();

            // Nếu có global_subcontractor_id, lấy thông tin từ global subcontractor
            if (isset($validated['global_subcontractor_id'])) {
                $globalSubcontractor = GlobalSubcontractor::findOrFail($validated['global_subcontractor_id']);
                $validated['name'] = $globalSubcontractor->name;
                $validated['category'] = $globalSubcontractor->category ?? $validated['category'] ?? null;
                $validated['bank_name'] = $globalSubcontractor->bank_name ?? $validated['bank_name'] ?? null;
                $validated['bank_account_number'] = $globalSubcontractor->bank_account_number ?? $validated['bank_account_number'] ?? null;
                $validated['bank_account_name'] = $globalSubcontractor->bank_account_name ?? $validated['bank_account_name'] ?? null;
            }

            $subcontractor = Subcontractor::create([
                'project_id' => $project->id,
                'global_subcontractor_id' => $validated['global_subcontractor_id'] ?? null,
                'name' => $validated['name'],
                'category' => $validated['category'] ?? null,
                'bank_name' => $validated['bank_name'] ?? null,
                'bank_account_number' => $validated['bank_account_number'] ?? null,
                'bank_account_name' => $validated['bank_account_name'] ?? null,
                'total_quote' => $validated['total_quote'],
                'advance_payment' => 0, // Không còn sử dụng, tạm ứng sẽ tạo từ Chi phí dự án
                'progress_start_date' => $validated['progress_start_date'] ?? null,
                'progress_end_date' => $validated['progress_end_date'] ?? null,
                'progress_status' => $validated['progress_status'] ?? 'not_started',
                'payment_status' => 'pending',
                'payment_schedule' => $validated['payment_schedule'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            // Attach files if provided
            if (!empty($validated['attachment_ids'])) {
                \App\Models\Attachment::whereIn('id', $validated['attachment_ids'])
                    ->update([
                        'attachable_type' => Subcontractor::class,
                        'attachable_id' => $subcontractor->id,
                    ]);
            }

            // Tự động tạo Cost record đã bị gỡ bỏ để tránh tính trùng chi phí (Double Counting)
            // Hợp đồng thầu phụ dự kiến chỉ được theo dõi qua bảng subcontractors
            // Chi phí thực tế chỉ phát sinh khi có phiếu thanh toán (SubcontractorPayment)

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Nhà thầu phụ đã được thêm.',
                'data' => $subcontractor
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
     * Cập nhật nhà thầu phụ
     */
    public function update(Request $request, string $projectId, string $id)
    {
        $subcontractor = Subcontractor::where('project_id', $projectId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'category' => 'nullable|string|max:255',
            'bank_name' => 'nullable|string|max:255',
            'bank_account_number' => 'nullable|string|max:255',
            'bank_account_name' => 'nullable|string|max:255',
            'total_quote' => 'sometimes|numeric|min:0',
            'progress_start_date' => 'nullable|date',
            'progress_end_date' => 'nullable|date|after_or_equal:progress_start_date',
            'progress_status' => ['sometimes', 'in:not_started,in_progress,completed,delayed'],
            'payment_schedule' => 'nullable|array',
            'payment_schedule.*.milestone' => 'required|string',
            'payment_schedule.*.percentage' => 'required|numeric|min:0|max:100',
            'payment_schedule.*.amount' => 'nullable|numeric',
            'payment_schedule.*.due_date' => 'nullable|date',
        ]);

        $subcontractor->update([
            ...$validated,
            'updated_by' => $request->user()->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Nhà thầu phụ đã được cập nhật.',
            'data' => $subcontractor->fresh(['items', 'payments'])
        ]);
    }
}
