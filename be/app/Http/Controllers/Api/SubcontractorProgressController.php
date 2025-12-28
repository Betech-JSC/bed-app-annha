<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubcontractorProgress;
use App\Models\Subcontractor;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SubcontractorProgressController extends Controller
{
    /**
     * Danh sách tiến độ thi công
     */
    public function index(Request $request)
    {
        $user = auth()->user();

        if (!$user->hasPermission('subcontractors.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem tiến độ thi công.'
            ], 403);
        }

        $query = SubcontractorProgress::with(['subcontractor', 'project', 'contract', 'reporter', 'verifier']);

        if ($projectId = $request->query('project_id')) {
            $query->where('project_id', $projectId);
        }

        if ($subcontractorId = $request->query('subcontractor_id')) {
            $query->where('subcontractor_id', $subcontractorId);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($fromDate = $request->query('from_date')) {
            $query->where('progress_date', '>=', $fromDate);
        }

        if ($toDate = $request->query('to_date')) {
            $query->where('progress_date', '<=', $toDate);
        }

        $progress = $query->orderByDesc('progress_date')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $progress
        ]);
    }

    /**
     * Tạo báo cáo tiến độ mới
     */
    public function store(Request $request)
    {
        $user = auth()->user();

        if (!$user->hasPermission('subcontractors.create') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo báo cáo tiến độ.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'subcontractor_id' => 'required|exists:subcontractors,id',
            'project_id' => 'required|exists:projects,id',
            'subcontractor_contract_id' => 'nullable|exists:subcontractor_contracts,id',
            'progress_date' => 'required|date',
            'planned_progress' => 'required|numeric|min:0|max:100',
            'actual_progress' => 'required|numeric|min:0|max:100',
            'completed_volume' => 'required|numeric|min:0',
            'volume_unit' => 'nullable|string|max:20',
            'work_description' => 'nullable|string',
            'next_week_plan' => 'nullable|string',
            'issues_and_risks' => 'nullable|string',
            'status' => 'in:on_schedule,delayed,ahead_of_schedule,at_risk',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->all();
        $data['reported_by'] = $user->id;

        // Tự động xác định status nếu không có
        if (!isset($data['status'])) {
            $progressDiff = $request->actual_progress - $request->planned_progress;
            if ($progressDiff >= 5) {
                $data['status'] = 'ahead_of_schedule';
            } elseif ($progressDiff <= -5) {
                $data['status'] = 'delayed';
            } else {
                $data['status'] = 'on_schedule';
            }
        }

        $progress = SubcontractorProgress::create($data);

        $progress->load(['subcontractor', 'project', 'contract', 'reporter']);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo báo cáo tiến độ thành công.',
            'data' => $progress
        ], 201);
    }

    /**
     * Chi tiết tiến độ
     */
    public function show(string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('subcontractors.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem tiến độ.'
            ], 403);
        }

        $progress = SubcontractorProgress::with([
            'subcontractor',
            'project',
            'contract',
            'reporter',
            'verifier',
            'attachments'
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $progress
        ]);
    }

    /**
     * Cập nhật tiến độ
     */
    public function update(Request $request, string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('subcontractors.update') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền cập nhật tiến độ.'
            ], 403);
        }

        $progress = SubcontractorProgress::findOrFail($id);

        // Chỉ cho phép sửa nếu chưa được verify
        if ($progress->verified_at) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể sửa báo cáo tiến độ đã được xác nhận.'
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'progress_date' => 'sometimes|required|date',
            'planned_progress' => 'sometimes|required|numeric|min:0|max:100',
            'actual_progress' => 'sometimes|required|numeric|min:0|max:100',
            'completed_volume' => 'sometimes|required|numeric|min:0',
            'volume_unit' => 'nullable|string|max:20',
            'work_description' => 'nullable|string',
            'next_week_plan' => 'nullable|string',
            'issues_and_risks' => 'nullable|string',
            'status' => 'in:on_schedule,delayed,ahead_of_schedule,at_risk',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->all();

        // Tự động xác định status nếu không có
        if (!isset($data['status']) && (isset($data['planned_progress']) || isset($data['actual_progress']))) {
            $planned = $data['planned_progress'] ?? $progress->planned_progress;
            $actual = $data['actual_progress'] ?? $progress->actual_progress;
            $progressDiff = $actual - $planned;
            
            if ($progressDiff >= 5) {
                $data['status'] = 'ahead_of_schedule';
            } elseif ($progressDiff <= -5) {
                $data['status'] = 'delayed';
            } else {
                $data['status'] = 'on_schedule';
            }
        }

        $progress->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật tiến độ thành công.',
            'data' => $progress->fresh(['subcontractor', 'project', 'contract'])
        ]);
    }

    /**
     * Xóa tiến độ
     */
    public function destroy(string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('subcontractors.delete') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xóa tiến độ.'
            ], 403);
        }

        $progress = SubcontractorProgress::findOrFail($id);

        // Không cho phép xóa nếu đã được verify
        if ($progress->verified_at) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa báo cáo tiến độ đã được xác nhận.'
            ], 422);
        }

        $progress->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa báo cáo tiến độ thành công.'
        ]);
    }

    /**
     * Xác nhận tiến độ
     */
    public function verify(Request $request, string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('subcontractors.approve') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xác nhận tiến độ.'
            ], 403);
        }

        $progress = SubcontractorProgress::findOrFail($id);

        if ($progress->verified_at) {
            return response()->json([
                'success' => false,
                'message' => 'Báo cáo tiến độ đã được xác nhận trước đó.'
            ], 422);
        }

        $progress->verify($user);

        return response()->json([
            'success' => true,
            'message' => 'Đã xác nhận tiến độ thành công.',
            'data' => $progress->fresh(['verifier'])
        ]);
    }
}
