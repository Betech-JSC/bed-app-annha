<?php

namespace App\Services;

use App\Models\Supplier;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SupplierService
{
    /**
     * Create or update a supplier
     */
    public function upsert(array $data, ?Supplier $supplier = null, ?User $user = null): Supplier
    {
        return DB::transaction(function () use ($data, $supplier, $user) {
            if (!$supplier) {
                $supplier = new Supplier();
                $supplier->uuid = (string) Str::uuid();
                $supplier->created_by = $user ? $user->id : null;
            } else {
                $supplier->updated_by = $user ? $user->id : null;
            }

            $fillable = [
                'name', 'tax_code', 'address', 'phone', 'email', 
                'contact_person', 'bank_name', 'bank_account_number'
            ];
            
            foreach ($fillable as $field) {
                if (array_key_exists($field, $data)) {
                    $supplier->{$field} = $data[$field];
                }
            }

            $supplier->save();

            return $supplier->fresh();
        });
    }

    // =========================================================================
    // ACCEPTANCE MANAGEMENT
    // =========================================================================

    /**
     * Get supplier acceptances with filtering
     */
    public function getAcceptances(array $filters = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $query = \App\Models\SupplierAcceptance::with(['supplier', 'project', 'contract', 'accepter']);

        if (!empty($filters['project_id'])) {
            $query->where('project_id', $filters['project_id']);
        }

        if (!empty($filters['supplier_id'])) {
            $query->where('supplier_id', $filters['supplier_id']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->orderByDesc('acceptance_date')->paginate($filters['per_page'] ?? 20);
    }

    /**
     * Create or update acceptance
     */
    public function upsertAcceptance(array $data, ?\App\Models\SupplierAcceptance $acceptance = null, ?User $user = null): \App\Models\SupplierAcceptance
    {
        return DB::transaction(function () use ($data, $acceptance, $user) {
            if (!$acceptance) {
                $data['created_by'] = $user ? $user->id : null;
                $data['status'] = 'pending';
                $acceptance = \App\Models\SupplierAcceptance::create($data);
            } else {
                if (in_array($acceptance->status, ['approved', 'rejected'])) {
                    throw new \Exception('Không thể sửa nghiệm thu đã được duyệt/từ chối.');
                }
                $acceptance->update($data);
            }

            return $acceptance->fresh(['supplier', 'project', 'contract']);
        });
    }

    /**
     * Approve acceptance
     */
    public function approveAcceptance(\App\Models\SupplierAcceptance $acceptance, User $user, ?string $notes = null): bool
    {
        if ($acceptance->status !== 'pending') {
            throw new \Exception('Chỉ có thể duyệt nghiệm thu ở trạng thái pending.');
        }

        return $acceptance->approve($user, $notes);
    }

    /**
     * Reject acceptance
     */
    public function rejectAcceptance(\App\Models\SupplierAcceptance $acceptance, User $user, string $reason): bool
    {
        if ($acceptance->status !== 'pending') {
            throw new \Exception('Chỉ có thể từ chối nghiệm thu ở trạng thái pending.');
        }

        return $acceptance->reject($reason, $user);
    }

    // =========================================================================
    // PROFILE MANAGEMENT
    // =========================================================================

    /**
     * Get suppliers with filtering
     */
    public function getSuppliers(array $filters = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $query = Supplier::query();

        if (!empty($filters['search'])) {
            $query->where(function($q) use ($filters) {
                $q->where('name', 'like', "%{$filters['search']}%")
                  ->orWhere('tax_code', 'like', "%{$filters['search']}%")
                  ->orWhere('email', 'like', "%{$filters['search']}%");
            });
        }

        return $query->orderBy('name')->paginate($filters['per_page'] ?? 20);
    }

    // =========================================================================
    // CONTRACT MANAGEMENT
    // =========================================================================

    /**
     * Get supplier contracts with filtering
     */
    public function getContracts(array $filters = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $query = \App\Models\SupplierContract::with(['supplier', 'project', 'signer']);

        if (!empty($filters['project_id'])) {
            $query->where('project_id', $filters['project_id']);
        }

        if (!empty($filters['supplier_id'])) {
            $query->where('supplier_id', $filters['supplier_id']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->orderByDesc('contract_date')->paginate($filters['per_page'] ?? 20);
    }

    /**
     * Create or update contract
     */
    public function upsertContract(array $data, ?\App\Models\SupplierContract $contract = null, ?User $user = null): \App\Models\SupplierContract
    {
        return DB::transaction(function () use ($data, $contract, $user) {
            if (!$contract) {
                $data['created_by'] = $user ? $user->id : null;
                $contract = \App\Models\SupplierContract::create($data);
            } else {
                if ($contract->status === 'active' && $contract->signed_at) {
                    throw new \Exception('Không thể sửa hợp đồng đã ký.');
                }
                $contract->update($data);
            }

            return $contract->fresh(['supplier', 'project', 'signer']);
        });
    }

    /**
     * Sign contract
     */
    public function signContract(\App\Models\SupplierContract $contract, User $user): bool
    {
        if ($contract->status !== 'draft') {
            throw new \Exception('Chỉ có thể ký hợp đồng ở trạng thái draft.');
        }

        return $contract->sign($user);
    }
}
