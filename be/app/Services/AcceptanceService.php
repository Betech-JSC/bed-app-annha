<?php

namespace App\Services;

use App\Models\Acceptance;
use App\Models\Defect;
use App\Models\DefectHistory;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * AcceptanceService
 *
 * Single-table acceptance workflow: one Acceptance record per child task.
 * Parent task grouping is a UI concern — no Stage wrapper needed.
 *
 * Flow: draft → submitted → supervisor_approved → customer_approved
 *                                ↑ (reject → back to rejected, revert → draft)
 */
class AcceptanceService
{
    /**
     * Push a child task into the acceptance flow when it reaches 100%.
     * Idempotent: creates if missing, flips draft → submitted if already exists.
     */
    public function pushFromTask(ProjectTask $child): ?Acceptance
    {
        try {
            if ($child->parent_id === null) {
                return null;
            }

            $acceptance = Acceptance::where('task_id', $child->id)->first();

            if (!$acceptance) {
                $maxOrder = (int) Acceptance::where('project_id', $child->project_id)->max('order');
                $acceptance = Acceptance::create([
                    'project_id'      => $child->project_id,
                    'task_id'         => $child->id,
                    'name'            => $child->name,
                    'description'     => $child->description,
                    'order'           => $maxOrder + 1,
                    'workflow_status' => 'submitted',
                    'submitted_at'    => now(),
                    'submitted_by'    => auth()->id() ?? $child->updated_by ?? $child->created_by,
                    'created_by'      => $child->created_by,
                ]);

                Log::info('Acceptance auto-created (submitted) for child task', [
                    'task_id'       => $child->id,
                    'acceptance_id' => $acceptance->id,
                ]);
            } elseif ($acceptance->workflow_status === 'draft') {
                $acceptance->workflow_status = 'submitted';
                $acceptance->submitted_at    = now();
                $acceptance->submitted_by    = auth()->id() ?? $child->updated_by ?? $child->created_by;
                $acceptance->save();

                Log::info('Acceptance flipped draft → submitted for child task', [
                    'task_id'       => $child->id,
                    'acceptance_id' => $acceptance->id,
                ]);
            }

            $this->checkParentCompletion($acceptance);

            return $acceptance;
        } catch (\Exception $e) {
            Log::error('AcceptanceService::pushFromTask failed', [
                'task_id' => $child->id,
                'error'   => $e->getMessage(),
            ]);
            // Non-critical — must not break progress recalculation
            return null;
        }
    }

    /**
     * Approve an acceptance record.
     * Level 1 (Supervisor): submitted → supervisor_approved
     * Level 3 (Customer):   supervisor_approved → customer_approved
     */
    public function approve(Acceptance $acceptance, User $user, int $level): bool
    {
        return DB::transaction(function () use ($acceptance, $user, $level) {
            switch ($level) {
                case 1:
                    if ($acceptance->workflow_status !== 'submitted') {
                        throw new \Exception('Phiếu nghiệm thu không ở trạng thái chờ giám sát duyệt.');
                    }
                    if ($acceptance->has_open_defects) {
                        throw new \Exception('Không thể duyệt vì còn lỗi chưa được xử lý xong.');
                    }
                    $acceptance->workflow_status          = 'supervisor_approved';
                    $acceptance->supervisor_approved_by   = $user->id;
                    $acceptance->supervisor_approved_at   = now();
                    break;

                case 3:
                    if ($acceptance->workflow_status !== 'supervisor_approved') {
                        throw new \Exception('Phiếu nghiệm thu cần được giám sát xác nhận trước khi khách hàng duyệt.');
                    }
                    if ($acceptance->has_open_defects) {
                        throw new \Exception('Không thể duyệt vì còn lỗi chưa được xử lý xong.');
                    }
                    $acceptance->workflow_status        = 'customer_approved';
                    $acceptance->customer_approved_by   = $user->id;
                    $acceptance->customer_approved_at   = now();
                    break;

                default:
                    throw new \Exception('Cấp duyệt không hợp lệ.');
            }

            $saved = $acceptance->save();

            if ($saved && $level === 3) {
                $this->createProgressLogOnApproval($acceptance, $user);
                $this->checkParentCompletion($acceptance);
            }

            return $saved;
        });
    }

