<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class EmployeeInsurance extends Model
{
    protected $fillable = [
        'uuid',
        'user_id',
        'social_insurance_number',
        'health_insurance_number',
        'unemployment_insurance_number',
        'insurance_start_date',
        'insurance_end_date',
        'social_insurance_rate',
        'health_insurance_rate',
        'unemployment_insurance_rate',
        'base_salary_for_insurance',
        'notes',
        'status',
    ];

    protected $casts = [
        'insurance_start_date' => 'date',
        'insurance_end_date' => 'date',
        'social_insurance_rate' => 'decimal:2',
        'health_insurance_rate' => 'decimal:2',
        'unemployment_insurance_rate' => 'decimal:2',
        'base_salary_for_insurance' => 'decimal:2',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($insurance) {
            if (empty($insurance->uuid)) {
                $insurance->uuid = Str::uuid();
            }
        });
    }
}

