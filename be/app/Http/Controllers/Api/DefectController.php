<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Defect;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DefectController extends Controller
{
    /**
     * Danh sách lỗi
     */
    public function index(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);

        $query = $project->defects()
            ->with([
                'reporter',
                'fixer',
                'verifier',
                'acceptanceStage',
                'attachments'
            ]);

        // Filter by status
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        // Filter by severity
        if ($severity = $request->query('severity')) {
            $query->where('severity', $severity);
        }

        $defects = $query->orderByDesc('created_at')->get();

        return response()->json([
            'success' => true,
            'data' => $defects
        ]);
    }

    /**
     * Tạo lỗi mới
     */
    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        $validated = $request->validate([
            'acceptance_stage_id' => 'nullable|exists:acceptance_stages,id',
            'description' => 'required|string|max:2000',
            'severity' => ['required', 'in:low,medium,high,critical'],
        ]);

        try {
            DB::beginTransaction();

            $defect = Defect::create([
                'project_id' => $project->id,
                'reported_by' => $user->id,
                ...$validated,
                'status' => 'open',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Lỗi đã được ghi nhận.',
                'data' => $defect->load(['reporter', 'acceptanceStage'])
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
     * Cập nhật lỗi
     */
    public function update(Request $request, string $projectId, string $id)
    {
        $defect = Defect::where('project_id', $projectId)->findOrFail($id);
        $user = auth()->user();

        $validated = $request->validate([
            'description' => 'sometimes|string|max:2000',
            'severity' => ['sometimes', 'in:low,medium,high,critical'],
            'status' => ['sometimes', 'in:open,in_progress,fixed,verified'],
        ]);

        // Handle status transitions
        if (isset($validated['status'])) {
            switch ($validated['status']) {
                case 'in_progress':
                    $defect->markAsInProgress($user);
                    break;
                case 'fixed':
                    $defect->markAsFixed($user);
                    break;
                case 'verified':
                    $defect->markAsVerified($user);
                    break;
                default:
                    $defect->update(['status' => $validated['status']]);
            }
            unset($validated['status']);
        }

        if (!empty($validated)) {
            $defect->update($validated);
        }

        return response()->json([
            'success' => true,
            'message' => 'Lỗi đã được cập nhật.',
            'data' => $defect->fresh()
        ]);
    }
}
