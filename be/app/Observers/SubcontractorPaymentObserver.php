<?php

namespace App\Observers;

use App\Models\SubcontractorPayment;
use App\Models\Notification;
use App\Services\NotificationService;

class SubcontractorPaymentObserver
{
    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Handle the SubcontractorPayment "updated" event.
     */
    public function updated(SubcontractorPayment $payment): void
    {
        if (!$payment->wasChanged('status')) {
            return;
        }

        $oldStatus = $payment->getOriginal('status');
        $newStatus = $payment->status;
        $projectName = $payment->project ? $payment->project->name : 'N/A';
        $subName = $payment->subcontractor ? $payment->subcontractor->name : 'NTP';
        $amount = number_format($payment->amount) . ' VND';

        // draft → pending_management_approval: Notify BĐH
        if ($oldStatus === 'draft' && $newStatus === 'pending_management_approval') {
            $this->notificationService->sendToPermissionUsers(
                \App\Constants\Permissions::COST_APPROVE_MANAGEMENT,
                $payment->project_id,
                Notification::TYPE_WORKFLOW,
                Notification::CATEGORY_WORKFLOW_APPROVAL,
                "Yêu cầu duyệt phiếu chi thầu phụ",
                "Phiếu chi cho '{$subName}' ({$amount}) trong dự án '{$projectName}' cần BĐH duyệt.",
                [
                    'payment_id' => $payment->id,
                    'project_id' => $payment->project_id,
                    'subcontractor_id' => $payment->subcontractor_id,
                    'amount' => $payment->amount,
                ],
                Notification::PRIORITY_HIGH,
                "/projects/{$payment->project_id}",
                true,
                [$payment->created_by]
            );
        }

        // pending_management → pending_accountant_confirmation: Notify KT
        if ($oldStatus === 'pending_management_approval' && $newStatus === 'pending_accountant_confirmation') {
            $this->notificationService->sendToPermissionUsers(
                \App\Constants\Permissions::COST_APPROVE_ACCOUNTANT,
                $payment->project_id,
                Notification::TYPE_WORKFLOW,
                Notification::CATEGORY_WORKFLOW_APPROVAL,
                "Yêu cầu xác nhận thanh toán thầu phụ",
                "Phiếu chi cho '{$subName}' ({$amount}) đã được BĐH duyệt, cần KT xác nhận thanh toán.",
                [
                    'payment_id' => $payment->id,
                    'project_id' => $payment->project_id,
                    'amount' => $payment->amount,
                ],
                Notification::PRIORITY_HIGH,
                "/projects/{$payment->project_id}",
                true
            );
        }

        // → paid: Notify creator + team
        if ($oldStatus !== 'paid' && $newStatus === 'paid') {
            $this->notificationService->sendToProjectTeam(
                $payment->project_id,
                Notification::TYPE_SYSTEM,
                Notification::CATEGORY_STATUS_CHANGE,
                "Đã thanh toán thầu phụ",
                "Phiếu chi cho '{$subName}' ({$amount}) trong dự án '{$projectName}' đã được thanh toán.",
                [
                    'payment_id' => $payment->id,
                    'project_id' => $payment->project_id,
                ],
                Notification::PRIORITY_MEDIUM,
                "/projects/{$payment->project_id}",
                true
            );
        }

        // → rejected: Notify creator
        if ($oldStatus !== 'rejected' && $newStatus === 'rejected') {
            $reason = $payment->rejection_reason ? " Lý do: {$payment->rejection_reason}" : '';
            
            if ($payment->created_by) {
                $this->notificationService->sendToUser(
                    $payment->created_by,
                    Notification::TYPE_SYSTEM,
                    Notification::CATEGORY_STATUS_CHANGE,
                    "Phiếu chi thầu phụ bị từ chối",
                    "Phiếu chi cho '{$subName}' ({$amount}) trong dự án '{$projectName}' đã bị từ chối.{$reason}",
                    [
                        'payment_id' => $payment->id,
                        'project_id' => $payment->project_id,
                    ],
                    Notification::PRIORITY_HIGH,
                    "/projects/{$payment->project_id}"
                );
            }
        }
    }
}
