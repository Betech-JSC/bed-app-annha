<?php

namespace App\Models;

use App\Models\Cost;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

class EquipmentRental extends Model
{
    protected $fillable = [
        'uuid', 'project_id', 'equipment_name', 'equipment_id',
        'quantity', 'unit_price',
        'supplier_id', 'rental_start_date', 'rental_end_date', 'total_cost',
        'status', 'rejection_reason', 'notes', 'created_by',
        'approved_by', 'approved_at', 'confirmed_by', 'confirmed_at', 'cost_id',
    ];

    protected $casts = [
        'quantity'          => 'integer',
        'unit_price'        => 'decimal:2',
        'total_cost'        => 'decimal:2',
        'rental_start_date' => 'date',
        'rental_end_date'   => 'date',
        'approved_at'       => 'datetime',
        'confirmed_at'      => 'datetime',
    ];

    // ─── Relationships ───
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function equipment(): BelongsTo { return $this->belongsTo(Equipment::class, 'equipment_id'); }
    public function supplier(): BelongsTo { return $this->belongsTo(Supplier::class); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function approver(): BelongsTo { return $this->belongsTo(User::class, 'approved_by'); }
    public function confirmer(): BelongsTo { return $this->belongsTo(User::class, 'confirmed_by'); }
    public function cost(): BelongsTo { return $this->belongsTo(Cost::class); }
    public function attachments(): MorphMany { return $this->morphMany(Attachment::class, 'attachable'); }

    // ─── Status Labels ───
    const STATUS_LABELS = [
        'draft'              => 'Nháp',
        'pending_management' => 'Chờ BĐH duyệt',
        'pending_accountant' => 'Chờ Kế toán',
        'completed'          => 'Hoàn tất thanh toán',
        'in_use'             => 'Đang sử dụng',
        'pending_return'     => 'Chờ xác nhận trả',
        'returned'           => 'Đã hoàn trả',
        'rejected'           => 'Từ chối',
    ];

    // ─── Methods ───
    public function approveByManagement(?User $user = null): bool
    {
        if ($this->status !== 'pending_management') return false;
        $this->status = 'pending_accountant';
        if ($user) {
            $this->approved_by = $user->id;
            $this->approved_at = now();
        }
        return $this->save();
    }

    public function confirmByAccountant(?User $user = null): bool
    {
        if ($this->status !== 'pending_accountant') return false;
        $this->status = 'in_use';
        if ($user) {
            $this->confirmed_by = $user->id;
            $this->confirmed_at = now();
        }
        return $this->save();
    }

    public function confirmReturn(?User $user = null): bool
    {
        if ($this->status !== 'pending_return') return false;
        $this->status = 'returned';
        if ($user) {
            $this->confirmed_by = $user->id; // Using same field for return confirm
            $this->confirmed_at = now();
        }
        return $this->save();
    }

    public function reject(?User $user = null, ?string $reason = null): bool
    {
        if (!in_array($this->status, ['pending_management', 'pending_accountant', 'pending_return'])) return false;
        $this->status = 'rejected';
        $this->rejection_reason = $reason;
        if ($user) {
            $this->approved_by = $user->id; // Unified logic
        }
        return $this->save();
    }

    /**
     * Synchronize rental data to Cost table
     */
    public function syncToCostTable(): void
    {
        if ($this->status === 'rejected') {
            Cost::where('equipment_rental_id', $this->id)->delete();
            return;
        }

        // Only sync if in a state that represents an active or confirmed rental
        if (!in_array($this->status, ['in_use', 'returned', 'completed'])) {
            $costStatus = 'draft';
        } else {
            $costStatus = 'approved';
        }

        $costGroupId = \App\Models\CostGroup::where('code', 'equipment_rental')
            ->orWhere('name', 'LIKE', '%Thuê thiết bị%')
            ->value('id') ?: 6;

        Cost::updateOrCreate(
            ['equipment_rental_id' => $this->id],
            [
                'project_id'               => $this->project_id,
                'equipment_id'             => $this->equipment_id,
                'name'                     => "Thuê thiết bị: " . ($this->equipment_name ?: ($this->equipment->name ?? 'N/A')),
                'amount'                   => $this->total_cost,
                'cost_date'                => $this->rental_start_date ?: now(),
                'category'                 => 'other',
                'cost_group_id'            => $costGroupId,
                'supplier_id'              => $this->supplier_id,
                'description'              => $this->notes ?: "Đồng bộ từ phiếu thuê thiết bị #" . ($this->uuid),
                'status'                   => $costStatus,
                'created_by'               => $this->created_by,
                'management_approved_by'   => $this->approved_by,
                'management_approved_at'   => $this->approved_at,
                'accountant_approved_by'   => $this->confirmed_by,
                'accountant_approved_at'   => $this->confirmed_at,
            ]
        );
    }

    // ─── Boot ───
    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            $model->uuid = $model->uuid ?: Str::uuid();
        });

        static::saving(function ($model) {
            // Auto-calculate total cost
            $model->total_cost = ($model->quantity ?: 0) * ($model->unit_price ?: 0);
        });

        static::saved(function ($model) {
            $model->syncToCostTable();
        });

        static::deleted(function ($model) {
            Cost::where('equipment_rental_id', $model->id)->delete();
        });
    }
}
