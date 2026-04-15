<?php

namespace App\Services;

use App\Models\Contract;
use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ContractService
{
    /**
     * Create or update a contract
     */
    public function upsert(array $data, ?Contract $contract = null, ?User $user = null): Contract
    {
        return DB::transaction(function () use ($data, $contract, $user) {
            $isNew = !$contract;
            
            if ($isNew) {
                $contract = new Contract();
                $contract->uuid = (string) Str::uuid();
                $contract->project_id = $data['project_id'];
                $contract->status = 'pending_customer_approval'; // Default status
            }

            // Fillable fields
            $fillable = ['contract_value', 'signed_date', 'status'];
            foreach ($fillable as $field) {
                if (array_key_exists($field, $data)) {
                    $contract->{$field} = $data[$field];
                }
            }

            $contract->save();

            return $contract->fresh(['attachments', 'approver']);
        });
    }

    /**
     * Delete a contract
     */
    public function delete(Contract $contract): bool
    {
        return DB::transaction(function () use ($contract) {
            // Delete attachments if needed (AttachmentService usually handles this via morph relations)
            return $contract->delete();
        });
    }

    /**
     * Approve contract
     */
    public function approve(Contract $contract, ?User $user = null): bool
    {
        return $contract->approve($user);
    }

    /**
     * Reject contract
     */
    public function reject(Contract $contract, string $reason, ?User $user = null): bool
    {
        return $contract->reject($reason, $user);
    }
}
