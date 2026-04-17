<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attachment;
use App\Models\Contract;
use App\Models\Project;
use App\Constants\Permissions;
use App\Services\AuthorizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ContractController extends Controller
{
    protected $authService;

    public function __construct(AuthorizationService $authService)
    {
        $this->authService = $authService;
    }
    /**
     * Xem hợp đồng của dự án
     */
    public function show(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check permission với project context
        if (!$this->authService->can($user, Permissions::CONTRACT_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem hợp đồng của dự án này.'
            ], 403);
        }

        $contract = $project->contract()->with(['attachments', 'approver'])->first();

        // Trả về 200 với data null nếu chưa có contract (không phải lỗi)
        return response()->json([
            'success' => true,
            'data' => $contract,
            'message' => $contract ? 'Hợp đồng đã được tải.' : 'Hợp đồng chưa được tạo.'
        ]);
    }

    /**
     * Tạo/cập nhật hợp đồng
     */
    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check permission - use CREATE if contract doesn't exist, UPDATE if it does
        $contract = $project->contract;
        $permission = $contract ? Permissions::CONTRACT_UPDATE : Permissions::CONTRACT_CREATE;

        if (!$this->authService->can($user, $permission, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền ' . ($contract ? 'cập nhật' : 'tạo') . ' hợp đồng cho dự án này.'
            ], 403);
        }

        $validated = $request->validate([
            'contract_value' => 'required|numeric|min:0|max:99999999999999999.99',
            'signed_date' => 'nullable|date',
            'status' => ['sometimes', 'in:draft,pending_customer_approval,approved,rejected'],
        ]);

        try {
            DB::beginTransaction();

            $contract = $project->contract()->updateOrCreate(
                ['project_id' => $project->id],
                [
                    ...$validated,
                    'status' => $validated['status'] ?? 'draft',
                ]
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Hợp đồng đã được lưu.',
                'data' => $contract->fresh()
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
     * Cập nhật hợp đồng
     */
    public function update(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $contract = $project->contract;
        $user = auth()->user();

        if (!$contract) {
            return response()->json([
                'success' => false,
                'message' => 'Hợp đồng chưa được tạo.'
            ], 404);
        }

        // Check permission với project context
        if (!$this->authService->can($user, Permissions::CONTRACT_UPDATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền cập nhật hợp đồng của dự án này.'
            ], 403);
        }

        $validated = $request->validate([
            'contract_value' => 'sometimes|numeric|min:0|max:99999999999999999.99',
            'signed_date' => 'nullable|date',
        ]);

        $contract->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Hợp đồng đã được cập nhật.',
            'data' => $contract->fresh()
        ]);
    }

    /**
     * Duyệt hợp đồng (khách hàng)
     */
    public function approve(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $contract = $project->contract;

        if (!$contract) {
            return response()->json([
                'success' => false,
                'message' => 'Hợp đồng chưa được tạo.'
            ], 404);
        }

        if ($contract->status !== 'pending_customer_approval') {
            return response()->json([
                'success' => false,
                'message' => 'Hợp đồng không ở trạng thái chờ duyệt.'
            ], 400);
        }

        $user = auth()->user();

        // Check RBAC permission với project context
        if (!$this->authService->can($user, Permissions::CONTRACT_APPROVE_LEVEL_1, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền duyệt hợp đồng của dự án này.'
            ], 403);
        }

        $contract->approve($user);

        return response()->json([
            'success' => true,
            'message' => 'Hợp đồng đã được duyệt.',
            'data' => $contract->fresh()
        ]);
    }

    /**
     * Từ chối hợp đồng
     */
    public function reject(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $contract = $project->contract;

        if (!$contract) {
            return response()->json([
                'success' => false,
                'message' => 'Hợp đồng chưa được tạo.'
            ], 404);
        }

        if ($contract->status !== 'pending_customer_approval') {
            return response()->json([
                'success' => false,
                'message' => 'Hợp đồng không ở trạng thái chờ duyệt.'
            ], 400);
        }

        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::CONTRACT_APPROVE_LEVEL_1, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền từ chối hợp đồng của dự án này.'
            ], 403);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $contract->reject($validated['reason'], $user);

        return response()->json([
            'success' => true,
            'message' => 'Hợp đồng đã bị từ chối.',
            'data' => $contract->fresh()
        ]);
    }

    /**
     * Đính kèm file vào hợp đồng
     */
    public function attachFiles(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $contract = $project->contract;

        if (!$contract) {
            return response()->json([
                'success' => false,
                'message' => 'Hợp đồng chưa được tạo.'
            ], 404);
        }

        $user = $request->user();

        $validated = $request->validate([
            'attachment_ids' => 'required|array',
            'attachment_ids.*' => 'required|integer|exists:attachments,id',
        ]);

        try {
            DB::beginTransaction();

            $attached = [];
            foreach ($validated['attachment_ids'] as $attachmentId) {
                $attachment = Attachment::find($attachmentId);
                if ($attachment && ($attachment->uploaded_by === $user->id || $user->hasPermission(\App\Constants\Permissions::SETTINGS_MANAGE))) {
                    $attachment->update([
                        'attachable_type' => Contract::class,
                        'attachable_id' => $contract->id,
                    ]);
                    $attached[] = $attachment;
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã đính kèm ' . count($attached) . ' file.',
                'data' => $contract->fresh(['attachments'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi đính kèm file.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
