<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class WorkVolume extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'team_id',
        'subcontractor_id',
        'project_id',
        'labor_standard_id',
        'work_item',
        'unit',
        'planned_volume',
        'completed_volume',
        'accepted_volume',
        'work_date',
        'notes',
        'status',
        'verified_by',
        'verified_at',
    ];

    protected $casts = [
        'planned_volume' => 'decimal:2',
        'completed_volume' => 'decimal:2',
        'accepted_volume' => 'decimal:2',
        'work_date' => 'date',
        'verified_at' => 'datetime',
    ];

    protected $appends = [
        'status_label',
        'completion_percentage',
        'acceptance_percentage',
    ];

    // ==================================================================
    // RELATIONSHIPS
    // ==================================================================

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function subcontractor(): BelongsTo
    {
        return $this->belongsTo(Subcontractor::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function laborStandard(): BelongsTo
    {
        return $this->belongsTo(LaborStandard::class);
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function payments(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(SubcontractorPayment::class);
    }

    // ==================================================================
    // ACCESSORS
    // ==================================================================

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'in_progress' => 'Đang thực hiện',
            'completed' => 'Hoàn thành',
            'accepted' => 'Đã nghiệm thu',
            'rejected' => 'Từ chối',
            default => ucfirst($this->status),
        };
    }

    public function getCompletionPercentageAttribute(): float
    {
        if ($this->planned_volume == 0) {
            return 0;
        }
        return ($this->completed_volume / $this->planned_volume) * 100;
    }

    public function getAcceptancePercentageAttribute(): float
    {
        if ($this->planned_volume == 0) {
            return 0;
        }
        return ($this->accepted_volume / $this->planned_volume) * 100;
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
        $this->status = 'accepted';
        $this->accepted_volume = $this->completed_volume; // Tự động nghiệm thu toàn bộ khối lượng hoàn thành
        return $this->save();
    }

    // ==================================================================
    // SCOPES
    // ==================================================================

    public function scopeByTeam($query, int $teamId)
    {
        return $query->where('team_id', $teamId);
    }

    public function scopeBySubcontractor($query, int $subcontractorId)
    {
        return $query->where('subcontractor_id', $subcontractorId);
    }

    public function scopeByProject($query, int $projectId)
    {
        return $query->where('project_id', $projectId);
    }

    public function scopeAccepted($query)
    {
        return $query->where('status', 'accepted');
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($volume) {
            if (empty($volume->uuid)) {
                $volume->uuid = Str::uuid();
            }
        });
    }
}
