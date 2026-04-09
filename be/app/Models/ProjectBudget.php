<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use App\Traits\HasAutoCode;

class ProjectBudget extends Model
{
    use HasAutoCode;

    protected $fillable = [
        'uuid',
        'project_id',
        'code',
        'name',
        'version',
        'total_budget',
        'estimated_cost',
        'actual_cost',
        'remaining_budget',
        'budget_date',
        'notes',
        'status',
        'created_by',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'total_budget' => 'decimal:2',
        'estimated_cost' => 'decimal:2',
        'actual_cost' => 'decimal:2',
        'remaining_budget' => 'decimal:2',
        'budget_date' => 'date',
        'approved_at' => 'datetime',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(BudgetItem::class, 'budget_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function attachments(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($budget) {
            if (empty($budget->uuid)) {
                $budget->uuid = Str::uuid();
            }
        });
    }
}

