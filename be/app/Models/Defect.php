<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

class Defect extends Model
{
    protected $fillable = [
        'uuid',
        'project_id',
        'acceptance_stage_id',
        'description',
        'severity',
        'status',
        'reported_by',
        'reported_at',
        'fixed_by',
        'fixed_at',
        'verified_by',
        'verified_at',
    ];

    protected $casts = [
        'reported_at' => 'datetime',
        'fixed_at' => 'datetime',
        'verified_at' => 'datetime',
    ];

    protected $appends = [
        'is_open',
        'is_fixed',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function acceptanceStage(): BelongsTo
    {
        return $this->belongsTo(AcceptanceStage::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function fixer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'fixed_by');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // ==================================================================
    // ACCESSOR
    // ==================================================================

    public function getIsOpenAttribute(): bool
    {
        return in_array($this->status, ['open', 'in_progress']);
    }

    public function getIsFixedAttribute(): bool
    {
        return $this->status === 'fixed' || $this->status === 'verified';
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function markAsInProgress(?User $user = null): bool
    {
        $this->status = 'in_progress';
        return $this->save();
    }

    public function markAsFixed(?User $user = null): bool
    {
        $this->status = 'fixed';
        if ($user) {
            $this->fixed_by = $user->id;
        }
        $this->fixed_at = now();
        return $this->save();
    }

    public function markAsVerified(?User $user = null): bool
    {
        if ($this->status !== 'fixed') {
            return false;
        }
        $this->status = 'verified';
        if ($user) {
            $this->verified_by = $user->id;
        }
        $this->verified_at = now();
        return $this->save();
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeOpen($query)
    {
        return $query->whereIn('status', ['open', 'in_progress']);
    }

    public function scopeBySeverity($query, $severity)
    {
        return $query->where('severity', $severity);
    }

    public function scopeCritical($query)
    {
        return $query->where('severity', 'critical');
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($defect) {
            if (empty($defect->uuid)) {
                $defect->uuid = Str::uuid();
            }
        });
    }
}
