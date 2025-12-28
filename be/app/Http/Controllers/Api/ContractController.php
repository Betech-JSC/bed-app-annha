<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attachment;
use App\Models\Contract;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ContractController extends Controller
{
    /**
     * Xem hợp đồng của dự án
     */
    public function show(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $contract = $project->contract()->with(['attachments', 'approver'])->first();

        if (!$contract) {
            return response()->json([
                'success' => false,
                'message' => 'Hợp đồng chưa được tạo.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $contract
        ]);
    }

    /**
     * Tạo/cập nhật hợp đồng
     */
    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

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

        if (!$contract) {
            return response()->json([
                'success' => false,
                'message' => 'Hợp đồng chưa được tạo.'
            ], 404);
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
        if ($project->customer_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ khách hàng mới có quyền duyệt hợp đồng.'
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
                if ($attachment && ($attachment->uploaded_by === $user->id || $user->role === 'admin' || $user->owner === true)) {
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
