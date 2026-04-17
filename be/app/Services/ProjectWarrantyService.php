<?php

namespace App\Services;

use App\Models\ProjectWarranty;
use App\Models\ProjectMaintenance;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ProjectWarrantyService
{
    /**
     * Create or update a project warranty record.
     */
    public function upsertWarranty(array $data, ?ProjectWarranty $warranty = null, ?User $actor = null): ProjectWarranty
    {
        return DB::transaction(function () use ($data, $warranty, $actor) {
            $payload = [
                'project_id' => $data['project_id'],
                'handover_date' => $data['handover_date'],
                'warranty_content' => $data['warranty_content'],
                'warranty_start_date' => $data['warranty_start_date'],
                'warranty_end_date' => $data['warranty_end_date'],
                'notes' => $data['notes'] ?? null,
            ];

            if (!$warranty) {
                $payload['created_by'] = $actor->id ?? null;
                $payload['status'] = $data['status'] ?? ProjectWarranty::STATUS_DRAFT;
                $warranty = ProjectWarranty::create($payload);
            } else {
                if (isset($data['status'])) {
                    $payload['status'] = $data['status'];
                }
                $warranty->update($payload);
            }

            return $warranty->fresh(['attachments', 'creator', 'approver']);
        });
    }

    /**
     * Create or update a project maintenance record.
     */
    public function upsertMaintenance(array $data, ?ProjectMaintenance $maintenance = null, ?User $actor = null): ProjectMaintenance
    {
        return DB::transaction(function () use ($data, $maintenance, $actor) {
            // BUSINESS RULE: next_maintenance_date is usually 6 months after maintenance_date if not provided
            $maintenanceDate = Carbon::parse($data['maintenance_date']);
            $nextDate = isset($data['next_maintenance_date']) 
                ? Carbon::parse($data['next_maintenance_date']) 
                : $maintenanceDate->copy()->addMonths(6);

            $payload = [
                'project_id' => $data['project_id'],
                'maintenance_date' => $data['maintenance_date'],
                'next_maintenance_date' => $nextDate,
                'notes' => $data['notes'] ?? null,
            ];

            if (!$maintenance) {
                $payload['created_by'] = $actor->id ?? null;
                $payload['status'] = $data['status'] ?? ProjectMaintenance::STATUS_DRAFT;
                $maintenance = ProjectMaintenance::create($payload);
            } else {
                if (isset($data['status'])) {
                    $payload['status'] = $data['status'];
                }
                $maintenance->update($payload);
            }

            return $maintenance->fresh(['attachments', 'creator', 'approver']);
        });
    }

    /**
     * Standard status update for Warranty/Maintenance with state validation.
     */
    public function updateStatus($entity, string $status, User $actor): bool
    {
        $oldStatus = $entity->status;

        // Basic state validation
        if ($status === 'pending_customer' && $oldStatus !== 'draft') {
            throw new \Exception('Chỉ có thể gửi duyệt phiếu ở trạng thái nháp.');
        }

        if ($status === 'approved' && $oldStatus !== 'pending_customer') {
            throw new \Exception('Chỉ có thể duyệt khi phiếu đang ở trạng thái chờ khách hàng.');
        }

        $update = ['status' => $status];

        if ($status === 'approved') {
            $update['approved_by'] = $actor->id;
            $update['approved_at'] = now();
        }

        return $entity->update($update);
    }

    /**
     * Reject a record with business validation.
     */
    public function reject($entity, User $actor, ?string $reason = null): bool
    {
        if ($entity->status !== 'pending_customer') {
            throw new \Exception('Chỉ có thể từ chối phiếu đang chờ duyệt.');
        }

        return $entity->update([
            'status' => 'rejected',
            'notes' => $reason ? ($entity->notes . "\nLý do từ chối: " . $reason) : $entity->notes,
        ]);
    }

    /**
     * Revert record to draft.
     */
    public function revertToDraft($entity, $actor = null): bool
    {
        $revertibleStatuses = ['pending_customer', 'approved', 'rejected'];
        if (!in_array($entity->status, $revertibleStatuses)) {
            throw new \Exception('Trạng thái hiện tại không thể hoàn duyệt.');
        }

        return $entity->update([
            'status' => 'draft',
            'approved_by' => null,
            'approved_at' => null,
        ]);
    }
}
