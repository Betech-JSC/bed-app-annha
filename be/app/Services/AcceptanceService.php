<?php

namespace App\Services;

use App\Models\AcceptanceItem;
use App\Models\AcceptanceStage;
use App\Models\Defect;
use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AcceptanceService
{
    /**
     * Create or update an acceptance stage
     */
    public function upsertStage(array $data, ?AcceptanceStage $stage = null, $user = null): AcceptanceStage
    {
        if ($stage && $stage->status === 'customer_approved') {
            throw new \Exception('Không thể chỉnh sửa giai đoạn đã được nghiệm thu xong.');
        }

        if (!$stage) {
            $stage = new AcceptanceStage();
            $stage->status = 'pending';
            $stage->is_custom = $data['is_custom'] ?? true;
        }

        $stage->fill($data);
        $stage->save();

        return $stage;
    }

    /**
     * Create or update an acceptance item
     */
    public function upsertItem(array $data, ?AcceptanceItem $item = null, $user = null): AcceptanceItem
    {
        if ($item && $item->acceptance_status === 'approved') {
            throw new \Exception('Không thể chỉnh sửa hạng mục đã được nghiệm thu.');
        }

        $isNew = !$item;
        
        if ($isNew) {
            $item = new AcceptanceItem();
            $item->workflow_status = 'draft';
            $item->acceptance_status = 'not_started';
            $item->created_by = $user->id ?? null;
        }

        $item->fill($data);
        
        if (!$isNew) {
            $item->updated_by = $user->id ?? null;
        }

        // Auto update status based on end_date
        if ($item->end_date && now()->toDateString() >= $item->end_date->toDateString()) {
            if ($item->acceptance_status === 'not_started') {
                $item->acceptance_status = 'pending';
            }
        }

        $item->save();

        return $item;
    }

    /**
     * Submit an item for supervisor approval
     */
    public function submitItem(AcceptanceItem $item, $user): bool
    {
        if (!in_array($item->workflow_status, ['draft', 'rejected'])) {
            throw new \Exception('Chỉ có thể gửi duyệt khi ở trạng thái draft hoặc rejected.');
        }

        // Validate attachments (Photos are mandatory for submission)
        if ($item->attachments()->count() === 0) {
            throw new \Exception('Vui lòng upload hình ảnh thực tế nghiệm thu trước khi gửi duyệt.');
        }

        DB::transaction(function () use ($item, $user) {
            $oldStatus = $item->workflow_status;
            
            $item->workflow_status = 'submitted';
            $item->submitted_by = $user->id;
            $item->submitted_at = now();

            if ($oldStatus === 'rejected') {
                $item->rejection_reason = null;
                $item->rejected_by = null;
                $item->rejected_at = null;
            }

            $item->save();
            
            // Notify supervisor
            $item->acceptanceStage->notifyEvent('submitted', $user);
        });

        return true;
    }

    /**
     * Universal approval method for Acceptance Items
     */
    public function approveItem(AcceptanceItem $item, $user, ?int $level = null): bool
    {
        $level = $level ?? $this->determineLevelForUser($item, $user);

        // 1. Level-specific status validation
        switch ($level) {
            case 1: // Supervisor
                if ($item->workflow_status !== 'submitted') {
                    throw new \Exception('Hạng mục không ở trạng thái chờ giám sát duyệt.');
                }
                break;
            case 2: // PM
                if ($item->workflow_status !== 'supervisor_approved') {
                    throw new \Exception('Hạng mục cần được giám sát duyệt trước.');
                }
                break;
            case 3: // Customer
                if ($item->workflow_status !== 'project_manager_approved') {
                    throw new \Exception('Hạng mục cần được PM duyệt trước.');
                }
                break;
            default:
                throw new \Exception('Cấp duyệt không hợp lệ hoặc bạn không có quyền duyệt.');
        }

        // 2. Shared Prerequisites Check
        $this->validateApprovalPrerequisites($item);

        return DB::transaction(function () use ($item, $user, $level) {
            switch ($level) {
                case 1:
                    $item->workflow_status = 'supervisor_approved';
                    $item->supervisor_approved_by = $user->id;
                    $item->supervisor_approved_at = now();
                    break;
                case 2:
                    $item->workflow_status = 'project_manager_approved';
                    $item->project_manager_approved_by = $user->id;
                    $item->project_manager_approved_at = now();
                    break;
                case 3:
                    $item->workflow_status = 'customer_approved';
                    $item->customer_approved_by = $user->id;
                    $item->customer_approved_at = now();
                    $item->acceptance_status = 'approved';
                    $item->approved_by = $user->id;
                    $item->approved_at = now();
                    break;
            }

            $saved = $item->save();

            // Side effects AFTER save — checkCompletion cần DB đã cập nhật
            if ($saved) {
                $stage = $item->acceptanceStage;
                $stage->checkCompletion();

                $eventMap = [1 => 'supervisor_approved', 2 => 'pm_approved', 3 => 'customer_approved'];
                $stage->notifyEvent($eventMap[$level], $user);

                if ($level === 3) {
                    $item->updateProjectProgress();
                }
            }

            return $saved;
        });
    }

    /**
     * Reject an item from workflow
     */
    public function rejectItem(AcceptanceItem $item, $user, string $reason): bool
    {
        if (!in_array($item->workflow_status, ['submitted', 'supervisor_approved', 'project_manager_approved'])) {
            throw new \Exception('Hạng mục không ở trạng thái chờ duyệt.');
        }

        return DB::transaction(function () use ($item, $user, $reason) {
            $item->workflow_status = 'rejected';
            $item->rejected_by = $user->id;
            $item->rejected_at = now();
            $item->rejection_reason = $reason;
            $item->save();

            // Auto-create defect
            $item->autoCreateDefectOnReject($user instanceof User ? $user : null, $reason);
            
            // Notify stakeholders
            $item->acceptanceStage->notifyEvent('rejected', $user, ['reason' => $reason]);

            return true;
        });
    }

    /**
     * Universal approval method for Acceptance Stages
     */
    public function approveStage(AcceptanceStage $stage, $user, ?int $level = null): bool
    {
        $level = $level ?? $this->determineLevelForStage($stage, $user);

        switch ($level) {
            case 1: // Supervisor
                if ($stage->status !== 'pending') throw new \Exception('Giai đoạn không ở trạng thái chờ duyệt.');
                break;
            case 2: // PM
                if ($stage->status !== 'supervisor_approved') throw new \Exception('Chỉ có thể duyệt sau khi giám sát đã duyệt.');
                break;
            case 3: // Customer
                if ($stage->status !== 'project_manager_approved') throw new \Exception('Chỉ có thể duyệt sau khi QLDA đã duyệt.');
                if ($stage->has_open_defects) throw new \Exception('Không thể duyệt vì còn lỗi chưa được khắc phục.');
                break;
            default:
                throw new \Exception('Bạn không có quyền duyệt giai đoạn này.');
        }

        return DB::transaction(function () use ($stage, $user, $level) {
            switch ($level) {
                case 1:
                    $stage->status = 'supervisor_approved';
                    $stage->supervisor_approved_by = $user->id;
                    $stage->supervisor_approved_at = now();
                    $stage->notifyEvent('supervisor_approved', $user);
                    break;
                case 2:
                    $stage->status = 'project_manager_approved';
                    $stage->project_manager_approved_by = $user->id;
                    $stage->project_manager_approved_at = now();
                    $stage->notifyEvent('pm_approved', $user);
                    break;
                case 3:
                    $stage->status = 'customer_approved';
                    $stage->customer_approved_by = $user->id;
                    $stage->customer_approved_at = now();
                    
                    // Side effects (Legacy logic from model)
                    // Note: approveCustomer in model calls autoCreateAcceptanceItems and updateProjectProgress
                    // We call them here to be explicit in the service.
                    $stage->save(); // Save status first
                    
                    // Trigger model side effects if not already handled
                    $stage->checkCompletion(); 
                    $stage->notifyEvent('customer_approved', $user);
                    break;
            }
            return $stage->save();
        });
    }

    /**
     * Reject an acceptance stage
     */
    public function rejectStage(AcceptanceStage $stage, $user, string $reason): bool
    {
        $rejectableStatuses = ['pending', 'supervisor_approved', 'project_manager_approved'];
        if (!in_array($stage->status, $rejectableStatuses)) {
            throw new \Exception('Giai đoạn không ở trạng thái có thể từ chối.');
        }

        return DB::transaction(function () use ($stage, $user, $reason) {
            $stage->status = 'rejected';
            $stage->rejected_by = $user->id;
            $stage->rejected_at = now();
            $stage->rejection_reason = $reason;
            $stage->save();

            // Auto-create defect
            $stage->autoCreateDefectIfNotAcceptable($user instanceof User ? $user : null, $reason);
            
            // Notify
            $stage->notifyEvent('rejected', $user, ['reason' => $reason]);

            return true;
        });
    }

    /**
     * Delete an acceptance stage
     */
    public function deleteStage(AcceptanceStage $stage): bool
    {
        if ($stage->status === 'customer_approved' || $stage->status === 'owner_approved') {
            throw new \Exception('Không thể xóa giai đoạn đã được nghiệm thu hoàn toàn.');
        }

        if ($stage->has_open_defects) {
            throw new \Exception('Không thể xóa giai đoạn còn lỗi chưa được khắc phục.');
        }

        return $stage->delete();
    }

    /**
     * Delete an item
     */
    public function deleteItem(AcceptanceItem $item): bool
    {
        if (!in_array($item->workflow_status, ['draft', 'rejected'])) {
            throw new \Exception('Chỉ xóa được hạng mục ở trạng thái nháp hoặc bị từ chối.');
        }

        if ($item->acceptance_status === 'approved') {
            throw new \Exception('Không thể xóa hạng mục đã được nghiệm thu.');
        }

        return $item->delete();
    }

    /**
     * Batch approve all items in a stage that are pending for the user's level
     */
    public function approveAllInStage(AcceptanceStage $stage, $user): int
    {
        $items = $stage->items()
            ->whereIn('workflow_status', ['submitted', 'supervisor_approved', 'pm_approved', 'project_manager_approved'])
            ->get();

        $count = 0;
        foreach ($items as $item) {
            try {
                if ($this->approveItem($item, $user)) {
                    $count++;
                }
            } catch (\Exception $e) {
                // Skip items that don't meet prerequisites in batch mode
                continue;
            }
        }

        if ($count > 0) {
            $stage->checkCompletion();
        }

        return $count;
    }

    /**
     * Internal: Validate prerequisites for approval (Defects, Progress, Dates)
     */
    protected function validateApprovalPrerequisites(AcceptanceItem $item): void
    {
        // 1. Date check
        if (!$item->can_accept) {
             throw new \Exception('Hạng mục chỉ được nghiệm thu sau khi hoàn thành (ngày kết thúc đã qua).');
        }

        // 2. Open Defects Check (Defects linked to task OR stage)
        $openDefects = Defect::where('project_id', $item->acceptanceStage->project_id)
            ->whereIn('status', ['open', 'in_progress'])
            ->where(function ($q) use ($item) {
                if ($item->task_id) {
                    $q->where('task_id', $item->task_id);
                }
                $q->orWhere('acceptance_stage_id', $item->acceptance_stage_id);
            })
            ->count();

        if ($openDefects > 0) {
            throw new \Exception("Không thể duyệt vì còn {$openDefects} lỗi chưa được xử lý xong.");
        }

        // 3. Overall stage progress check (for Level 2 and 3)
        // If we want to strictly enforce PM/Customer approval only when tasks are 100%
        if (in_array($item->workflow_status, ['supervisor_approved', 'project_manager_approved', 'pm_approved'])) {
            $stageItems = AcceptanceItem::where('acceptance_stage_id', $item->acceptance_stage_id)
                ->whereNotNull('task_id')->with('task')->get();
            
            $incompleteTasks = [];
            foreach ($stageItems as $si) {
                if ($si->task && $si->task->progress_percentage < 100) {
                    $incompleteTasks[] = $si->task->name ?? "Hạng mục #{$si->id}";
                }
            }
            if (count($incompleteTasks) > 0) {
                throw new \Exception('Không thể duyệt. Các hạng mục sau chưa hoàn thành 100%: ' . implode(', ', $incompleteTasks));
            }
        }
    }

    /**
     * Internal: Determine user's approval level based on permissions
     */
    protected function determineLevelForUser(AcceptanceItem $item, $user): ?int
    {
        // This logic is usually better handled by the controller since it knows the guard (admin vs app)
        // But for ApprovalCenter compatibility, we use common permission constants
        
        $project = $item->acceptanceStage->project;
        
        if ($this->hasPermission($user, \App\Constants\Permissions::ACCEPTANCE_APPROVE_LEVEL_3, $project)) {
            return 3;
        }
        if ($this->hasPermission($user, \App\Constants\Permissions::ACCEPTANCE_APPROVE_LEVEL_2, $project)) {
            return 2;
        }
        if ($this->hasPermission($user, \App\Constants\Permissions::ACCEPTANCE_APPROVE_LEVEL_1, $project)) {
            return 1;
        }

        return null;
    }

    protected function determineLevelForStage(AcceptanceStage $stage, $user): ?int
    {
        $project = $stage->project;
        if ($this->hasPermission($user, \App\Constants\Permissions::ACCEPTANCE_APPROVE_LEVEL_3, $project)) return 3;
        if ($this->hasPermission($user, \App\Constants\Permissions::ACCEPTANCE_APPROVE_LEVEL_2, $project)) return 2;
        if ($this->hasPermission($user, \App\Constants\Permissions::ACCEPTANCE_APPROVE_LEVEL_1, $project)) return 1;
        return null;
    }

    protected function hasPermission($user, string $permission, $project): bool
    {
        // Simple permission check compatibility
        if (method_exists($user, 'hasPermission')) {
            return $user->hasPermission($permission);
        }
        // For Admin users (auth:admin)
        if (method_exists($user, 'can')) {
            return $user->can($permission);
        }
        return false;
    }

    /**
     * Get stages for project with eager loading and business rules (Category A filtering)
     */
    public function getStagesForProject(Project $project): \Illuminate\Support\Collection
    {
        return $project->acceptanceStages()
            ->with([
                'internalApprover',
                'customerApprover',
                'designApprover',
                'ownerApprover',
                'task', 
                'acceptanceTemplate', 
                'defects' => function ($q) {
                    $q->whereIn('status', ['open', 'in_progress']);
                },
                'attachments',
                'items' => function ($q) {
                    // BUSINESS RULE: Show ONLY Category A (parent) items, hide children A' and A''
                    $q->where(function ($query) {
                        $query->whereNull('task_id')
                            ->orWhereHas('task', function ($taskQuery) {
                                $taskQuery->whereNull('parent_id');
                            });
                    })
                    ->orderBy('order')
                    ->with([
                        'attachments',
                        'task',
                        'template.attachments',
                        'submitter',
                        'projectManagerApprover',
                        'customerApprover',
                    ]);
                }
            ])
            ->orderBy('order')
            ->get();
    }

    /**
     * Get items for a stage with business rules (Category A filtering)
     */
    public function getStageItems(AcceptanceStage $stage): \Illuminate\Support\Collection
    {
        return $stage->items()
            ->where(function ($query) {
                // Items without task_id (Category A items)
                $query->whereNull('task_id')
                    // OR items linked to parent tasks (task.parent_id is null)
                    ->orWhereHas('task', function ($taskQuery) {
                        $taskQuery->whereNull('parent_id');
                    });
            })
            ->with([
                'approver',
                'rejector',
                'creator',
                'updater',
                'task',
                'template.attachments',
                'submitter',
                'projectManagerApprover',
                'customerApprover',
                'attachments'
            ])
            ->orderBy('order')
            ->get();
    }

    /**
     * Centralized attachment logic for Stages and Items
     */
    public function attachFiles($model, array $attachmentIds, User $user): array
    {
        $attached = [];
        foreach ($attachmentIds as $attachmentId) {
            $attachment = \App\Models\Attachment::find($attachmentId);
            // Permission check: uploaded by user OR is project manager
            $isManager = (isset($model->project) && $user->id === $model->project->project_manager_id) 
                       || (isset($model->acceptanceStage->project) && $user->id === $model->acceptanceStage->project->project_manager_id);

            if ($attachment && ($attachment->uploaded_by === $user->id || $isManager)) {
                $attachment->update([
                    'attachable_type' => get_class($model),
                    'attachable_id' => $model->id,
                ]);
                $attached[] = $attachment;
            }
        }
        return $attached;
    }

    /**
     * Reorder items within a stage
     */
    public function reorderItems(AcceptanceStage $stage, array $itemsData): void
    {
        DB::transaction(function () use ($stage, $itemsData) {
            foreach ($itemsData as $itemData) {
                AcceptanceItem::where('id', $itemData['id'])
                    ->where('acceptance_stage_id', $stage->id)
                    ->update(['order' => $itemData['order']]);
            }
        });
    }

    /**
     * Legacy approval handler for backward compatibility
     */
    public function approveStageLegacy(AcceptanceStage $stage, string $type, User $user): bool
    {
        return DB::transaction(function () use ($stage, $type, $user) {
            $success = false;
            switch ($type) {
                case 'supervisor':
                    $success = $stage->approveSupervisor($user);
                    break;
                case 'project_manager':
                    $success = $stage->approveProjectManager($user);
                    break;
                case 'customer':
                    $success = $stage->approveCustomer($user);
                    break;
                case 'internal':
                    $success = $stage->approveInternal($user);
                    break;
                case 'design':
                    if ($stage->status === 'customer_approved') {
                        $success = $stage->approveDesign($user);
                    }
                    break;
                case 'owner':
                    if ($stage->has_open_defects) {
                        throw new \Exception('Không thể duyệt vì còn lỗi chưa được khắc phục.');
                    }
                    if ($stage->project->customer_id === $user->id && $stage->status === 'design_approved') {
                        $success = $stage->approveOwner($user);
                    }
                    break;
            }
            return $success;
        });
    }
}
