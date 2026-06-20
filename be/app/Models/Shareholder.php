<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Shareholder extends Model
{
    protected $fillable = [
        'uuid', 'name', 'phone', 'email', 'id_number',
        'contributed_amount', 'share_percentage',
        'contribution_date', 'status', 'notes', 'created_by',
        'user_id', 'shares_count',
    ];

    protected $casts = [
        'contributed_amount' => 'decimal:2',
        'share_percentage'   => 'decimal:4',
        'contribution_date'  => 'date',
        'shares_count'       => 'integer',
    ];

    // --- Relationships ---
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // --- Scopes ---
    public function scopeActive($q) { return $q->where('status', 'active'); }

    // --- Boot ---
    protected static function boot()
    {
        parent::boot();
        static::creating(fn($m) => $m->uuid = $m->uuid ?: Str::uuid());
    }
}
