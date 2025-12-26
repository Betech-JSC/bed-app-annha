<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class EmployeeBenefit extends Model
{
    protected $fillable = [
        'uuid',
        'user_id',
        'benefit_type',
        'name',
        'description',
        'amount',
        'calculation_type',
        'start_date',
        'end_date',
        'status',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
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

        static::creating(function ($benefit) {
            if (empty($benefit->uuid)) {
                $benefit->uuid = Str::uuid();
            }
        });
    }
}

