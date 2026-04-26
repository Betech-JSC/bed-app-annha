<?php

namespace App\Services;

use App\Models\MaterialBill;
use App\Models\MaterialBillItem;
use App\Models\Cost;
use App\Models\Project;
use App\Models\Attachment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class MaterialBillService
{
    /**
     * Create or update a Material Bill with unified logic.
     */
    public function upsert(array $data, ?MaterialBill $bill = null, $user = null): MaterialBill
    {
        $rules = [
            'project_id'    => $bill ? 'sometimes|exists:projects,id' : 'required|exists:projects,id',
            'supplier_id'   => 'nullable|exists:suppliers,id',
            'bill_date'     => 'required|date',
            'cost_group_id' => 'nullable|exists:cost_groups,id',
            'notes'         => 'nullable|string',
            'items'         => 'required|array|min:1',
            'items.*.material_id' => 'required|exists:materials,id',
            'items.*.quantity'    => 'required|numeric|min:0.01',
            'items.*.unit_price'  => 'required|numeric|min:0',
            'items.*.notes'       => 'nullable|string',
            'attachment_ids'      => 'nullable|array',
        ];

        $validator = Validator::make($data, $rules);
        if ($validator->fails()) {
            throw new \Illuminate\Validation\ValidationException($validator);
        }

        return DB::transaction(function () use ($data, $bill, $user) {
            $projectId = $data['project_id'] ?? ($bill ? $bill->project_id : null);
            
            if (!$bill) {
                // Auto-generate bill number if not provided (matching CRM logic)
                $billNumber = $data['bill_number'] ?? $this->generateBillNumber($projectId);
                
                $bill = MaterialBill::create([
                    'project_id'    => $projectId,
                    'supplier_id'   => $data['supplier_id'] ?? null,
                    'bill_number'   => $billNumber,
                    'bill_date'     => $data['bill_date'],
                    'cost_group_id' => $data['cost_group_id'] ?? null,
                    'total_amount'  => 0, // Calculated below
                    'notes'         => $data['notes'] ?? null,
                    'status'        => 'draft',
                    'created_by'    => $user ? $user->id : null,
                ]);
            } else {
                if (!in_array($bill->status, ['draft', 'rejected', 'pending_management', 'pending_management_approval', 'pending_accountant', 'pending_accountant_approval'])) {
                    throw new \Exception('Chỉ có thể chỉnh sửa phiếu vật tư ở trạng thái Nháp, Từ chối, hoặc đang chờ duyệt.');
                }
                $bill->update([
                    'supplier_id'   => $data['supplier_id'] ?? $bill->supplier_id,
                    'bill_date'     => $data['bill_date'] ?? $bill->bill_date,
                    'cost_group_id' => $data['cost_group_id'] ?? $bill->cost_group_id,
                    'notes'         => $data['notes'] ?? $bill->notes,
                    'status'        => 'draft', // Reset to draft if was rejected
                ]);
            }

            // Sync items
            if (isset($data['items'])) {
                $bill->items()->delete();
                $totalAmount = 0;
                foreach ($data['items'] as $itemData) {
                    $totalPrice = $itemData['quantity'] * $itemData['unit_price'];
                    $totalAmount += $totalPrice;
                    MaterialBillItem::create([
                        'material_bill_id' => $bill->id,
                        'material_id'      => $itemData['material_id'],
                        'quantity'         => $itemData['quantity'],
                        'unit_price'       => $itemData['unit_price'],
                        'total_price'      => $totalPrice,
                        'notes'            => $itemData['notes'] ?? null,
                    ]);
                }
                $bill->update(['total_amount' => $totalAmount]);
            }

            // Ensure linked Cost record exists
            $this->ensureLinkedCost($bill, $user);

            // Handle attachment linkage
            if (isset($data['attachment_ids'])) {
                Attachment::whereIn('id', $data['attachment_ids'])->update([
                    'attachable_id'   => $bill->id,
                    'attachable_type' => MaterialBill::class,
                ]);
            }

            return $bill;
        });
    }

    /**
     * Submit for approval.
     */
    public function submit(MaterialBill $bill, $user): void
    {
        if (!in_array($bill->status, ['draft', 'rejected'])) {
            throw new \Exception('Trạng thái không hợp lệ để gửi duyệt.');
        }

        $bill->submitForManagementApproval();
        $bill->notifyEvent('submitted', $user);
    }

    /**
     * Multilevel approval.
     */
    public function approve(MaterialBill $bill, $user, array $extraData = []): void
    {
        $oldStatus = $bill->status;
        
        if ($bill->status === 'pending_management') {
            $bill->approveByManagement($user);
            $bill->notifyEvent('approved_management', $user);
        } elseif ($bill->status === 'pending_accountant') {
            if ($bill->attachments()->count() === 0) {
                throw new \Exception('Bắt buộc phải có ít nhất một chứng từ trước khi Kế toán duyệt.');
            }

            // accountant approval might require budget_item_id
            if (isset($extraData['budget_item_id'])) {
                $bill->update(['budget_item_id' => $extraData['budget_item_id']]);
            }

            $bill->approveByAccountant($user);
            $bill->triggerApprovalSideEffects();
            $bill->notifyEvent('approved_accountant', $user);
        } else {
            throw new \Exception('Phiếu vật tư không ở trạng thái chờ duyệt.');
        }
    }

    /**
     * Reject.
     */
    public function reject(MaterialBill $bill, $user, string $reason): void
    {
        if (!in_array($bill->status, ['pending_management', 'pending_accountant'])) {
            throw new \Exception('Phiếu vật tư không ở trạng thái chờ duyệt.');
        }

        $bill->reject($user, $reason);
        $bill->notifyEvent('rejected', $user, ['reason' => $reason]);
    }

    /**
     * Revert to Draft.
     */
    public function revertToDraft(MaterialBill $bill, $user): void
    {
        $revertibleStatuses = ['pending_management', 'pending_accountant', 'approved', 'rejected'];
        if (!in_array($bill->status, $revertibleStatuses)) {
            throw new \Exception('Trạng thái hiện tại không thể hoàn duyệt.');
        }

        DB::transaction(function () use ($bill, $user) {
            $bill->update([
                'status' => 'draft',
                'budget_item_id' => null,
            ]);

            // Sync with linked Cost record
            $this->ensureLinkedCost($bill, $user);
            
            $bill->notifyEvent('reverted_to_draft', $user);
        });
    }

    /**
     * Delete.
     */
    public function delete(MaterialBill $bill): void
    {
        if (!in_array($bill->status, ['draft'])) {
            throw new \Exception('Chỉ có thể xóa phiếu ở trạng thái Nháp.');
        }

        DB::transaction(function () use ($bill) {
            $bill->items()->delete();
            // Also delete linked Cost if matches
            Cost::where('material_bill_id', $bill->id)->delete();
            $bill->delete();
        });
    }

    /**
     * Generate bill number PVT-XXX.
     */
    protected function generateBillNumber(string $projectId): string
    {
        $lastBill = MaterialBill::where('project_id', $projectId)->count();
        return 'PVT-' . str_pad($lastBill + 1, 3, '0', STR_PAD_LEFT);
    }

    /**
     * Ensure a Cost record is linked to this MaterialBill.
     */
    protected function ensureLinkedCost(MaterialBill $bill, $user = null): void
    {
        $cost = Cost::where('material_bill_id', $bill->id)->first();
        
        $supplierName = $bill->supplier ? $bill->supplier->name : '';
        $costName = "Phiếu vật liệu #" . ($bill->bill_number ?? $bill->id) . ($supplierName ? " - {$supplierName}" : '');
        
        $costData = [
            'project_id'       => $bill->project_id,
            'cost_group_id'    => $bill->cost_group_id,
            'supplier_id'      => $bill->supplier_id,
            'category'         => 'construction_materials',
            'material_bill_id' => $bill->id,
            'name'             => $costName,
            'amount'           => $bill->total_amount,
            'description'      => $bill->notes ?? "Từ phiếu vật tư " . ($bill->bill_number ?? $bill->id),
            'cost_date'        => $bill->bill_date,
            'status'           => $this->mapStatusToCost($bill->status),
        ];

        if (!$cost) {
            $costData['created_by'] = $bill->created_by ?? ($user ? $user->id : 1);
            Cost::create($costData);
        } else {
            $cost->update($costData);
        }
    }

    protected function mapStatusToCost(string $status): string
    {
        return match ($status) {
            'approved'           => 'approved',
            'pending_management' => 'pending_management_approval',
            'pending_accountant' => 'pending_accountant_approval',
            'rejected'           => 'rejected',
            default              => 'draft',
        };
    }
}
