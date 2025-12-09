<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Subcontractor;
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
            ->with(['approver', 'attachments'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $subcontractors
        ]);
    }

    /**
     * Tạo nhà thầu phụ
     */
    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'nullable|string|max:255',
            'total_quote' => 'required|numeric|min:0',
            'advance_payment' => 'nullable|numeric|min:0',
            'progress_start_date' => 'nullable|date',
            'progress_end_date' => 'nullable|date|after_or_equal:progress_start_date',
            'progress_status' => ['nullable', 'in:not_started,in_progress,completed,delayed'],
        ]);

        try {
            DB::beginTransaction();

            $subcontractor = Subcontractor::create([
                'project_id' => $project->id,
                ...$validated,
                'progress_status' => $validated['progress_status'] ?? 'not_started',
                'payment_status' => 'pending',
            ]);

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
            'total_quote' => 'sometimes|numeric|min:0',
            'advance_payment' => 'nullable|numeric|min:0',
            'progress_start_date' => 'nullable|date',
            'progress_end_date' => 'nullable|date|after_or_equal:progress_start_date',
            'progress_status' => ['sometimes', 'in:not_started,in_progress,completed,delayed'],
        ]);

        $subcontractor->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Nhà thầu phụ đã được cập nhật.',
            'data' => $subcontractor->fresh()
        ]);
    }
}
