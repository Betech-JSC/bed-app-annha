<?php

namespace App\Services;

use App\Models\ProjectPayment;
use App\Models\Notification;
use App\Models\Subcontractor;
use App\Models\SubcontractorPayment;
use App\Models\User;
use App\Models\Project;
use App\Models\Attachment;
use App\Models\Cost;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class FinancialService
{
    /**
     * upsert Project/Company Cost
     */
    public function upsertCost(array $data, ?Cost $cost = null, $user = null): Cost
    {
        return DB::transaction(function () use ($data, $cost, $user) {
            $isNew = !$cost;
            $attachmentIds = $data['attachment_ids'] ?? [];
            unset($data['attachment_ids']);

            Log::info("Upserting Cost. IDs: " . (is_array($attachmentIds) ? implode(',', $attachmentIds) : $attachmentIds));

            if ($isNew) {
                $cost = new Cost();
                $cost->status = $data['status'] ?? 'draft';
                $cost->created_by = $user ? $user->id : null;
            }

            // Standardize cost group & category
            $autoDetect = app(CostGroupAutoDetectService::class);
            if (empty($data['cost_group_id'])) {
                $data['cost_group_id'] = $autoDetect->detectCostGroup($data);
            }
            if (empty($data['category'])) {
                $data['category'] = $autoDetect->detectCategory($data);
            }

            $cost->fill($data);
            $cost->save();

            $morphType = $cost->getMorphClass();
            Log::info("Upserting Cost ID: {$cost->id}, Morph Type: {$morphType}, Attachment IDs: " . (is_array($attachmentIds) ? implode(',', $attachmentIds) : $attachmentIds));

            // Link attachments if provided
            if (!empty($attachmentIds)) {
                $ids = is_array($attachmentIds) ? $attachmentIds : [$attachmentIds];
                
                // Detach existing if any (for updates)
                Attachment::where('attachable_id', $cost->id)
                    ->where(function($q) use ($morphType) {
                        $q->where('attachable_type', $morphType)
                          ->orWhere('attachable_type', 'App\Models\Cost');
                    })
                    ->update(['attachable_type' => null, 'attachable_id' => null]);

                // Attach new ones
                Attachment::whereIn('id', $ids)->update([
                    'attachable_type' => $morphType,
                    'attachable_id' => $cost->id,
                ]);
            }

            return $cost->fresh(['attachments', 'costGroup', 'creator']);
        });
    }

    /**
     * Submit cost for management approval
     */
    public function submitCost(Cost $cost, $user = null): bool
    {
        if ($cost->status !== 'draft') {
            throw new \Exception('Chỉ có thể gửi duyệt chi phí ở trạng thái nháp.');
        }

        // Business Rule: Mandatory attachments
        if ($cost->attachments()->count() === 0) {
            throw new \Exception('Bắt buộc phải upload ít nhất một chứng từ trước khi gửi duyệt.');
        }

        $cost->status = 'pending_management_approval';
        $saved = $cost->save();

        if ($saved) {
            $cost->notifyEvent('submitted', $user);
        }

        return $saved;
    }

    /**
     * Management Approval (Stage 1)
     */
    public function approveCostByManagement(Cost $cost, $user = null): bool
    {
        if ($cost->status !== 'pending_management_approval') {
            throw new \Exception('Chi phí không ở trạng thái chờ Ban điều hành duyệt.');
        }

        $cost->status = 'pending_accountant_approval';
        
        // If actor is from users table, record the ID
        if ($user instanceof User) {
            $cost->management_approved_by = $user->id;
        }
        $cost->management_approved_at = now();
        
        $saved = $cost->save();

        if ($saved) {
            $cost->notifyEvent('approved_management', $user);
        }

        return $saved;
    }

    /**
     * Accountant Confirmation (Final Stage)
     */
    public function approveCostByAccountant(Cost $cost, array $data = [], $user = null): bool
    {
        if ($cost->status !== 'pending_accountant_approval') {
            throw new \Exception('Chi phí không ở trạng thái chờ Kế toán xác nhận.');
        }

        if ($cost->attachments()->count() === 0) {
            throw new \Exception('Bắt buộc phải có ít nhất một chứng từ trước khi Kế toán duyệt.');
        }

        return DB::transaction(function () use ($cost, $data, $user) {
            // Optional: attach more files during confirmation
            if (!empty($data['attachment_ids'])) {
                Attachment::whereIn('id', $data['attachment_ids'])->update([
                    'attachable_type' => Cost::class,
                    'attachable_id' => $cost->id,
                ]);
            }

            $cost->status = 'approved';
            
            if ($user instanceof User) {
                $cost->accountant_approved_by = $user->id;
            }
            $cost->accountant_approved_at = now();
            
            $saved = $cost->save();

            if ($saved) {
                // Side effects: recalculate subcontractor, sync budget, create material transactions
                $cost->triggerApprovalSideEffects();
                $cost->notifyEvent('approved_accountant', $user);
            }

            return $saved;
        });
    }

    /**
     * Reject Cost
     */
    public function rejectCost(Cost $cost, string $reason, $user = null): bool
    {
        if (!in_array($cost->status, ['pending_management_approval', 'pending_accountant_approval'])) {
            throw new \Exception('Chỉ có thể từ chối chi phí đang chờ duyệt.');
        }

        $cost->status = 'rejected';
        $cost->rejected_reason = $reason;
        
        // Track who rejected based on phase
        if ($cost->status === 'pending_management_approval') {
            if ($user instanceof User) {
                $cost->management_approved_by = $user->id;
            }
            $cost->management_approved_at = now();
        } else {
            if ($user instanceof User) {
                $cost->accountant_approved_by = $user->id;
            }
            $cost->accountant_approved_at = now();
        }

        $saved = $cost->save();

        if ($saved) {
            $cost->notifyEvent('rejected', $user, ['reason' => $reason]);
        }

        return $saved;
    }

    /**
     * Revert Cost to Draft (Hoàn duyệt)
     * Allowed for costs in pending approval stages
     */
    public function revertCostToDraft(Cost $cost, $user = null): bool
    {
        $revertibleStatuses = ['pending_management_approval', 'pending_accountant_approval', 'approved', 'rejected'];
        if (!in_array($cost->status, $revertibleStatuses)) {
            throw new \Exception('Chỉ có thể hoàn duyệt chi phí đang chờ duyệt, đã duyệt hoặc đã bị từ chối.');
        }

        $cost->status = 'draft';
        $cost->management_approved_by = null;
        $cost->management_approved_at = null;
        $cost->accountant_approved_by = null;
        $cost->accountant_approved_at = null;
        
        $saved = $cost->save();

        if ($saved) {
            $cost->notifyEvent('reverted_to_draft', $user);
        }

        return $saved;
    }

    /**
     * upsert Subcontractor Payment
     */
    public function upsertSubPayment(array $data, ?SubcontractorPayment $payment = null, $user = null): SubcontractorPayment
    {
        return DB::transaction(function () use ($data, $payment, $user) {
            $isNew = !$payment;
            $attachmentIds = $data['attachment_ids'] ?? [];
            unset($data['attachment_ids']);

            $sub = Subcontractor::findOrFail($data['subcontractor_id']);

            // Balance Validation
            $pendingPaymentsTotal = $sub->payments()
                ->whereNotIn('status', ['rejected', 'cancelled', 'paid'])
                ->when($payment, fn($q) => $q->where('id', '!=', $payment->id))
                ->sum('amount');
            
            $remaining = (float)$sub->total_quote - (float)$sub->total_paid - (float)$pendingPaymentsTotal;
            
            if ((float)$data['amount'] > $remaining) {
                throw new \Exception('Số tiền thanh toán vượt quá số tiền còn lại (' . number_format(max(0, $remaining)) . ').');
            }

            if ($isNew) {
                $payment = new SubcontractorPayment();
                $payment->status = $data['status'] ?? 'draft';
                $payment->created_by = $user ? $user->id : null;
                $payment->uuid = (string) Str::uuid();
                $payment->payment_number = 'PT-' . date('Ymd') . '-' . strtoupper(Str::random(6));
            }

            $payment->fill($data);
            $payment->save();

            // Link attachments
            if (!empty($attachmentIds)) {
                Attachment::whereIn('id', $attachmentIds)->update([
                    'attachable_type' => SubcontractorPayment::class,
                    'attachable_id' => $payment->id,
                ]);
            }

            return $payment->fresh(['subcontractor', 'attachments', 'creator']);
        });
    }

    /**
     * Submit Sub Payment for Management Approval
     */
    public function submitSubPayment(SubcontractorPayment $payment, $user = null): bool
    {
        if ($payment->status !== 'draft') {
            throw new \Exception('Chỉ có thể gửi duyệt phiếu ở trạng thái nháp.');
        }

        $payment->status = 'pending_management_approval';
        $saved = $payment->save();

        if ($saved) {
            $payment->notifyEvent('submitted', $user);
        }

        return $saved;
    }

    /**
     * Management Approval for Sub Payment
     */
    public function approveSubPayment(SubcontractorPayment $payment, $user = null): bool
    {
        if ($payment->status !== 'pending_management_approval') {
            throw new \Exception('Phiếu thanh toán không ở trạng thái chờ duyệt.');
        }

        if ($user instanceof User) {
            $payment->approved_by = $user->id;
        }
        $payment->approved_at = now();
        $payment->status = 'pending_accountant_confirmation';
        
        $saved = $payment->save();

        if ($saved) {
            $payment->notifyEvent('approved_management', $user);
        }

        return $saved;
    }

    /**
     * Final Processing / Payment confirmation
     */
    public function processSubPayment(SubcontractorPayment $payment, array $data = [], $user = null): bool
    {
        if ($payment->status !== 'pending_accountant_confirmation') {
            throw new \Exception('Phiếu thanh toán chưa được duyệt bởi Ban điều hành.');
        }

        if ($payment->attachments()->count() === 0) {
            throw new \Exception('Bắt buộc phải có ít nhất một chứng từ trước khi Kế toán duyệt.');
        }

        return DB::transaction(function () use ($payment, $data, $user) {
            $payment->status = 'paid';
            if ($user instanceof User) {
                $payment->paid_by = $user->id;
            }
            $payment->paid_at = now();
            
            $saved = $payment->save();

            if ($saved) {
                // High importance side effects: recalculate subcontractor financials
                if ($payment->subcontractor) {
                    // Record payment in subcontractor directly
                    $payment->subcontractor->recordPayment($payment->amount);
                    // Single source of truth recalculation
                    $payment->subcontractor->recalculateFinancials();
                }
                
                $payment->notifyEvent('paid', $user);
            }

            return $saved;
        });
    }

    /**
     * Reject Sub Payment
     */
    public function confirmSubPayment(SubcontractorPayment $payment, $user = null): bool
    {
        return $this->processSubPayment($payment, [], $user);
    }

    public function rejectSubPayment(SubcontractorPayment $payment, string $reason, $user = null): bool
    {
        if (!in_array($payment->status, ['pending_management_approval', 'pending_accountant_confirmation'])) {
            throw new \Exception('Chỉ có thể từ chối phiếu đang chờ duyệt.');
        }

        $payment->status = 'rejected';
        $payment->rejection_reason = $reason;
        
        if ($user instanceof User) {
            $payment->rejected_by = $user->id;
        }
        $payment->rejected_at = now();

        $saved = $payment->save();

        if ($saved) {
            $payment->notifyEvent('rejected', $user, ['reason' => $reason]);
        }

        return $saved;
    }

    /**
     * Revert Subcontractor Payment to Draft (Hoàn duyệt)
     */
    public function revertSubPaymentToDraft(SubcontractorPayment $payment, $user = null): bool
    {
        $revertibleStatuses = ['pending_management_approval', 'pending_accountant_confirmation', 'paid', 'rejected'];
        if (!in_array($payment->status, $revertibleStatuses)) {
            throw new \Exception('Chỉ có thể hoàn duyệt phiếu đang chờ duyệt, đã thanh toán hoặc bị từ chối.');
        }

        $payment->status = 'draft';
        $payment->approved_by = null;
        $payment->approved_at = null;
        
        $saved = $payment->save();

        if ($saved) {
            $payment->notifyEvent('reverted_to_draft', $user);
        }

        return $saved;
    }

    // ==================================================================
    // PROJECT PAYMENTS (CUSTOMER REVENUE)
    // ==================================================================

    /**
     * Create or update project payment
     */
    public function upsertProjectPayment(array $data, ?ProjectPayment $payment = null, $user = null): ProjectPayment
    {
        return DB::transaction(function () use ($data, $payment, $user) {
            $isNew = !$payment;
            $attachmentIds = $data['attachment_ids'] ?? [];
            unset($data['attachment_ids']);

            if ($isNew) {
                $payment = new ProjectPayment();
                $payment->uuid = (string) Str::uuid();
                $payment->status = $data['status'] ?? 'draft';
            }

            $fillable = [
                'project_id', 'contract_id', 'payment_number', 'amount', 
                'notes', 'due_date', 'paid_date', 'status', 'actual_amount'
            ];

            foreach ($fillable as $field) {
                if (array_key_exists($field, $data)) {
                    $payment->{$field} = $data[$field];
                }
            }

            $payment->save();

            // Link attachments
            if (!empty($attachmentIds)) {
                Attachment::whereIn('id', $attachmentIds)->update([
                    'attachable_type' => ProjectPayment::class,
                    'attachable_id' => $payment->id,
                ]);
            }

            // Notify customer users when a new payment is created
            if ($isNew && $payment->project_id) {
                try {
                    app(\App\Services\NotificationService::class)->sendToPermissionUsers(
                        \App\Constants\Permissions::PAYMENT_APPROVE,
                        $payment->project_id,
                        Notification::TYPE_WORKFLOW,
                        Notification::CATEGORY_WORKFLOW_APPROVAL,
                        'Đợt thanh toán mới cần xử lý',
                        "Đợt thanh toán #{$payment->payment_number} vừa được tạo, cần bạn xem xét và xác nhận.",
                        ['item_type' => 'payment', 'item_id' => $payment->id, 'project_id' => $payment->project_id],
                        Notification::PRIORITY_HIGH,
                        '/approvals'
                    );
                } catch (\Throwable $e) {
                    Log::error('FinancialService: Failed to send payment creation notification: ' . $e->getMessage());
                }
            }

            return $payment->fresh(['project', 'contract', 'attachments']);
        });
    }

    /**
     * Staff submits a payment request to the customer
     */
    public function submitProjectPayment(ProjectPayment $payment, $user = null): bool
    {
        $submitted = $payment->submit();
        if ($submitted) {
            // Trigger notifications or other side effects
            // $payment->notifyEvent('submitted', $user);
        }
        return $submitted;
    }

    /**
     * Delete project payment
     */
    public function deleteProjectPayment(ProjectPayment $payment): bool
    {
        return $payment->delete();
    }

    /**
     * Approve project payment by customer
     */
    public function approveProjectPaymentByCustomer(ProjectPayment $payment, ?User $user = null): bool
    {
        return $payment->approveByCustomer($user);
    }

    /**
     * Accountant confirmation of project payment
     */
    public function confirmProjectPayment(ProjectPayment $payment, ?User $user = null): bool
    {
        return $payment->markAsPaid($user);
    }

    /**
     * Reject project payment (reset to pending)
     */
    public function rejectProjectPayment(ProjectPayment $payment, string $reason, ?User $user = null): bool
    {
        $payment->status = 'draft';
        $payment->notes = ($payment->notes ? $payment->notes . "\n\n" : '') . 
            ($user ? "Kế toán từ chối - Lý do: " : "KH từ chối — Lý do: ") . $reason;
        
        return $payment->save();
    }

    /**
     * Revert project payment to draft (Hoàn duyệt)
     */
    public function revertProjectPaymentToDraft(ProjectPayment $payment, ?User $user = null): bool
    {
        // Revertible if approved, customer_paid or confirmed
        $revertibleStatuses = ['customer_approved', 'customer_paid', 'confirmed', 'paid'];
        if (!in_array($payment->status, $revertibleStatuses)) {
            throw new \Exception('Chỉ có thể hoàn duyệt thanh toán đã được KH duyệt, đã trả hoặc đã xác nhận.');
        }

        $payment->status = 'draft';
        // Clear approval/paid metadata
        $payment->paid_date = null;
        $payment->actual_amount = null;
        
        return $payment->save();
    }

    /**
     * Upload and attach payment proof for project payment
     */
    public function attachPaymentProof(ProjectPayment $payment, array $attachmentIds, User $user): array
    {
        return DB::transaction(function () use ($payment, $attachmentIds, $user) {
            $attached = [];
            foreach ($attachmentIds as $attachmentId) {
                $attachment = Attachment::find($attachmentId);
                if ($attachment && ($attachment->uploaded_by === $user->id || $user->hasPermission(\App\Constants\Permissions::SETTINGS_MANAGE))) {
                    $attachment->update([
                        'attachable_type' => ProjectPayment::class,
                        'attachable_id' => $payment->id,
                    ]);
                    $attached[] = $attachment;
                }
            }

            if (count($attached) > 0) {
                $payment->markPaymentProofUploaded();
                
                // Trigger notification
                if ($payment->project && $payment->project->customer_id) {
                    app(NotificationService::class)->sendToUser(
                        $payment->project->customer_id,
                        \App\Models\Notification::TYPE_WORKFLOW,
                        \App\Models\Notification::CATEGORY_WORKFLOW_APPROVAL,
                        "Yêu cầu duyệt thanh toán",
                        "Bạn có một yêu cầu duyệt hình ảnh thanh toán cho đợt #{$payment->payment_number} của dự án '{$payment->project->name}'.",
                        [
                            'project_id' => $payment->project->id,
                            'payment_id' => $payment->id,
                        ],
                        \App\Models\Notification::PRIORITY_HIGH,
                        "/projects/{$payment->project->id}/payments"
                    );
                }
            }

            return $attached;
        });
    }

    /**
     * Customer marks a payment as paid
     */
    public function customerMarkAsPaid(ProjectPayment $payment, array $data, User $user): bool
    {
        if (!in_array($payment->status, ['customer_pending_approval', 'customer_approved'])) {
            throw new \Exception('Chỉ có thể đánh dấu đã thanh toán khi yêu cầu thanh toán đang chờ duyệt hoặc đã được duyệt.');
        }

        return DB::transaction(function () use ($payment, $data, $user) {
            // Attach files if provided
            if (!empty($data['attachment_ids'])) {
                foreach ($data['attachment_ids'] as $attachmentId) {
                    $attachment = Attachment::find($attachmentId);
                    if ($attachment && ($attachment->uploaded_by === $user->id || $user->hasPermission(\App\Constants\Permissions::SETTINGS_MANAGE))) {
                        $attachment->update([
                            'attachable_type' => ProjectPayment::class,
                            'attachable_id' => $payment->id,
                        ]);
                    }
                }
            }

            // Mark as paid with optional details
            $payment->markAsPaidByCustomer(
                $user,
                $data['paid_date'] ?? null,
                $data['actual_amount'] ?? null
            );

            // Notify accountant
            app(NotificationService::class)->sendToPermissionUsers(
                \App\Constants\Permissions::PAYMENT_CONFIRM,
                $payment->project_id,
                \App\Models\Notification::TYPE_WORKFLOW,
                \App\Models\Notification::CATEGORY_WORKFLOW_APPROVAL,
                "Khách hàng đã thanh toán",
                "Khách hàng đã đánh dấu thanh toán và upload chứng từ cho đợt #{$payment->payment_number} của dự án '{$payment->project->name}'.",
                [
                    'project_id' => $payment->project_id,
                    'payment_id' => $payment->id,
                ],
                \App\Models\Notification::PRIORITY_HIGH,
                "/projects/{$payment->project_id}/payments"
            );

            return true;
        });
    }
}
