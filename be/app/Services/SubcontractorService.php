<?php

namespace App\Services;

use App\Models\Subcontractor;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SubcontractorService
{
    /**
     * Create or update a subcontractor
     */
    public function upsert(array $data, ?Subcontractor $subcontractor = null, ?User $user = null): Subcontractor
    {
        return DB::transaction(function () use ($data, $subcontractor, $user) {
            $isNew = !$subcontractor;
            
            if ($isNew) {
                $subcontractor = new Subcontractor();
                $subcontractor->uuid = (string) Str::uuid();
                $subcontractor->project_id = $data['project_id'];
                $subcontractor->created_by = $user ? $user->id : null;
            } else {
                $subcontractor->updated_by = $user ? $user->id : null;
            }

            // Fillable fields
            $fillable = [
                'global_subcontractor_id', 'name', 'category', 'bank_name', 
                'bank_account_number', 'bank_account_name', 'total_quote', 
                'advance_payment', 'progress_start_date', 'progress_end_date',
                'progress_status', 'payment_status', 'payment_schedule'
            ];
            
            foreach ($fillable as $field) {
                if (array_key_exists($field, $data)) {
                    $subcontractor->{$field} = $data[$field];
                }
            }

            $subcontractor->save();

            return $subcontractor->fresh();
        });
    }

    /**
     * Delete a subcontractor
     */
    public function delete(Subcontractor $subcontractor): bool
    {
        return DB::transaction(function () use ($subcontractor) {
            // Soft delete or hard delete depending on model traits
            return $subcontractor->delete();
        });
    }

    /**
     * Approve subcontractor
     */
    public function approve(Subcontractor $subcontractor, ?User $user = null): bool
    {
        return $subcontractor->approve($user);
    }

    /**
     * Revert subcontractor to draft (Hoàn duyệt)
     */
    public function revertToDraft(Subcontractor $subcontractor): bool
    {
        return $subcontractor->update([
            'status' => 'draft',
            'approved_by' => null,
            'approved_at' => null,
        ]);
    }

    /**
     * Recalculate financial data from payments
     */
    public function recalculate(Subcontractor $subcontractor): bool
    {
        return $subcontractor->recalculateFinancials();
    }

    // =========================================================================
    // ACCEPTANCE MANAGEMENT
    // =========================================================================

    /**
     * Get subcontractor acceptances with filtering
     */
    public function getAcceptances(array $filters = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $query = \App\Models\SubcontractorAcceptance::with(['subcontractor', 'project', 'contract', 'accepter']);

        if (!empty($filters['project_id'])) {
            $query->where('project_id', $filters['project_id']);
        }

        if (!empty($filters['subcontractor_id'])) {
            $query->where('subcontractor_id', $filters['subcontractor_id']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->orderByDesc('acceptance_date')->paginate($filters['per_page'] ?? 20);
    }

    /**
     * Create or update acceptance
     */
    public function upsertAcceptance(array $data, ?\App\Models\SubcontractorAcceptance $acceptance = null, ?User $user = null): \App\Models\SubcontractorAcceptance
    {
        return DB::transaction(function () use ($data, $acceptance, $user) {
            if (!$acceptance) {
                $data['created_by'] = $user ? $user->id : null;
                $data['status'] = 'pending';
                $acceptance = \App\Models\SubcontractorAcceptance::create($data);
            } else {
                if (in_array($acceptance->status, ['approved', 'rejected'])) {
                    throw new \Exception('Không thể sửa nghiệm thu đã được duyệt/từ chối.');
                }
                $acceptance->update($data);
            }

            return $acceptance->fresh(['subcontractor', 'project', 'contract']);
        });
    }

    /**
     * Approve acceptance
     */
    public function approveAcceptance(\App\Models\SubcontractorAcceptance $acceptance, User $user, ?string $notes = null): bool
    {
        if ($acceptance->status !== 'pending') {
            throw new \Exception('Chỉ có thể duyệt nghiệm thu ở trạng thái pending.');
        }

        return $acceptance->approve($user, $notes);
    }

    /**
     * Reject acceptance
     */
    public function rejectAcceptance(\App\Models\SubcontractorAcceptance $acceptance, User $user, string $reason): bool
    {
        if ($acceptance->status !== 'pending') {
            throw new \Exception('Chỉ có thể từ chối nghiệm thu ở trạng thái pending.');
        }

        return $acceptance->reject($reason, $user);
    }

    /**
     * Revert acceptance to pending (Hoàn duyệt)
     */
    public function revertAcceptanceToPending(\App\Models\SubcontractorAcceptance $acceptance): bool
    {
        if (!in_array($acceptance->status, ['approved', 'rejected'])) {
            throw new \Exception('Chỉ có thể hoàn duyệt nghiệm thu đã được duyệt hoặc từ chối.');
        }

        return $acceptance->update([
            'status' => 'pending',
            'approved_by' => null,
            'approved_at' => null,
            'rejected_reason' => null,
        ]);
    }

    // =========================================================================
    // PROGRESS TRACKING
    // =========================================================================

    /**
     * Get subcontractor progress reports with filtering
     */
    public function getProgress(array $filters = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $query = \App\Models\SubcontractorProgress::with(['subcontractor', 'project', 'contract', 'reporter', 'verifier']);

        if (!empty($filters['project_id'])) {
            $query->where('project_id', $filters['project_id']);
        }

        if (!empty($filters['subcontractor_id'])) {
            $query->where('subcontractor_id', $filters['subcontractor_id']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['from_date'])) {
            $query->where('progress_date', '>=', $filters['from_date']);
        }

        if (!empty($filters['to_date'])) {
            $query->where('progress_date', '<=', $filters['to_date']);
        }

        return $query->orderByDesc('progress_date')->paginate($filters['per_page'] ?? 20);
    }

    /**
     * Create or update progress report
     */
    public function upsertProgress(array $data, ?\App\Models\SubcontractorProgress $progress = null, ?User $user = null): \App\Models\SubcontractorProgress
    {
        return DB::transaction(function () use ($data, $progress, $user) {
            if (!$progress) {
                $data['reported_by'] = $user ? $user->id : null;
            } else {
                if ($progress->verified_at) {
                    throw new \Exception('Không thể sửa báo cáo tiến độ đã được xác nhận.');
                }
            }

            // Auto-calculate status if not provided
            if (!isset($data['status']) && (isset($data['planned_progress']) || isset($data['actual_progress']))) {
                $planned = $data['planned_progress'] ?? ($progress ? $progress->planned_progress : 0);
                $actual = $data['actual_progress'] ?? ($progress ? $progress->actual_progress : 0);
                $diff = $actual - $planned;
                
                if ($diff >= 5) {
                    $data['status'] = 'ahead_of_schedule';
                } elseif ($diff <= -5) {
                    $data['status'] = 'delayed';
                } else {
                    $data['status'] = 'on_schedule';
                }
            }

            if (!$progress) {
                $progress = \App\Models\SubcontractorProgress::create($data);
            } else {
                $progress->update($data);
            }

            return $progress->fresh(['subcontractor', 'project', 'contract', 'reporter']);
        });
    }

    /**
     * Verify progress report
     */
    public function verifyProgress(\App\Models\SubcontractorProgress $progress, User $user): bool
    {
        if ($progress->verified_at) {
            throw new \Exception('Báo cáo tiến độ đã được xác nhận trước đó.');
        }

        return $progress->verify($user);
    }

    // =========================================================================
    // ITEM MANAGEMENT
    // =========================================================================

    /**
     * Get subcontractor items
     */
    public function getItems(Subcontractor $subcontractor): \Illuminate\Support\Collection
    {
        return $subcontractor->items()->orderBy('order')->get();
    }

    /**
     * Upsert subcontractor item
     */
    public function upsertItem(array $data, Subcontractor $subcontractor, ?\App\Models\SubcontractorItem $item = null): \App\Models\SubcontractorItem
    {
        return DB::transaction(function () use ($data, $subcontractor, $item) {
            if (!$item) {
                if (!isset($data['order'])) {
                    $data['order'] = ($subcontractor->items()->max('order') ?? -1) + 1;
                }
                $data['subcontractor_id'] = $subcontractor->id;
                $item = \App\Models\SubcontractorItem::create($data);
            } else {
                $item->update($data);
            }

            return $item;
        });
    }

    /**
     * Reorder subcontractor items
     */
    public function reorderItems(Subcontractor $subcontractor, array $items): bool
    {
        return DB::transaction(function () use ($subcontractor, $items) {
            foreach ($items as $itemData) {
                \App\Models\SubcontractorItem::where('id', $itemData['id'])
                    ->where('subcontractor_id', $subcontractor->id)
                    ->update(['order' => $itemData['order']]);
            }
            return true;
        });
    }
}