    /**
     * Reject an acceptance record. Auto-creates a Defect if none unverified exist.
     */
    public function reject(Acceptance $acceptance, User $user, string $reason): bool
    {
        if (!in_array($acceptance->workflow_status, ['submitted', 'supervisor_approved'])) {
            throw new \Exception('Phiếu nghiệm thu không ở trạng thái có thể từ chối.');
        }

        return DB::transaction(function () use ($acceptance, $user, $reason) {
            $acceptance->workflow_status  = 'rejected';
            $acceptance->rejected_by      = $user->id;
            $acceptance->rejected_at      = now();
            $acceptance->rejection_reason = $reason;
            $acceptance->save();

            $this->autoCreateDefect($acceptance, $user, $reason);

            return true;
        });
    }

    /**
     * Submit acceptance for approval (draft → submitted).
     */
    public function submit(Acceptance $acceptance, User $user): bool
    {
        if ($acceptance->workflow_status !== 'draft') {
            throw new \Exception('Chỉ có thể gửi duyệt phiếu nghiệm thu ở trạng thái nháp.');
        }

        $acceptance->workflow_status = 'submitted';
        $acceptance->submitted_by = $user->id;
        $acceptance->submitted_at = now();

        return $acceptance->save();
    }

    /**
     * Revert to draft (hoàn duyệt).
     */
    public function revertToDraft(Acceptance $acceptance, User $user): bool
    {
        if ($acceptance->workflow_status === 'customer_approved') {
            throw new \Exception('Không thể hoàn duyệt — Nghiệm thu đã hoàn tất.');
        }
        $revertible = ['submitted', 'supervisor_approved', 'rejected'];
        if (!in_array($acceptance->workflow_status, $revertible)) {
            throw new \Exception('Chỉ có thể hoàn duyệt hạng mục đang chờ duyệt hoặc bị từ chối.');
        }

        $acceptance->workflow_status          = 'draft';
        $acceptance->supervisor_approved_by   = null;
        $acceptance->supervisor_approved_at   = null;
        $acceptance->rejection_reason         = null;
        $acceptance->rejected_by              = null;
        $acceptance->rejected_at              = null;

        return $acceptance->save();
    }

    /**
     * Batch approve all acceptances at the given level for a parent task's children.
     * Returns count of records approved.
     */
    public function batchApprove(ProjectTask $parentTask, User $user, int $level): int
    {
        $targetStatus = $level === 1 ? 'submitted' : 'supervisor_approved';

        $acceptances = Acceptance::where('project_id', $parentTask->project_id)
            ->where('workflow_status', $targetStatus)
            ->whereHas('task', fn($q) => $q->where('parent_id', $parentTask->id))
            ->get();

        $count = 0;
        foreach ($acceptances as $acceptance) {
            try {
                if ($this->approve($acceptance, $user, $level)) {
                    $count++;
                }
            } catch (\Exception $e) {
                Log::warning('batchApprove: skipped one record', [
                    'acceptance_id' => $acceptance->id,
                    'reason'        => $e->getMessage(),
                ]);
            }
        }

        return $count;
    }

