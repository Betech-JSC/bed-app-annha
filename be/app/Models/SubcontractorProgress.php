<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class SubcontractorProgress extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'subcontractor_id',
        'project_id',
        'subcontractor_contract_id',
        'progress_date',
        'planned_progress',
        'actual_progress',
        'completed_volume',
        'volume_unit',
        'work_description',
        'next_week_plan',
        'issues_and_risks',
        'status',
        'reported_by',
        'verified_by',
        'verified_at',
    ];

    protected $casts = [
        'progress_date' => 'date',
        'planned_progress' => 'decimal:2',
        'actual_progress' => 'decimal:2',
        'completed_volume' => 'decimal:2',
        'verified_at' => 'datetime',
    ];

    protected $appends = [
        'progress_difference',
        'is_on_schedule',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function subcontractor(): BelongsTo
    {
        return $this->belongsTo(Subcontractor::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(SubcontractorContract::class, 'subcontractor_contract_id');
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
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

    public function getProgressDifferenceAttribute(): float
    {
        return $this->actual_progress - $this->planned_progress;
    }

    public function getIsOnScheduleAttribute(): bool
    {
        return $this->status === 'on_schedule' || $this->status === 'ahead_of_schedule';
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function verify(?User $user = null): bool
    {
        if ($user) {
            $this->verified_by = $user->id;
        }
        $this->verified_at = now();
        return $this->save();
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($progress) {
            if (empty($progress->uuid)) {
                $progress->uuid = Str::uuid();
            }
        });
    }
}
