<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Team extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'name',
        'code',
        'type',
        'project_id',
        'team_leader_id',
        'subcontractor_id',
        'description',
        'member_count',
        'status',
    ];

    protected $casts = [
        'member_count' => 'integer',
    ];

    protected $appends = [
        'type_label',
        'status_label',
    ];

    // ==================================================================
    // RELATIONSHIPS
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function teamLeader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'team_leader_id');
    }

    public function subcontractor(): BelongsTo
    {
        return $this->belongsTo(Subcontractor::class);
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'team_members')
            ->withPivot('role', 'joined_date', 'left_date', 'is_active', 'notes')
            ->withTimestamps()
            ->wherePivot('is_active', true);
    }

    public function allMembers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'team_members')
            ->withPivot('role', 'joined_date', 'left_date', 'is_active', 'notes')
            ->withTimestamps();
    }

    public function contracts(): HasMany
    {
        return $this->hasMany(TeamContract::class);
    }

    public function workVolumes(): HasMany
    {
        return $this->hasMany(WorkVolume::class);
    }

    // ==================================================================
    // ACCESSORS
    // ==================================================================

    public function getTypeLabelAttribute(): string
    {
        return match ($this->type) {
            'team' => 'Đội nội bộ',
            'subcontractor' => 'Thầu phụ',
            default => ucfirst($this->type),
        };
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'active' => 'Hoạt động',
            'inactive' => 'Tạm ngưng',
            'disbanded' => 'Giải thể',
            default => ucfirst($this->status),
        };
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function addMember(User $user, string $role = 'member'): void
    {
        $this->members()->syncWithoutDetaching([
            $user->id => [
                'role' => $role,
                'joined_date' => now()->toDateString(),
                'is_active' => true,
            ],
        ]);
        $this->increment('member_count');
    }

    public function removeMember(User $user): void
    {
        $this->allMembers()->updateExistingPivot($user->id, [
            'is_active' => false,
            'left_date' => now()->toDateString(),
        ]);
        $this->decrement('member_count');
    }

    // ==================================================================
    // SCOPES
    // ==================================================================

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function scopeByProject($query, int $projectId)
    {
        return $query->where('project_id', $projectId);
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($team) {
            if (empty($team->uuid)) {
                $team->uuid = Str::uuid();
            }
        });
    }
}