    /**
     * Check if all sibling acceptances (children of same parent task) are
     * customer_approved → if so, update the parent task status to 'completed'.
     */
    public function checkParentCompletion(Acceptance $acceptance): void
    {
        try {
            $task = $acceptance->task;
            if (!$task || !$task->parent_id) {
                return;
            }

            $parentTask = ProjectTask::find($task->parent_id);
            if (!$parentTask) {
                return;
            }

            // All child tasks of the parent
            $siblingTaskIds = ProjectTask::where('parent_id', $parentTask->id)
                ->whereNull('deleted_at')
                ->pluck('id');

            if ($siblingTaskIds->isEmpty()) {
                return;
            }

            // All siblings must have a customer_approved acceptance
            $approvedCount = Acceptance::whereIn('task_id', $siblingTaskIds)
                ->where('workflow_status', 'customer_approved')
                ->count();

            if ($approvedCount >= $siblingTaskIds->count()) {
                // All children accepted — auto-complete the parent task
                $parentTask->forceFill(['status' => 'completed'])->saveQuietly();

                Log::info('Parent task auto-completed after all children accepted', [
                    'parent_task_id' => $parentTask->id,
                    'children_count' => $siblingTaskIds->count(),
                ]);
            }
        } catch (\Exception $e) {
            Log::warning('checkParentCompletion failed', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Attach files to an acceptance record.
     */
    public function attachFiles(Acceptance $acceptance, array $attachmentIds, User $user): array
    {
        $attached = [];
        foreach ($attachmentIds as $attachmentId) {
            $attachment = \App\Models\Attachment::find($attachmentId);
            $isManager  = $acceptance->project?->project_manager_id === $user->id;

            if ($attachment && ($attachment->uploaded_by === $user->id || $isManager)) {
                $attachment->update([
                    'attachable_type' => Acceptance::class,
                    'attachable_id'   => $acceptance->id,
                ]);
                $attached[] = $attachment;
            }
        }
        return $attached;
    }

    /**
     * Get acceptances for a project, grouped by parent task, with eager loading.
     */
    public function getForProject(Project $project): \Illuminate\Support\Collection
    {
        return Acceptance::where('project_id', $project->id)
            ->with([
                'task.parent',
                'template.criteria',
                'submitter',
                'supervisorApprover',
                'customerApprover',
                'rejector',
                'attachments',
                'defects' => fn($q) => $q->whereIn('status', ['open', 'in_progress']),
            ])
            ->orderBy('order')
            ->get();
    }

    // ==================================================================
    // PRIVATE HELPERS
    // ==================================================================

    private function autoCreateDefect(Acceptance $acceptance, User $user, string $reason): ?Defect
    {
        try {
            $hasUnverified = Defect::where('project_id', $acceptance->project_id)
                ->where('task_id', $acceptance->task_id)
                ->whereIn('status', ['open', 'in_progress', 'fixed'])
                ->exists();

            if ($hasUnverified) {
                return null;
            }

            $defect = Defect::create([
                'project_id'  => $acceptance->project_id,
                'task_id'     => $acceptance->task_id,
                'description' => "Nghiệm thu bị từ chối: {$acceptance->name}.\n"
                    . ($reason ? "Lý do: {$reason}\n" : '')
                    . 'Vui lòng khắc phục trước khi gửi duyệt lại.',
                'severity'    => 'high',
                'status'      => 'open',
                'reported_by' => $user->id,
                'reported_at' => now(),
            ]);

            DefectHistory::create([
                'defect_id'  => $defect->id,
                'action'     => 'created',
                'new_status' => 'open',
                'user_id'    => $user->id,
                'comment'    => 'Tự động tạo khi nghiệm thu bị từ chối',
            ]);

            return $defect;
        } catch (\Exception $e) {
            Log::warning('autoCreateDefect failed', ['acceptance_id' => $acceptance->id, 'error' => $e->getMessage()]);
            return null;
        }
    }

    private function createProgressLogOnApproval(Acceptance $acceptance, User $user): void
    {
        try {
            $task = $acceptance->task;
            if (!$task) {
                return;
            }

            $logDate    = now()->toDateString();
            $existing   = \App\Models\ConstructionLog::where('project_id', $acceptance->project_id)
                ->where('log_date', $logDate)
                ->where('task_id', $task->id)
                ->first();

            if ($existing) {
                $existing->update([
                    'completion_percentage' => 100,
                    'notes'                 => ($existing->notes ? $existing->notes . "\n" : '')
                        . "Nghiệm thu đã được khách hàng phê duyệt: {$acceptance->name}",
                ]);
            } else {
                \App\Models\ConstructionLog::create([
                    'project_id'            => $acceptance->project_id,
                    'task_id'               => $task->id,
                    'log_date'              => $logDate,
                    'completion_percentage' => 100,
                    'notes'                 => "Nghiệm thu đã được khách hàng phê duyệt: {$acceptance->name}",
                    'created_by'            => $user->id,
                ]);
            }
        } catch (\Exception $e) {
            Log::warning('createProgressLogOnApproval failed', ['acceptance_id' => $acceptance->id, 'error' => $e->getMessage()]);
        }
    }

    // ==================================================================
    // PERMISSION HELPERS (used by controllers / ApprovalCenter)
    // ==================================================================

    public function determineLevelForUser(Acceptance $acceptance, User $user): ?int
    {
        $project = $acceptance->project;

        if ($this->hasPermission($user, \App\Constants\Permissions::ACCEPTANCE_APPROVE_LEVEL_3, $project)) {
            return 3;
        }
        if ($this->hasPermission($user, \App\Constants\Permissions::ACCEPTANCE_APPROVE_LEVEL_1, $project)) {
            return 1;
        }

        return null;
    }

    protected function hasPermission(User $user, string $permission, ?Project $project): bool
    {
        if (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
            return true;
        }
        if (method_exists($user, 'hasPermission')) {
            return $user->hasPermission($permission);
        }
        return false;
    }
}
