<?php

namespace App\Services;

use App\Models\Equipment;
use App\Models\EquipmentRental;
use App\Models\EquipmentPurchase;
use App\Models\EquipmentPurchaseItem;
use App\Models\EquipmentAllocation;
use App\Models\AssetUsage;
use App\Models\Attachment;
use App\Models\Cost;
use App\Models\CostGroup;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class EquipmentService
{
    /**
     * Create or update equipment with unified logic.
     */
    public function upsert(array $data, ?Equipment $equipment = null, $user = null): Equipment
    {
        $id = $equipment ? $equipment->id : null;

        // Unified validation rules
        $rules = [
            'name'           => $id ? 'sometimes|required|string|max:255' : 'required|string|max:255',
            'code'           => ['nullable', 'string', 'max:50', Rule::unique('equipment', 'code')->ignore($id)],
            'category'       => 'nullable|string|max:100',
            'type'           => 'nullable|string|max:100',
            'brand'          => 'nullable|string|max:100',
            'model'          => 'nullable|string|max:100',
            'serial_number'  => 'nullable|string|max:100',
            'quantity'       => 'nullable|integer|min:1',
            'purchase_price' => 'nullable|numeric|min:0',
            'unit'           => 'nullable|string|max:50',
            'notes'          => 'nullable|string',
        ];

        $validator = Validator::make($data, $rules);
        if ($validator->fails()) {
            throw new \Illuminate\Validation\ValidationException($validator);
        }

        return DB::transaction(function () use ($data, $equipment, $id, $user) {
            if (!$equipment) {
                $data['status'] = 'draft';
                $data['created_by'] = $user ? $user->id : null;
                $equipment = Equipment::create($data);
            } else {
                // Block update if not in draft/rejected
                if (!in_array($equipment->status, ['draft', 'rejected'])) {
                    throw new \Exception('Chỉ có thể chỉnh sửa thiết bị ở trạng thái Nháp hoặc Từ chối.');
                }
                $equipment->update($data);
            }

            // Handle attachment_ids linkage
            if (isset($data['attachment_ids'])) {
                $attachmentIds = is_array($data['attachment_ids']) 
                    ? $data['attachment_ids'] 
                    : explode(',', $data['attachment_ids']);
                
                Attachment::whereIn('id', $attachmentIds)->update([
                    'attachable_id'   => $equipment->id,
                    'attachable_type' => Equipment::class
                ]);
            }

            return $equipment;
        });
    }

    /**
     * Delete equipment with safety checks.
     */
    public function delete(Equipment $equipment): bool
    {
        if ($equipment->status !== 'draft') {
            throw new \Exception('Chỉ có thể xóa thiết bị ở trạng thái Nháp.');
        }

        // Check for active allocations (from ApiController logic)
        if ($equipment->allocations()->where('status', 'active')->count() > 0) {
            throw new \Exception('Không thể xóa thiết bị đang được sử dụng.');
        }

        return $equipment->delete();
    }

    /**
     * Sync state to Project Cost.
     */
    public function syncCost(Equipment $equipment)
    {
        $costStatus = match ($equipment->status) {
            'pending_management' => 'pending_management_approval',
            'pending_accountant' => 'pending_accountant_approval',
            'available'          => 'approved',
            'rejected'           => 'rejected',
            default              => 'draft',
        };

        $cost = Cost::where('equipment_id', $equipment->id)->first();

        // Auto-create Cost record if it doesn't exist but has moved past draft
        if (!$cost && in_array($equipment->status, ['pending_management', 'pending_accountant', 'available', 'rejected'])) {
            $cost = Cost::create([
                'equipment_id'     => $equipment->id,
                'project_id'       => $equipment->project_id,
                'name'             => "Mua thiết bị: " . $equipment->name,
                'amount'           => ($equipment->purchase_price ?: 0) * ($equipment->quantity ?: 1),
                'cost_group_id'    => 3, // Thiết bị máy móc (Hardcoded in original code)
                'cost_date'        => $equipment->purchase_date ?: now(),
                'description'      => "Duyệt mua từ Hồ sơ thiết bị " . ($equipment->code ? "#".$equipment->code : "(ID: ".$equipment->id.")"),
                'quantity'         => $equipment->quantity ?: 1,
                'unit'             => $equipment->unit ?: 'cái',
                'expense_category' => 'capex',
                'status'           => $costStatus,
                'created_by'       => $equipment->created_by ?: 1, 
            ]);
        }

        if ($cost) {
            $updateData = ['status' => $costStatus];
            
            if (in_array($equipment->status, ['pending_accountant', 'available'])) {
                $updateData['management_approved_by'] = $equipment->approved_by;
                $updateData['management_approved_at'] = $equipment->approved_at;
            }

            if ($equipment->status === 'available') {
                $updateData['accountant_approved_by'] = $equipment->confirmed_by;
                $updateData['accountant_approved_at'] = $equipment->confirmed_at;
            }

            if ($equipment->status === 'rejected') {
                $updateData['rejected_reason'] = $equipment->rejection_reason;
            }

            $cost->update($updateData);
        }
        
        return $cost;
    }

    // =========================================================================
    // EQUIPMENT RENTAL LIFECYCLE
    // =========================================================================

    /**
     * Create or update equipment rental.
     */
    public function upsertRental(array $data, ?EquipmentRental $rental = null, $user = null): EquipmentRental
    {
        return DB::transaction(function () use ($data, $rental, $user) {
            if (!$rental) {
                $data['status'] = 'draft';
                $data['created_by'] = $user ? $user->id : null;
                $rental = EquipmentRental::create($data);
            } else {
                if (!in_array($rental->status, ['draft', 'rejected'])) {
                    throw new \Exception('Chất lượng chỉ có thể chỉnh sửa phiếu thuê ở trạng thái Nháp hoặc Từ chối.');
                }
                $rental->update($data);
            }

            // Sync with Cost table logic (handled by Model saved hook, but we ensure data integrity here)
            if ($rental->cost_id) {
                // Specific updates if manually created cost exists
                $rental->syncToCostTable();
            }

            // Attachment handling
            if (isset($data['attachment_ids'])) {
                $this->linkAttachments($rental, $data['attachment_ids']);
            }

            return $rental;
        });
    }

    public function submitRental(EquipmentRental $rental): bool
    {
        if (!in_array($rental->status, ['draft', 'rejected'])) {
            throw new \Exception('Phiếu không ở trạng thái hợp lệ để gửi duyệt.');
        }

        return $rental->update([
            'status' => 'pending_management',
            'rejection_reason' => null
        ]);
    }

    public function approveRentalByManagement(EquipmentRental $rental, User $user): bool
    {
        return $rental->approveByManagement($user);
    }

    public function confirmRentalByAccountant(EquipmentRental $rental, User $user): bool
    {
        return $rental->confirmByAccountant($user);
    }

    public function rejectRental(EquipmentRental $rental, string $reason, User $user): bool
    {
        return $rental->reject($user, $reason);
    }

    public function requestReturnRental(EquipmentRental $rental): bool
    {
        if ($rental->status !== 'in_use') {
            throw new \Exception('Phiếu thuê không ở trạng thái đang sử dụng.');
        }
        return $rental->update(['status' => 'pending_return']);
    }

    public function confirmReturnRental(EquipmentRental $rental, User $user): bool
    {
        return $rental->confirmReturn($user);
    }

    // =========================================================================
    // EQUIPMENT PURCHASE LIFECYCLE
    // =========================================================================

    /**
     * Create or update equipment purchase.
     */
    public function upsertPurchase(array $data, ?EquipmentPurchase $purchase = null, $user = null): EquipmentPurchase
    {
        return DB::transaction(function () use ($data, $purchase, $user) {
            if (!$purchase) {
                $data['status'] = 'draft';
                $data['created_by'] = $user ? $user->id : null;
                $purchase = EquipmentPurchase::create($data);
            } else {
                if (!in_array($purchase->status, ['draft', 'rejected'])) {
                    throw new \Exception('Chỉ có thể chỉnh sửa phiếu mua ở trạng thái Nháp hoặc Từ chối.');
                }
                $purchase->update($data);
            }

            // Sync Items
            if (isset($data['items']) && is_array($data['items'])) {
                $purchase->items()->delete();
                foreach ($data['items'] as $itemData) {
                    $purchase->items()->create($itemData);
                }
                $purchase->recalculateTotal();
            }

            // Attachment handling
            if (isset($data['attachment_ids'])) {
                $this->linkAttachments($purchase, $data['attachment_ids']);
            }

            return $purchase;
        });
    }

    public function submitPurchase(EquipmentPurchase $purchase): bool
    {
        if (!in_array($purchase->status, ['draft', 'rejected'])) {
            throw new \Exception('Phiếu không ở trạng thái hợp lệ để gửi duyệt.');
        }

        return $purchase->update([
            'status' => 'pending_management',
            'rejection_reason' => null
        ]);
    }

    public function approvePurchaseByManagement(EquipmentPurchase $purchase, User $user): bool
    {
        if ($purchase->status !== 'pending_management') return false;
        
        return $purchase->update([
            'status'      => 'pending_accountant',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);
    }

    public function confirmPurchaseByAccountant(EquipmentPurchase $purchase, User $user): bool
    {
        if ($purchase->status !== 'pending_accountant') return false;

        return DB::transaction(function () use ($purchase, $user) {
            $purchase->update([
                'status'       => 'completed',
                'confirmed_by' => $user->id,
                'confirmed_at' => now(),
            ]);

            // Side-effect: Create Inventory entries
            foreach ($purchase->items as $item) {
                Equipment::create([
                    'name'            => $item->name,
                    'code'            => $item->code ?? ('EP-' . strtoupper(Str::random(6))),
                    'category'        => 'purchased',
                    'quantity'        => $item->quantity,
                    'purchase_price'  => $item->unit_price * $item->quantity,
                    'current_value'   => $item->unit_price * $item->quantity,
                    'status'          => 'available',
                    'notes'           => "Nhập từ phiếu mua #{$purchase->id} - DA: " . ($purchase->project->name ?? 'N/A'),
                    'project_id'      => $purchase->project_id,
                    'purchase_date'   => now()->toDateString(),
                ]);
            }

            return true;
        });
    }

    public function rejectPurchase(EquipmentPurchase $purchase, string $reason, User $user): bool
    {
        if (!in_array($purchase->status, ['pending_management', 'pending_accountant'])) return false;

        return $purchase->update([
            'status'           => 'rejected',
            'rejection_reason' => $reason,
            'approved_by'      => $user->id,
            'approved_at'      => now(),
        ]);
    }

    // =========================================================================
    // ALLOCATION & USAGE
    // =========================================================================

    public function upsertAllocation(array $data, ?EquipmentAllocation $allocation = null, $user = null): EquipmentAllocation
    {
        return DB::transaction(function () use ($data, $allocation, $user) {
            if (!$allocation) {
                $data['status'] = 'active';
                $data['created_by'] = $user ? $user->id : null;
                $allocation = EquipmentAllocation::create($data);
            } else {
                $allocation->update($data);
            }

            // Status sync for linked equipment
            $equipment = $allocation->equipment;
            if ($equipment && $equipment->status === 'available') {
                $equipment->update(['status' => 'in_use']);
            }

            // Sync cost if rental
            if ($allocation->allocation_type === 'rent') {
                app(EquipmentAllocationService::class)->createCostFromRental($allocation);
            }

            return $allocation;
        });
    }

    public function returnAllocation(EquipmentAllocation $allocation): bool
    {
        return DB::transaction(function () use ($allocation) {
            $allocation->update([
                'status' => 'returned',
                'return_date' => now()->toDateString(),
            ]);

            // Check if equipment has other active allocations
            $otherActive = EquipmentAllocation::where('equipment_id', $allocation->equipment_id)
                ->where('id', '!=', $allocation->id)
                ->where('status', 'active')
                ->exists();

            if (!$otherActive) {
                $allocation->equipment->update(['status' => 'available']);
            }

            return true;
        });
    }

    public function upsertUsage(array $data, ?AssetUsage $usage = null, $user = null): AssetUsage
    {
        return DB::transaction(function () use ($data, $usage, $user) {
            if (!$usage) {
                $data['status'] = 'draft';
                $data['created_by'] = $user ? $user->id : null;
                $usage = AssetUsage::create($data);
            } else {
                if (!in_array($usage->status, ['draft', 'rejected'])) {
                    throw new \Exception('Chỉ có thể chỉnh sửa phiếu mượn ở trạng thái Nháp hoặc Từ chối.');
                }
                $usage->update($data);
            }

            if (isset($data['attachment_ids'])) {
                $this->linkAttachments($usage, $data['attachment_ids']);
            }

            return $usage;
        });
    }

    public function submitUsage(AssetUsage $usage): bool
    {
        if (!in_array($usage->status, ['draft', 'rejected', 'pending_receive'])) {
            throw new \Exception('Phiếu không ở trạng thái hợp lệ để gửi duyệt.');
        }

        return $usage->update([
            'status' => 'pending_management',
            'rejection_reason' => null
        ]);
    }

    public function approveUsageByManagement(AssetUsage $usage, User $user): bool
    {
        return $usage->approveByManagement($user);
    }

    public function confirmUsageByAccountant(AssetUsage $usage, User $user): bool
    {
        return DB::transaction(function () use ($usage, $user) {
            if ($usage->confirmByAccountant($user)) {
                // Side-effect: Update equipment status
                if ($usage->asset) {
                    $usage->asset->update(['status' => 'in_use']);
                }
                return true;
            }
            return false;
        });
    }

    public function rejectUsage(AssetUsage $usage, string $reason, User $user): bool
    {
        return $usage->reject($user, $reason);
    }

    public function requestReturnUsage(AssetUsage $usage): bool
    {
        if ($usage->status !== 'in_use') {
            throw new \Exception('Yêu cầu không ở trạng thái đang sử dụng.');
        }
        return $usage->update(['status' => 'pending_return']);
    }

    public function confirmReturnUsage(AssetUsage $usage, User $user): bool
    {
        return DB::transaction(function () use ($usage, $user) {
            if ($usage->confirmReturn($user)) {
                // Side-effect: Check if equipment is still used elsewhere
                $otherActive = EquipmentAllocation::where('equipment_id', $usage->equipment_id)
                    ->where('status', 'active')
                    ->exists() || 
                    AssetUsage::where('equipment_id', $usage->equipment_id)
                    ->where('id', '!=', $usage->id)
                    ->where('status', 'in_use')
                    ->exists();

                if (!$otherActive && $usage->asset) {
                    $usage->asset->update(['status' => 'available']);
                }
                return true;
            }
            return false;
        });
    }

    // =========================================================================
    // UTILS
    // =========================================================================

    private function linkAttachments($model, $attachmentIds): void
    {
        $ids = is_array($attachmentIds) ? $attachmentIds : explode(',', $attachmentIds);
        Attachment::whereIn('id', $ids)->update([
            'attachable_id'   => $model->id,
            'attachable_type' => get_class($model)
        ]);
    }

    /**
     * Get equipment with filtering
     */
    public function getEquipment(array $filters = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $query = Equipment::query();

        if (!empty($filters['active_only']) && ($filters['active_only'] === 'true' || $filters['active_only'] === true)) {
            $query->whereIn('status', ['available', 'in_use']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        if (!empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        $equipment = $query->paginate(20);

        // Append remaining_quantity
        $items = $equipment->getCollection()->map(function ($item) {
            $item->remaining_quantity = $item->remaining_quantity;
            return $item;
        });
        $equipment->setCollection($items);

        return $equipment;
    }

    /**
     * Get equipment allocated to a project
     */
    public function getEquipmentByProject(int $projectId, array $filters = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $allocationStatus = $filters['allocation_status'] ?? null;

        $query = Equipment::whereHas('allocations', function ($q) use ($projectId, $allocationStatus) {
            $q->where('project_id', $projectId);
            if ($allocationStatus) {
                $q->where('status', $allocationStatus);
            }
        })->with(['allocations' => function ($q) use ($projectId) {
            $q->where('project_id', $projectId)
                ->with(['allocatedTo', 'creator'])
                ->orderBy('start_date', 'desc');
        }]);

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        if (!empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        $equipment = $query->paginate(20);

        // Map primary allocation for the project view
        $equipment->getCollection()->transform(function ($item) use ($projectId, $allocationStatus) {
            $projectAllocations = $item->allocations->where('project_id', $projectId);
            
            if ($allocationStatus) {
                 $primaryAllocation = $projectAllocations->where('status', $allocationStatus)->sortByDesc('start_date')->first();
            } else {
                 $primaryAllocation = $projectAllocations->where('status', 'active')->first() 
                                      ?? $projectAllocations->sortByDesc('start_date')->first();
            }
            
            $item->project_allocation = $primaryAllocation;
            $item->project_allocations_count = $projectAllocations->count();
            
            return $item;
        });

        return $equipment;
    }
}
