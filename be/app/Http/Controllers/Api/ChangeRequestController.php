<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ChangeRequest;
use App\Constants\Permissions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChangeRequestController extends Controller
{
    use ApiAuthorization;

    protected $changeRequestService;

    public function __construct(\App\Services\ChangeRequestService $changeRequestService)
    {
        $this->changeRequestService = $changeRequestService;
    }
    /**
     * Danh sách change requests của project
     */
    public function index(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);
        $this->apiRequire($request->user(), Permissions::CHANGE_REQUEST_VIEW, $project);

        $query = $project->changeRequests()
            ->with([
                'requester',
                'reviewer',
                'approver',
            ]);

        // Filter by status
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        // Filter by type
        if ($type = $request->query('change_type')) {
            $query->where('change_type', $type);
        }

        // Filter pending only
        if ($request->query('pending_only') === 'true') {
            $query->pending();
        }

        $changeRequests = $query->orderByDesc('created_at')->get();

        return response()->json([
            'success' => true,
            'data' => $changeRequests
        ]);
    }

    /**
     * Tạo change request mới
     */
    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        $this->apiRequire($user, Permissions::CHANGE_REQUEST_CREATE, $project);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string|max:5000',
            'change_type' => 'required|in:scope,schedule,cost,quality,resource,other',
            'priority' => 'required|in:low,medium,high,urgent',
            'reason' => 'nullable|string|max:2000',
            'impact_analysis' => 'nullable|string|max:5000',
            'estimated_cost_impact' => 'nullable|numeric|min:0',
            'estimated_schedule_impact_days' => 'nullable|integer|min:0',
            'implementation_plan' => 'nullable|string|max:5000',
        ]);

        try {
            $changeRequest = $this->changeRequestService->upsert(
                array_merge($validated, ['project_id' => $project->id]),
                null,
                $user
            );

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo yêu cầu thay đổi',
                'data' => $changeRequest
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể tạo yêu cầu thay đổi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Chi tiết change request
     */
    public function show(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $this->apiRequire(auth()->user(), Permissions::CHANGE_REQUEST_VIEW, $project);

        $changeRequest = $project->changeRequests()
            ->with(['requester', 'reviewer', 'approver'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $changeRequest
        ]);
    }

    /**
     * Cập nhật change request
     */
    public function update(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $changeRequest = $project->changeRequests()->findOrFail($id);
        $user = auth()->user();
        $this->apiRequire($user, Permissions::CHANGE_REQUEST_UPDATE, $project);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string|max:5000',
            'change_type' => 'sometimes|required|in:scope,schedule,cost,quality,resource,other',
            'priority' => 'sometimes|required|in:low,medium,high,urgent',
            'reason' => 'nullable|string|max:2000',
            'impact_analysis' => 'nullable|string|max:5000',
            'estimated_cost_impact' => 'nullable|numeric|min:0',
            'estimated_schedule_impact_days' => 'nullable|integer|min:0',
            'implementation_plan' => 'nullable|string|max:5000',
        ]);

        try {
            $this->changeRequestService->upsert($validated, $changeRequest, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật yêu cầu thay đổi',
                'data' => $changeRequest->fresh(['requester'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể cập nhật yêu cầu thay đổi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Xóa change request
     */
    public function destroy(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $this->apiRequire(auth()->user(), Permissions::CHANGE_REQUEST_DELETE, $project);

        $changeRequest = $project->changeRequests()->findOrFail($id);

        // Chỉ cho phép xóa khi ở trạng thái draft hoặc cancelled
        if (!in_array($changeRequest->status, ['draft', 'cancelled'])) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể xóa yêu cầu thay đổi ở trạng thái draft hoặc cancelled'
            ], 400);
        }

        try {
            $changeRequest->delete();

            return response()->json([
                'success' => true,
                'message' => 'Đã xóa yêu cầu thay đổi'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa yêu cầu thay đổi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Gửi change request để duyệt
     */
    public function submit(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $changeRequest = $project->changeRequests()->findOrFail($id);
        $user = auth()->user();
        $this->apiRequire($user, Permissions::CHANGE_REQUEST_CREATE, $project);

        try {
            $this->changeRequestService->submit($changeRequest, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã gửi yêu cầu thay đổi để duyệt',
                'data' => $changeRequest->fresh(['requester'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể gửi yêu cầu thay đổi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Duyệt change request
     */
    public function approve(string $projectId, string $id, Request $request)
    {
        $project = Project::findOrFail($projectId);
        $changeRequest = $project->changeRequests()->findOrFail($id);
        $user = auth()->user();
        $this->apiRequire($user, Permissions::CHANGE_REQUEST_APPROVE, $project);

        $validated = $request->validate([
            'notes' => 'nullable|string|max:2000',
        ]);

        try {
            $this->changeRequestService->approve($changeRequest, $user, $validated['notes'] ?? null);

            return response()->json([
                'success' => true,
                'message' => 'Đã duyệt yêu cầu thay đổi',
                'data' => $changeRequest->fresh(['requester', 'approver'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể duyệt yêu cầu thay đổi: ' . $e->getMessage()
            ], 500);
        }
    }

    public function reject(string $projectId, string $id, Request $request)
    {
        $project = Project::findOrFail($projectId);
        $changeRequest = $project->changeRequests()->findOrFail($id);
        $user = auth()->user();
        $this->apiRequire($user, Permissions::CHANGE_REQUEST_REJECT, $project);

        $validated = $request->validate([
            'reason' => 'required|string|max:2000',
        ]);

        try {
            $this->changeRequestService->reject($changeRequest, $user, $validated['reason']);

            return response()->json([
                'success' => true,
                'message' => 'Đã từ chối yêu cầu thay đổi',
                'data' => $changeRequest->fresh(['requester', 'reviewer'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể từ chối yêu cầu thay đổi: ' . $e->getMessage()
            ], 500);
        }
    }

    public function markAsImplemented(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $this->apiRequire(auth()->user(), Permissions::CHANGE_REQUEST_UPDATE, $project);

        $changeRequest = $project->changeRequests()->findOrFail($id);

        try {
            $this->changeRequestService->markAsImplemented($changeRequest);

            return response()->json([
                'success' => true,
                'message' => 'Đã đánh dấu yêu cầu thay đổi đã được triển khai',
                'data' => $changeRequest->fresh(['requester', 'approver'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể đánh dấu đã triển khai: ' . $e->getMessage()
            ], 500);
        }
    }
}
