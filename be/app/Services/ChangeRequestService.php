<?php

namespace App\Services;

use App\Models\ChangeRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ChangeRequestService
{
    /**
     * Create or update a change request
     */
    public function upsert(array $data, ?ChangeRequest $cr = null, $user = null): ChangeRequest
    {
        return DB::transaction(function () use ($data, $cr, $user) {
            $isNew = !$cr;
            
            if ($isNew) {
                $cr = new ChangeRequest();
                $cr->status = 'draft';
                $cr->requested_by = $user ? $user->id : null;
                $cr->uuid = (string) Str::uuid();
            }

            $cr->fill($data);
            $cr->save();

            return $cr->fresh(['requester', 'reviewer', 'approver']);
        });
    }

    /**
     * Submit for review
     */
    public function submit(ChangeRequest $cr, $user = null): bool
    {
        if ($cr->status !== 'draft') {
            throw new \Exception('Chỉ có thể gửi yêu cầu ở trạng thái nháp.');
        }

        $success = $cr->submit();
        
        if ($success) {
            // Placeholder: Add notification logic here if needed
        }

        return $success;
    }

    /**
     * Approve change request
     */
    public function approve(ChangeRequest $cr, $user = null, ?string $notes = null): bool
    {
        if (!in_array($cr->status, ['submitted', 'under_review'])) {
            throw new \Exception('Yêu cầu không ở trạng thái chờ duyệt.');
        }

        $success = $cr->approve($user, $notes);

        if ($success) {
            // Placeholder: Add notification or side effects here
        }

        return $success;
    }

    /**
     * Reject change request
     */
    public function reject(ChangeRequest $cr, $user = null, string $reason): bool
    {
        if (!in_array($cr->status, ['submitted', 'under_review'])) {
            throw new \Exception('Yêu cầu không ở trạng thái chờ duyệt.');
        }

        $success = $cr->reject($user, $reason);

        if ($success) {
            // Placeholder: Add notification logic
        }

        return $success;
    }

    /**
     * Mark as implemented
     */
    public function markAsImplemented(ChangeRequest $cr): bool
    {
        if ($cr->status !== 'approved') {
            throw new \Exception('Chỉ có thể đánh dấu đã triển khai cho các yêu cầu đã được duyệt.');
        }

        return $cr->markAsImplemented();
    }

    /**
     * Revert to Draft.
     */
    public function revertToDraft(ChangeRequest $cr, $user = null): bool
    {
        $revertibleStatuses = ['submitted', 'under_review', 'approved', 'rejected'];
        if (!in_array($cr->status, $revertibleStatuses)) {
            throw new \Exception('Trạng thái hiện tại không thể hoàn duyệt.');
        }

        return $cr->update([
            'status' => 'draft',
            'reviewed_by' => null,
            'reviewed_at' => null,
            'approved_by' => null,
            'approved_at' => null,
        ]);
    }
}
