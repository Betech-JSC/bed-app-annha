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
    protected $warrantyService;
    protected $attachmentService;

    public function __construct(
        \App\Services\AuthorizationService $authService,
        \App\Services\ProjectWarrantyService $warrantyService,
        \App\Services\AttachmentService $attachmentService
    ) {
        $this->authService = $authService;
        $this->warrantyService = $warrantyService;
        $this->attachmentService = $attachmentService;
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

        try {
            DB::beginTransaction();
            $data = array_merge($validated, ['project_id' => $project->id]);
            $warranty = $this->warrantyService->upsertWarranty($data, null, $user);

            if (!empty($validated['attachment_ids'])) {
                $this->attachmentService->linkExistingAttachments($validated['attachment_ids'], $warranty);
            }

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Đã tạo phiếu bảo hành thành công.',
                'data' => $warranty->load('attachments')
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Lỗi: ' . $e->getMessage()], 500);
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

        try {
            DB::beginTransaction();
            $data = array_merge($validated, ['project_id' => $project->id]);
            $this->warrantyService->upsertWarranty($data, $warranty, $user);

            if (isset($validated['attachment_ids'])) {
                $this->attachmentService->clearAttachments($warranty);
                $this->attachmentService->linkExistingAttachments($validated['attachment_ids'], $warranty);
            }

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật phiếu bảo hành thành công.',
                'data' => $warranty->fresh('attachments')
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Lỗi: ' . $e->getMessage()], 500);
        }
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
        
        try {
            $this->warrantyService->updateStatus($warranty, ProjectWarranty::STATUS_PENDING_CUSTOMER, $user);
            return response()->json(['success' => true, 'message' => 'Đã gửi phiếu bảo hành cho khách hàng duyệt.', 'data' => $warranty]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function approveWarranty(Request $request, $projectId, $uuid)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        $this->authService->require($user, Permissions::WARRANTY_APPROVE, $project);

        $warranty = ProjectWarranty::where('project_id', $project->id)->where('uuid', $uuid)->firstOrFail();
        
        try {
            $this->warrantyService->updateStatus($warranty, ProjectWarranty::STATUS_APPROVED, $user);
            return response()->json(['success' => true, 'message' => 'Đã duyệt phiếu bảo hành thành công.', 'data' => $warranty]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
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
        
        try {
            $this->warrantyService->reject($warranty, $user, $request->input('reason'));
            return response()->json(['success' => true, 'message' => 'Đã từ chối phiếu bảo hành.', 'data' => $warranty]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
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

        try {
            DB::beginTransaction();
            $data = array_merge($validated, ['project_id' => $project->id]);
            $maintenance = $this->warrantyService->upsertMaintenance($data, null, $user);

            if (!empty($validated['attachment_ids'])) {
                $this->attachmentService->linkExistingAttachments($validated['attachment_ids'], $maintenance);
            }

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Đã tạo phiếu bảo trì thành công.',
                'data' => $maintenance->load('attachments')
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Lỗi: ' . $e->getMessage()], 500);
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
        
        try {
            $this->warrantyService->updateStatus($maintenance, ProjectMaintenance::STATUS_PENDING_CUSTOMER, $user);
            return response()->json(['success' => true, 'message' => 'Đã gửi phiếu bảo trì cho khách hàng duyệt.', 'data' => $maintenance]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
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
        
        try {
            $this->warrantyService->updateStatus($maintenance, ProjectMaintenance::STATUS_APPROVED, $user);
            return response()->json(['success' => true, 'message' => 'Đã duyệt phiếu bảo trì thành công.', 'data' => $maintenance]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
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
        
        try {
            $this->warrantyService->reject($maintenance, $user, $request->input('reason'));
            return response()->json(['success' => true, 'message' => 'Đã từ chối phiếu bảo trì.', 'data' => $maintenance]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
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
        
        $validated = $request->validate([
            'maintenance_date' => 'sometimes|required|date',
            'notes' => 'nullable|string',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'exists:attachments,id',
        ]);

        try {
            DB::beginTransaction();
            $data = array_merge($validated, ['project_id' => $project->id]);
            $this->warrantyService->upsertMaintenance($data, $maintenance, $user);

            if (isset($validated['attachment_ids'])) {
                $this->attachmentService->clearAttachments($maintenance);
                $this->attachmentService->linkExistingAttachments($validated['attachment_ids'], $maintenance);
            }

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật phiếu bảo trì thành công.',
                'data' => $maintenance->load('attachments')
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Lỗi: ' . $e->getMessage()], 500);
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

        return response()->json(['success' => true, 'message' => 'Đã xóa phiếu bảo hành thành công.']);
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

        return response()->json(['success' => true, 'message' => 'Đã xóa phiếu bảo trì thành công.']);
    }
}
