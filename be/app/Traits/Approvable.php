<?php

namespace App\Traits;

use App\Models\Approval;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;

trait Approvable
{
    /**
     * Boot the trait to automatically sync with approvals table.
     */
    protected static function bootApprovable()
    {
        static::saved(function ($model) {
            if ($model->isPendingApproval()) {
                $model->syncApproval();
            } else {
                // Model is no longer pending — resolve the approval status
                $resolvedStatus = $model->getApprovalResolvedStatus();
                
                $model->approvals()->where('status', 'pending')->update([
                    'status'        => $resolvedStatus,
                    'last_action'   => $resolvedStatus,
                    'last_actor_id' => auth()->id(),
                ]);
            }
        });
    }

    /**
     * Determine if the model is currently in a pending approval state.
     * Models should override this if they have complex status logic.
     */
    public function isPendingApproval(): bool
    {
        $status = $this->getModelStatusValue();
        return $status === 'pending' || 
               (is_string($status) && (strpos($status, 'pending_') === 0)) ||
               $status === 'customer_paid' ||
               $status === 'submitted' ||
               $status === 'under_review' ||
               $status === 'fixed'; // Defect chờ xác nhận
    }

    /**
     * Get the raw status value from the model.
     * Handles models that use non-standard status column names.
     */
    protected function getModelStatusValue(): string
    {
        // Some models use 'approval_status' instead of 'status' (e.g. ConstructionLog)
        return $this->status ?? $this->approval_status ?? '';
    }

    /**
     * Normalize the model's current status into an approval-friendly value.
     * Maps domain-specific statuses (in_use, returned, etc.) to
     * the canonical 'approved' / 'rejected' used in the approvals table.
     */
    public function getApprovalResolvedStatus(): string
    {
        $rawStatus = $this->getModelStatusValue();

        // Explicit rejection
        if ($rawStatus === 'rejected') {
            return 'rejected';
        }

        // Statuses that mean "approved / done / completed"
        $approvedStatuses = [
            'approved', 'completed', 'in_use', 'returned', 'paid',
            'verified', 'confirmed', 'active', 'done',
        ];

        if (in_array($rawStatus, $approvedStatuses)) {
            return 'approved';
        }

        // Still pending states (shouldn't reach here normally)
        if ($this->isPendingApproval()) {
            return 'pending';
        }

        // Fallback — use the raw status to avoid data loss
        return $rawStatus ?: 'done';
    }

    /**
     * Get all approvals for the model.
     */
    public function approvals(): MorphMany
    {
        return $this->morphMany(Approval::class, 'approvable');
    }

    /**
     * Get the active/current approval for the model.
     */
    public function currentApproval(): MorphOne
    {
        return $this->morphOne(Approval::class, 'approvable')
            ->where('status', 'pending')
            ->latestOfMany();
    }

    /**
     * Helper to sync this model with the approvals table.
     * This should be called whenever a model enters an approval stage.
     */
    public function syncApproval(array $options = []): Approval
    {
        $userId = $options['user_id'] ?? (auth()->id() ?? $this->user_id ?? $this->creator_id ?? $this->created_by ?? 71);
        $projectId = $options['project_id'] ?? $this->project_id;
        $status = $options['status'] ?? 'pending';
        $summary = $options['summary'] ?? $this->getApprovalSummary();
        $metadata = $options['metadata'] ?? $this->getApprovalMetadata();

        // Update existing pending approval or create a new one
        $approval = Approval::updateOrCreate(
            [
                'approvable_type' => get_class($this),
                'approvable_id' => $this->id,
                'status' => 'pending',
            ],
            [
                'project_id' => $projectId,
                'user_id' => $userId,
                'summary' => $summary,
                'metadata' => $metadata,
            ]
        );

        return $approval;
    }

    /**
     * Get a human-readable summary for the approval.
     * Models should override this.
     */
    protected function getApprovalSummary(): string
    {
        return "Yêu cầu từ " . get_class($this) . " #" . $this->id;
    }

    /**
     * Get a snapshot of data for fast display in the approval center.
     * Models should override this.
     */
    protected function getApprovalMetadata(): array
    {
        return $this->toArray();
    }
}
