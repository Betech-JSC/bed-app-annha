<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class OvertimeCategory extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'description',
        'default_multiplier',
        'is_active',
    ];

    protected $casts = [
        'default_multiplier' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function timeTrackings(): HasMany
    {
        return $this->hasMany(TimeTracking::class);
    }
}
