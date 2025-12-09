<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcceptanceStage;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AcceptanceStageController extends Controller
{
    /**
     * Danh sách giai đoạn nghiệm thu
     */
    public function index(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $stages = $project->acceptanceStages()
            ->with([
                'internalApprover',
                'customerApprover',
                'designApprover',
                'ownerApprover',
                'defects' => function ($q) {
                    $q->whereIn('status', ['open', 'in_progress']);
                },
                'attachments'
            ])
            ->orderBy('order')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $stages
        ]);
    }

    /**
     * Duyệt giai đoạn nghiệm thu
     */
    public function approve(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($id);
        $user = auth()->user();

        $validated = $request->validate([
            'approval_type' => ['required', 'in:internal,customer,design,owner'],
        ]);

        $approvalType = $validated['approval_type'];
        $success = false;

        switch ($approvalType) {
            case 'internal':
                // Giám sát nội bộ
                $success = $stage->approveInternal($user);
                break;
            case 'customer':
                // Giám sát khách hàng
                if ($project->customer_id === $user->id || $stage->status === 'internal_approved') {
                    $success = $stage->approveCustomer($user);
                }
                break;
            case 'design':
                // Thiết kế
                if ($stage->status === 'customer_approved') {
                    $success = $stage->approveDesign($user);
                }
                break;
            case 'owner':
                // Chủ nhà
                if ($project->customer_id === $user->id && $stage->status === 'design_approved') {
                    $success = $stage->approveOwner($user);
                }
                break;
        }

        if (!$success) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể duyệt giai đoạn này. Vui lòng kiểm tra trạng thái và quyền truy cập.'
            ], 400);
        }

        // Check for open defects
        if ($approvalType === 'owner' && $stage->has_open_defects) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể duyệt vì còn lỗi chưa được khắc phục.'
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Giai đoạn nghiệm thu đã được duyệt.',
            'data' => $stage->fresh()
        ]);
    }
}
