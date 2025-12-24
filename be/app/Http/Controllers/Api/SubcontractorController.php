<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Subcontractor;
use App\Models\GlobalSubcontractor;
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
        
        // Lấy từ project_subcontractors (pivot table) nếu có
        $projectSubcontractors = DB::table('project_subcontractors')
            ->where('project_id', $project->id)
            ->get();
        
        $subcontractors = [];
        foreach ($projectSubcontractors as $ps) {
            $globalSubcontractor = GlobalSubcontractor::with(['creator'])
                ->find($ps->global_subcontractor_id);
            
            if ($globalSubcontractor) {
                // Lấy payments từ SubcontractorPayment
                $payments = \App\Models\SubcontractorPayment::where('project_id', $project->id)
                    ->where('subcontractor_id', $ps->id) // Note: cần cập nhật migration để có global_subcontractor_id
                    ->orderByDesc('created_at')
                    ->get();
                
                $subcontractors[] = [
                    'id' => $ps->id,
                    'global_subcontractor_id' => $globalSubcontractor->id,
                    'name' => $globalSubcontractor->name,
                    'code' => $globalSubcontractor->code,
                    'contact_person' => $globalSubcontractor->contact_person,
                    'phone' => $globalSubcontractor->phone,
                    'email' => $globalSubcontractor->email,
                    'category' => $ps->category,
                    'total_quote' => $ps->total_quote,
                    'advance_payment' => $ps->advance_payment,
                    'total_paid' => $ps->total_paid,
                    'progress_start_date' => $ps->progress_start_date,
                    'progress_end_date' => $ps->progress_end_date,
                    'progress_status' => $ps->progress_status,
                    'payment_status' => $ps->payment_status,
                    'approved_by' => $ps->approved_by,
                    'approved_at' => $ps->approved_at,
                    'payments' => $payments,
                ];
            }
        }
        
        // Fallback: Lấy từ bảng subcontractors cũ (backward compatible)
        $oldSubcontractors = $project->subcontractors()
            ->with(['approver', 'attachments', 'items', 'payments' => function ($q) {
                $q->orderByDesc('created_at');
            }])
            ->orderByDesc('created_at')
            ->get();
        
        // Merge cả hai
        $allSubcontractors = array_merge($subcontractors, $oldSubcontractors->toArray());

        return response()->json([
            'success' => true,
            'data' => $allSubcontractors
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
        $subcontractor->delete();

        return response()->json([
            'success' => true,
            'message' => 'Nhà thầu phụ đã được xóa.'
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
     * Tạo nhà thầu phụ (chọn từ Global Subcontractors)
     */
    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);

        $validated = $request->validate([
            'global_subcontractor_id' => 'required|exists:global_subcontractors,id',
            'category' => 'nullable|string|max:255',
            'total_quote' => 'required|numeric|min:0',
            'advance_payment' => 'nullable|numeric|min:0',
            'progress_start_date' => 'nullable|date',
            'progress_end_date' => 'nullable|date|after_or_equal:progress_start_date',
            'progress_status' => ['nullable', 'in:not_started,in_progress,completed,delayed'],
        ]);

        try {
            DB::beginTransaction();

            // Kiểm tra xem đã có trong dự án này chưa
            $exists = DB::table('project_subcontractors')
                ->where('project_id', $project->id)
                ->where('global_subcontractor_id', $validated['global_subcontractor_id'])
                ->exists();

            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nhà thầu phụ này đã được thêm vào dự án.'
                ], 400);
            }

            // Tạo record trong project_subcontractors
            $projectSubcontractorId = DB::table('project_subcontractors')->insertGetId([
                'project_id' => $project->id,
                'global_subcontractor_id' => $validated['global_subcontractor_id'],
                'category' => $validated['category'] ?? null,
                'total_quote' => $validated['total_quote'],
                'advance_payment' => $validated['advance_payment'] ?? 0,
                'total_paid' => 0,
                'progress_start_date' => $validated['progress_start_date'] ?? null,
                'progress_end_date' => $validated['progress_end_date'] ?? null,
                'progress_status' => $validated['progress_status'] ?? 'not_started',
                'payment_status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $globalSubcontractor = GlobalSubcontractor::find($validated['global_subcontractor_id']);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Nhà thầu phụ đã được thêm vào dự án.',
                'data' => [
                    'id' => $projectSubcontractorId,
                    'global_subcontractor' => $globalSubcontractor,
                    'category' => $validated['category'],
                    'total_quote' => $validated['total_quote'],
                    'advance_payment' => $validated['advance_payment'] ?? 0,
                    'total_paid' => 0,
                    'progress_status' => $validated['progress_status'] ?? 'not_started',
                    'payment_status' => 'pending',
                ]
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
