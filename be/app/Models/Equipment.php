<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Equipment extends Model
{
    use SoftDeletes, \App\Traits\Approvable, \App\Traits\NotifiesUsers;

    protected $fillable = [
        'uuid',
        'name',
        'code',
        'type', // owned, rented
        'quantity',
        'category',
        'brand',
        'model',
        'serial_number',
        'unit',
        'purchase_date',
        'purchase_price',
        'useful_life_months',
        'depreciation_method',
        'residual_value',
        'current_value',
        'accumulated_depreciation',
        'rental_rate_per_day',
        'maintenance_interval_days',
        'last_maintenance_date',
        'next_maintenance_date',
        'status', // draft, pending_management, pending_accountant, available, in_use, maintenance, retired
        'assigned_to',
        'project_id',
        'location',
        'notes',
        'created_by',
        'approved_by',
        'approved_at',
        'confirmed_by',
        'confirmed_at',
        'rejection_reason',
    ];

    protected $appends = ['asset_code', 'monthly_depreciation', 'remaining_percent', 'remaining_quantity'];

    protected $casts = [
        'quantity'                 => 'integer',
        'purchase_price'           => 'decimal:2',
        'residual_value'           => 'decimal:2',
        'current_value'            => 'decimal:2',
        'accumulated_depreciation' => 'decimal:2',
        'purchase_date'            => 'date',
        'last_maintenance_date'    => 'date',
        'next_maintenance_date'    => 'date',
        'approved_at'              => 'datetime',
        'confirmed_at'             => 'datetime',
    ];

    // --- Approval Status Labels ---
    const STATUS_LABELS = [
        'draft'              => 'Nháp',
        'pending_management' => 'Chờ BĐH duyệt',
        'pending_accountant' => 'Chờ Kế toán',
        'available'          => 'Sẵn sàng (Trong kho)',
        'in_use'             => 'Đang sử dụng',
        'maintenance'        => 'Bảo trì',
        'retired'            => 'Thanh lý',
        'rejected'           => 'Từ chối',
    ];

    // --- Relationships ---
    
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function confirmer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // --- Scopes ---

    public function scopeActive($query)
    {
        return $query->where('status', '!=', 'retired');
    }

    // --- Accessors for Frontend Compatibility ---

    public function getAssetCodeAttribute(): ?string
    {
        return $this->code;
    }

    // --- Legacy Asset Logic ---

    public function getMonthlyDepreciationAttribute(): float
    {
        if ($this->useful_life_months <= 0) return 0;
        return round(($this->purchase_price - $this->residual_value) / $this->useful_life_months, 2);
    }

    public function getRemainingPercentAttribute(): float
    {
        if ($this->purchase_price <= 0) return 0;
        return round(($this->current_value / $this->purchase_price) * 100, 1);
    }


    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function cost(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Cost::class, 'equipment_id');
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(EquipmentAllocation::class);
    }

    public function maintenances(): HasMany
    {
        return $this->hasMany(EquipmentMaintenance::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(AssetAssignment::class, 'equipment_id');
    }

    public function usages(): HasMany
    {
        return $this->hasMany(AssetUsage::class, 'equipment_id');
    }

    public function depreciations(): HasMany
    {
        return $this->hasMany(AssetDepreciation::class, 'equipment_id');
    }

    /**
     * Chạy khấu hao cho 1 tháng
     */
    public function getRemainingQuantityAttribute(): int
    {
        // Tính tổng đã phân bổ (EquipmentAllocation)
        $allocatedQty = $this->allocations()
            ->whereIn('status', ['active'])
            ->sum('quantity');

        // Tính tổng đã mượn (AssetUsage) - Trừ ra các phiếu đã "trả"
        $usageQty = $this->usages()
            ->whereIn('status', ['draft', 'pending_management', 'pending_accountant', 'approved', 'in_use', 'pending_return', 'pending_receive'])
            ->sum('quantity');

        $remaining = $this->quantity - ($allocatedQty + $usageQty);
        return max(0, $remaining);
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($equipment) {
            if (empty($equipment->uuid)) {
                $equipment->uuid = Str::uuid();
            }
        });
    }

    // ==================================================================
    // APPROVABLE OVERRIDES
    // ==================================================================

    protected function getApprovalSummary(): string
    {
        return "Mua tài sản/thiết bị mới: " . $this->name . ($this->project ? " [Dự án: " . $this->project->name . "]" : "");
    }

    protected function getApprovalMetadata(): array
    {
        return [
            'name' => $this->name,
            'project_name' => $this->project?->name,
            'quantity' => $this->quantity,
            'purchase_price' => $this->purchase_price,
            'total_amount' => $this->purchase_price * $this->quantity,
            'type_label' => 'Mua tài sản mới',
            'creator' => $this->creator?->name,
        ];
    }

    // ==================================================================
    // NotifiesUsers Implementation
    // ==================================================================

    public function getNotificationProject(): ?Project
    {
        return $this->project;
    }

    public function getNotificationLabel(): string
    {
        return "Tài sản/Thiết bị: " . $this->name;
    }

    protected function notificationMap(): array
    {
        return [
            'submitted' => [
                'title'    => 'Yêu cầu duyệt mua thiết bị',
                'body'     => 'Yêu cầu mua thiết bị {name} cho dự án {project} cần BĐH duyệt.',
                'target'   => ['management', 'pm'],
                'tab'      => 'equipment',
                'priority' => 'high',
                'category' => 'workflow_approval',
            ],
            'approved_management' => [
                'title'    => 'BĐH đã duyệt mua thiết bị',
                'body'     => 'Yêu cầu mua thiết bị {name} đã được BĐH duyệt, chờ KT xác nhận.',
                'target'   => ['creator', 'accountant', 'pm'],
                'tab'      => 'equipment',
                'priority' => 'high',
                'category' => 'workflow_approval',
            ],
            'available' => [
                'title'    => 'Thiết bị đã sẵn sàng',
                'body'     => 'Thiết bị {name} đã được nhập kho và sẵn sàng sử dụng.',
                'target'   => ['creator', 'pm'],
                'tab'      => 'equipment',
                'priority' => 'medium',
                'category' => 'status_change',
            ],
            'rejected' => [
                'title'    => 'Yêu cầu mua thiết bị bị từ chối',
                'body'     => 'Yêu cầu mua thiết bị {name} bị từ chối: {reason}',
                'target'   => ['creator', 'pm'],
                'tab'      => 'equipment',
                'priority' => 'high',
                'category' => 'workflow_approval',
            ],
        ];
    }

    /**
     * Chạy khấu hao cho 1 tháng
     */
    public function runMonthlyDepreciation(): ?AssetDepreciation
    {
        if ($this->status === 'retired') return null;
        if ($this->current_value <= $this->residual_value) return null;

        $amount = min($this->monthly_depreciation, $this->current_value - $this->residual_value);
        $remaining = $this->current_value - $amount;

        $dep = $this->depreciations()->create([
            'equipment_id' => $this->id, // explicit just in case
            'depreciation_date' => now()->startOfMonth()->format('Y-m-d'),
            'amount'            => $amount,
            'remaining_value'   => $remaining,
        ]);

        $this->update([
            'current_value'            => $remaining,
            'accumulated_depreciation' => $this->accumulated_depreciation + $amount,
        ]);

        return $dep;
    }
}
