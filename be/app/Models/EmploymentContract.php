<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class EmploymentContract extends Model
{
    protected $fillable = [
        'uuid',
        'user_id',
        'contract_number',
        'contract_type',
        'start_date',
        'end_date',
        'base_salary',
        'job_title',
        'job_description',
        'benefits',
        'status',
        'terminated_date',
        'termination_reason',
        'created_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'terminated_date' => 'date',
        'base_salary' => 'decimal:2',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
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
                $contract->contract_number = 'CT-' . date('Ymd') . '-' . strtoupper(Str::random(6));
            }
        });
    }
}

