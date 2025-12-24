<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class GlobalSubcontractor extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'name',
        'code',
        'contact_person',
        'phone',
        'email',
        'address',
        'tax_code',
        'notes',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'project_subcontractors')
            ->withPivot([
                'category',
                'total_quote',
                'advance_payment',
                'total_paid',
                'progress_start_date',
                'progress_end_date',
                'progress_status',
                'payment_status',
                'approved_by',
                'approved_at',
            ])
            ->withTimestamps();
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($subcontractor) {
            if (empty($subcontractor->uuid)) {
                $subcontractor->uuid = Str::uuid();
            }
        });
    }
}
