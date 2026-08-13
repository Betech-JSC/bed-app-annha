<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

use App\Traits\Approvable;

class MaterialTransaction extends Model
{
    use Approvable;

    protected $fillable = [
        'uuid',
        'material_id',
        'project_id',
        'target_project_id',
        'cost_id',
        'type',
        'quantity',
        'unit_price',
        'total_amount',
        'supplier_id',
        'reference_number',
        'transaction_date',
        'notes',
        'created_by',
        'status',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'transaction_date' => 'date',
        'approved_at' => 'datetime',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function targetProject(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'target_project_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function cost(): BelongsTo
    {
        return $this->belongsTo(Cost::class, 'cost_id');
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($transaction) {
            if (empty($transaction->uuid)) {
                $transaction->uuid = Str::uuid();
            }
        });
    }

    // ==================================================================
    // APPROVAL HELPERS
    // ==================================================================

    public function isPendingApproval(): bool
    {
        return $this->type === 'export' && $this->status === 'pending';
    }

    public function getApprovalSummary(): string
    {
        $targetName = $this->targetProject ? $this->targetProject->name : 'Dự án';
        $matName = $this->material ? $this->material->name : 'Vật tư';
        return "Yêu cầu xuất kho: {$matName} (SL: {$this->quantity}) sang {$targetName}";
    }

    public function getApprovalMetadata(): array
    {
        return [
            'material_name' => $this->material?->name,
            'material_code' => $this->material?->code,
            'unit' => $this->material?->unit,
            'quantity' => $this->quantity,
            'unit_price' => $this->unit_price,
            'amount' => $this->total_amount,
            'target_project_name' => $this->targetProject?->name,
            'project_id' => $this->project_id,
            'target_project_id' => $this->target_project_id,
            'type_label' => 'Yêu cầu xuất kho',
            'creator' => $this->creator?->name,
            'notes' => $this->notes,
        ];
    }
}

