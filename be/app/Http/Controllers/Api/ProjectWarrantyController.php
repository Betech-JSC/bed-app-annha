<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectWarranty;
use App\Models\ProjectMaintenance;
use App\Constants\Permissions;
use App\Services\AuthorizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ProjectWarrantyController extends Controller
{
    protected $authService;

    public function __construct(AuthorizationService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * Danh sách phiếu bảo hành
     */
    public function index(Request $request, $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        $this->authService->require($user, Permissions::WARRANTY_VIEW, $project);

        $warranties = ProjectWarranty::where('project_id', $project->id)
            ->with(['attachments', 'creator', 'approver'])
            ->orderByDesc('created_at')
            ->get();

        $maintenances = ProjectMaintenance::where('project_id', $project->id)
            ->with(['attachments', 'creator', 'approver'])
            ->orderByDesc('maintenance_date')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'warranties' => $warranties,
                'maintenances' => $maintenances,
            ]
        ]);
    }

    /**
     * Tạo phiếu bảo hành
     */
    public function storeWarranty(Request $request, $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        $this->authService->require($user, Permissions::WARRANTY_CREATE, $project);

        $validated = $request->validate([
            'handover_date' => 'required|date',
            'warranty_content' => 'required|string',
            'warranty_start_date' => 'required|date',
            'warranty_end_date' => 'required|date|after_or_equal:warranty_start_date',
            'notes' => 'nullable|string',
            'status' => 'nullable|string|in:draft,pending_customer',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'exists:attachments,id',
        ]);

        DB::beginTransaction();
        try {
            $warranty = ProjectWarranty::create([
                'project_id' => $project->id,
                'status' => $validated['status'] ?? ProjectWarranty::STATUS_DRAFT,
                'created_by' => $user->id,
                'handover_date' => $validated['handover_date'],
                'warranty_content' => $validated['warranty_content'],
                'warranty_start_date' => $validated['warranty_start_date'],
                'warranty_end_date' => $validated['warranty_end_date'],
                'notes' => $validated['notes'] ?? null,
            ]);

            if (!empty($validated['attachment_ids'])) {
                \App\Models\Attachment::whereIn('id', $validated['attachment_ids'])
                    ->update([
                        'attachable_id' => $warranty->id,
                        'attachable_type' => ProjectWarranty::class
                    ]);
            }

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Đã tạo phiếu bảo hành thành công.',
                'data' => $warranty->load('attachments')
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cập nhật phiếu bảo hành
     */
    public function updateWarranty(Request $request, $projectId, $uuid)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        $this->authService->require($user, Permissions::WARRANTY_UPDATE, $project);

        $warranty = ProjectWarranty::where('project_id', $project->id)->where('uuid', $uuid)->firstOrFail();

        $validated = $request->validate([
            'handover_date' => 'required|date',
            'warranty_content' => 'required|string',
            'warranty_start_date' => 'required|date',
            'warranty_end_date' => 'required|date|after_or_equal:warranty_start_date',
            'notes' => 'nullable|string',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'exists:attachments,id',
        ]);

        $warranty->update(\Illuminate\Support\Arr::except($validated, ['attachment_ids']));

        if (isset($validated['attachment_ids'])) {
            // Reset existing
            $warranty->attachments()->update(['attachable_id' => null, 'attachable_type' => null]);
            
            // Set new
            if (!empty($validated['attachment_ids'])) {
                \App\Models\Attachment::whereIn('id', $validated['attachment_ids'])
                    ->update([
                        'attachable_id' => $warranty->id,
                        'attachable_type' => ProjectWarranty::class
                    ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật phiếu bảo hành thành công.',
            'data' => $warranty
        ]);
    }

    /**
     * Gửi khách hàng duyệt
     */
    public function submitWarranty(Request $request, $projectId, $uuid)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        $this->authService->require($user, Permissions::WARRANTY_UPDATE, $project);

        $warranty = ProjectWarranty::where('project_id', $project->id)->where('uuid', $uuid)->firstOrFail();
        
        if ($warranty->status !== ProjectWarranty::STATUS_DRAFT) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể gửi duyệt phiếu ở trạng thái nháp.'
            ], 400);
        }

        $warranty->update([
            'status' => ProjectWarranty::STATUS_PENDING_CUSTOMER,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi phiếu bảo hành cho khách hàng duyệt.',
            'data' => $warranty
        ]);
    }

    /**
     * Duyệt phiếu bảo hành
     */
    public function approveWarranty(Request $request, $projectId, $uuid)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        $this->authService->require($user, Permissions::WARRANTY_APPROVE, $project);

        $warranty = ProjectWarranty::where('project_id', $project->id)->where('uuid', $uuid)->firstOrFail();
        
        $warranty->update([
            'status' => ProjectWarranty::STATUS_APPROVED,
            'approved_by' => $user->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã duyệt phiếu bảo hành thành công.',
            'data' => $warranty
        ]);
    }

    /**
     * Từ chối phiếu bảo hành
     */
    public function rejectWarranty(Request $request, $projectId, $uuid)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        $this->authService->require($user, Permissions::WARRANTY_APPROVE, $project);

        $warranty = ProjectWarranty::where('project_id', $project->id)->where('uuid', $uuid)->firstOrFail();
        
        $warranty->update([
            'status' => ProjectWarranty::STATUS_REJECTED,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã từ chối phiếu bảo hành.',
            'data' => $warranty
        ]);
    }

    /**
     * Tạo phiếu bảo trì
     */
    public function storeMaintenance(Request $request, $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        $this->authService->require($user, Permissions::WARRANTY_CREATE, $project);

        $validated = $request->validate([
            'maintenance_date' => 'required|date',
            'notes' => 'nullable|string',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'exists:attachments,id',
        ]);

        DB::beginTransaction();
        try {
            $nextDate = Carbon::parse($validated['maintenance_date'])->addMonths(6);

            $maintenance = ProjectMaintenance::create([
                'project_id' => $project->id,
                'maintenance_date' => $validated['maintenance_date'],
                'next_maintenance_date' => $nextDate,
                'status' => $request->status ?? ProjectMaintenance::STATUS_DRAFT,
                'notes' => $validated['notes'] ?? null,
                'created_by' => $user->id,
            ]);

            if (!empty($validated['attachment_ids'])) {
                \App\Models\Attachment::whereIn('id', $validated['attachment_ids'])
                    ->update([
                        'attachable_id' => $maintenance->id,
                        'attachable_type' => ProjectMaintenance::class
                    ]);
            }

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Đã tạo phiếu bảo trì thành công.',
                'data' => $maintenance->load('attachments')
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Gửi khách hàng duyệt phiếu bảo trì
     */
    public function submitMaintenance(Request $request, $projectId, $uuid)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        $this->authService->require($user, Permissions::WARRANTY_UPDATE, $project);

        $maintenance = ProjectMaintenance::where('project_id', $project->id)->where('uuid', $uuid)->firstOrFail();
        
        if ($maintenance->status !== ProjectMaintenance::STATUS_DRAFT) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể gửi duyệt phiếu ở trạng thái nháp.'
            ], 400);
        }

        $maintenance->update([
            'status' => ProjectMaintenance::STATUS_PENDING_CUSTOMER,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi phiếu bảo trì cho khách hàng duyệt.',
            'data' => $maintenance
        ]);
    }

    /**
     * Duyệt phiếu bảo trì
     */
    public function approveMaintenance(Request $request, $projectId, $uuid)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        $this->authService->require($user, Permissions::WARRANTY_APPROVE, $project);

        $maintenance = ProjectMaintenance::where('project_id', $project->id)->where('uuid', $uuid)->firstOrFail();
        
        $maintenance->update([
            'status' => ProjectMaintenance::STATUS_APPROVED,
            'approved_by' => $user->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã duyệt phiếu bảo trì thành công.',
            'data' => $maintenance
        ]);
    }

    /**
     * Từ chối phiếu bảo trì
     */
    public function rejectMaintenance(Request $request, $projectId, $uuid)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        $this->authService->require($user, Permissions::WARRANTY_APPROVE, $project);

        $maintenance = ProjectMaintenance::where('project_id', $project->id)->where('uuid', $uuid)->firstOrFail();
        
        $maintenance->update([
            'status' => ProjectMaintenance::STATUS_REJECTED,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã từ chối phiếu bảo trì.',
            'data' => $maintenance
        ]);
    }

    /**
     * Cập nhật phiếu bảo trì
     */
    public function updateMaintenance(Request $request, $projectId, $uuid)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        $this->authService->require($user, Permissions::WARRANTY_UPDATE, $project);

        $maintenance = ProjectMaintenance::where('project_id', $project->id)->where('uuid', $uuid)->firstOrFail();
        
        if ($maintenance->status !== ProjectMaintenance::STATUS_DRAFT) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể chỉnh sửa phiếu ở trạng thái nháp.'
            ], 400);
        }

        $validated = $request->validate([
            'maintenance_date' => 'required|date',
            'notes' => 'nullable|string',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'exists:attachments,id',
        ]);

        DB::beginTransaction();
        try {
            $nextDate = Carbon::parse($validated['maintenance_date'])->addMonths(6);
            
            $maintenance->update([
                'maintenance_date' => $validated['maintenance_date'],
                'next_maintenance_date' => $nextDate,
                'notes' => $validated['notes'] ?? $maintenance->notes,
            ]);

            if (isset($validated['attachment_ids'])) {
                // Link new attachments
                \App\Models\Attachment::whereIn('id', $validated['attachment_ids'])
                    ->update([
                        'attachable_id' => $maintenance->id,
                        'attachable_type' => ProjectMaintenance::class
                    ]);
            }

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật phiếu bảo trì thành công.',
                'data' => $maintenance->load('attachments')
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Xóa phiếu bảo hành
     */
    public function destroyWarranty(Request $request, $projectId, $uuid)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        $this->authService->require($user, Permissions::WARRANTY_DELETE, $project);

        $warranty = ProjectWarranty::where('project_id', $project->id)->where('uuid', $uuid)->firstOrFail();
        $warranty->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa phiếu bảo hành thành công.'
        ]);
    }

    /**
     * Xóa phiếu bảo trì
     */
    public function destroyMaintenance(Request $request, $projectId, $uuid)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        $this->authService->require($user, Permissions::WARRANTY_DELETE, $project);

        $maintenance = ProjectMaintenance::where('project_id', $project->id)->where('uuid', $uuid)->firstOrFail();
        $maintenance->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa phiếu bảo trì thành công.'
        ]);
    }
}
