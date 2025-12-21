<?php

namespace App\Services;

use App\Models\AcceptanceStage;
use App\Models\Project;
use App\Models\Defect;
use Illuminate\Support\Facades\DB;

class AcceptanceWorkflowService
{
    /**
     * Kiểm tra xem có thể duyệt giai đoạn không
     */
    public function canApprove(AcceptanceStage $stage, string $approvalType): bool
    {
        // Check for open defects
        if ($approvalType === 'owner' && $this->hasOpenDefects($stage)) {
            return false;
        }

        // Check workflow order
        return match ($approvalType) {
            'internal' => $stage->status === 'pending',
            'customer' => $stage->status === 'internal_approved',
            'design' => $stage->status === 'customer_approved',
            'owner' => $stage->status === 'design_approved' && !$this->hasOpenDefects($stage),
            default => false,
        };
    }

    /**
     * Kiểm tra có lỗi mở không
     */
    public function hasOpenDefects(AcceptanceStage $stage): bool
    {
        return Defect::where('acceptance_stage_id', $stage->id)
            ->whereIn('status', ['open', 'in_progress'])
            ->exists();
    }

    /**
     * Tạo các giai đoạn nghiệm thu mặc định
     */
    public function createDefaultStages(Project $project): array
    {
        $defaultStages = [
            ['name' => 'Nghiệm thu phần cốt thép móng', 'order' => 1],
            ['name' => 'Nghiệm thu hệ điện, nước ngầm', 'order' => 2],
            ['name' => 'Nghiệm thu phần thô', 'order' => 3],
            ['name' => 'Nghiệm thu hoàn thiện', 'order' => 4],
        ];

        $stages = [];

        try {
            DB::beginTransaction();

            foreach ($defaultStages as $stageData) {
                $stage = AcceptanceStage::create([
                    'project_id' => $project->id,
                    'name' => $stageData['name'],
                    'description' => null,
                    'order' => $stageData['order'],
                    'is_custom' => false,
                    'status' => 'pending',
                ]);

                $stages[] = $stage;
            }

            DB::commit();

            return $stages;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Trigger thanh toán đợt tiếp theo sau khi nghiệm thu
     */
    public function triggerNextPayment(Project $project, AcceptanceStage $stage): ?ProjectPayment
    {
        if ($stage->status !== 'owner_approved') {
            return null;
        }

        // Find next pending payment
        $nextPayment = $project->payments()
            ->where('status', 'pending')
            ->orderBy('payment_number')
            ->first();

        if ($nextPayment) {
            // Update due date if needed
            // $nextPayment->update(['due_date' => now()->addDays(7)]);
        }

        return $nextPayment;
    }
}
