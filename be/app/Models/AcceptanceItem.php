<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class AcceptanceItem extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'acceptance_stage_id',
        'name',
        'description',
        'start_date',
        'end_date',
        'acceptance_status',
        'notes',
        'approved_by',
        'approved_at',
        'rejected_by',
        'rejected_at',
        'rejection_reason',
        'order',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'order' => 'integer',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    protected $appends = [
        'is_completed',
        'can_accept',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function acceptanceStage(): BelongsTo
    {
        return $this->belongsTo(AcceptanceStage::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function rejector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // ==================================================================
    // ACCESSOR
    // ==================================================================

    public function getIsCompletedAttribute(): bool
    {
        return now()->toDateString() >= $this->end_date->toDateString();
    }

    public function getCanAcceptAttribute(): bool
    {
        // Chỉ được nghiệm thu sau khi hoàn thành (end_date đã qua)
        return $this->is_completed && $this->acceptance_status === 'pending';
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function approve(?User $user = null, ?string $notes = null): bool
    {
        if (!$this->can_accept) {
            return false;
        }

        $this->acceptance_status = 'approved';
        if ($user) {
            $this->approved_by = $user->id;
        }
        $this->approved_at = now();
        if ($notes) {
            $this->notes = $notes;
        }
        $saved = $this->save();

        // Check if stage can be completed
        if ($saved) {
            $this->acceptanceStage->checkCompletion();
        }

        return $saved;
    }

    public function reject(string $reason, ?User $user = null): bool
    {
        if (!$this->can_accept) {
            return false;
        }

        $this->acceptance_status = 'rejected';
        $this->rejection_reason = $reason;
        if ($user) {
            $this->rejected_by = $user->id;
        }
        $this->rejected_at = now();
        return $this->save();
    }

    public function resetAcceptance(): bool
    {
        // Reset về pending nếu chưa được approve/reject
        if ($this->acceptance_status === 'approved' || $this->acceptance_status === 'rejected') {
            return false;
        }

        $this->acceptance_status = 'pending';
        $this->approved_by = null;
        $this->approved_at = null;
        $this->rejected_by = null;
        $this->rejected_at = null;
        $this->rejection_reason = null;
        return $this->save();
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeOrdered($query)
    {
        return $query->orderBy('order');
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('acceptance_status', $status);
    }

    public function scopeCompleted($query)
    {
        return $query->whereDate('end_date', '<=', now());
    }

    public function scopePending($query)
    {
        return $query->where('acceptance_status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('acceptance_status', 'approved');
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($item) {
            if (empty($item->uuid)) {
                $item->uuid = Str::uuid();
            }
            // Auto set status based on dates
            if ($item->end_date && $item->end_date->toDateString() <= now()->toDateString()) {
                if ($item->acceptance_status === 'not_started') {
                    $item->acceptance_status = 'pending';
                }
            }
        });

        static::saving(function ($item) {
            // Auto update status when end_date passes
            if ($item->end_date && $item->end_date->toDateString() <= now()->toDateString()) {
                if ($item->acceptance_status === 'not_started') {
                    $item->acceptance_status = 'pending';
                }
            }
        });
    }
}

