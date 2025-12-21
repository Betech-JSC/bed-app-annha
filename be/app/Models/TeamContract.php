<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class TeamContract extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'team_id',
        'project_id',
        'contract_number',
        'contract_type',
        'contract_amount',
        'start_date',
        'end_date',
        'description',
        'terms',
        'status',
        'created_by',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'contract_amount' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
        'terms' => 'array',
        'approved_at' => 'datetime',
    ];

    protected $appends = [
        'status_label',
        'contract_type_label',
    ];

    // ==================================================================
    // RELATIONSHIPS
    // ==================================================================

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // ==================================================================
    // ACCESSORS
    // ==================================================================

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'draft' => 'Nháp',
            'active' => 'Đang hiệu lực',
            'completed' => 'Hoàn thành',
            'terminated' => 'Chấm dứt',
            'cancelled' => 'Đã hủy',
            default => ucfirst($this->status),
        };
    }

    public function getContractTypeLabelAttribute(): string
    {
        return match ($this->contract_type) {
            'lump_sum' => 'Khoán',
            'unit_price' => 'Đơn giá',
            default => ucfirst($this->contract_type),
        };
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function approve(?User $user = null): bool
    {
        if ($user) {
            $this->approved_by = $user->id;
        }
        $this->approved_at = now();
        $this->status = 'active';
        return $this->save();
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($contract) {
            if (empty($contract->uuid)) {
                $contract->uuid = Str::uuid();
            }
            if (empty($contract->contract_number)) {
                $contract->contract_number = 'HD-' . strtoupper(Str::random(8));
            }
        });
    }
}
