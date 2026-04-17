<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class SubcontractorAcceptance extends Model
{
    use SoftDeletes, \App\Traits\Approvable;

    protected $fillable = [
        'uuid',
        'subcontractor_id',
        'project_id',
        'subcontractor_contract_id',
        'acceptance_number',
        'acceptance_name',
        'description',
        'acceptance_date',
        'accepted_volume',
        'volume_unit',
        'accepted_amount',
        'quality_score',
        'status',
        'notes',
        'rejection_reason',
        'accepted_by',
        'accepted_at',
        'rejected_by',
        'rejected_at',
        'created_by',
    ];

    protected $casts = [
        'acceptance_date' => 'date',
        'accepted_volume' => 'decimal:2',
        'accepted_amount' => 'decimal:2',
        'quality_score' => 'decimal:2',
        'accepted_at' => 'datetime',
        'rejected_at' => 'datetime',
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

    public function accepter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accepted_by');
    }

    public function rejector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // ==================================================================
    // APPROVABLE OVERRIDES
    // ==================================================================

    public function getApprovalSummary(): string
    {
        return "Nghiệm thu NTP: " . ($this->acceptance_name ?? "#{$this->id}");
    }

    public function getApprovalMetadata(): array
    {
        return [
            'accepted_amount' => $this->accepted_amount,
            'subcontractor_id' => $this->subcontractor_id,
            'acceptance_number' => $this->acceptance_number,
        ];
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function approve(?User $user = null, ?string $notes = null): bool
    {
        $this->status = 'approved';
        if ($user) {
            $this->accepted_by = $user->id;
        }
        $this->accepted_at = now();
        if ($notes) {
            $this->notes = $notes;
        }
        return $this->save();
    }

    public function reject(?User $user = null, ?string $reason = null): bool
    {
        $this->status = 'rejected';
        $this->rejection_reason = $reason;
        if ($user) {
            $this->rejected_by = $user->id;
        }
        $this->rejected_at = now();
        return $this->save();
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($acceptance) {
            if (empty($acceptance->uuid)) {
                $acceptance->uuid = Str::uuid();
            }
        });
    }
}
