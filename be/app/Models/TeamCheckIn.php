<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class TeamCheckIn extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'team_leader_id',
        'project_id',
        'work_date',
        'shift',
        'team_name',
        'notes',
        'is_offline',
        'synced_at',
        'status',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'work_date' => 'date',
        'is_offline' => 'boolean',
        'synced_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function teamLeader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'team_leader_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function timeTrackings(): HasMany
    {
        return $this->hasMany(TimeTracking::class);
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function approve(?User $user = null): bool
    {
        $this->status = 'approved';
        if ($user) {
            $this->approved_by = $user->id;
        }
        $this->approved_at = now();
        return $this->save();
    }

    public function reject(?User $user = null): bool
    {
        $this->status = 'rejected';
        if ($user) {
            $this->approved_by = $user->id;
        }
        $this->approved_at = now();
        return $this->save();
    }

    public function sync(): bool
    {
        $this->is_offline = false;
        $this->synced_at = now();
        return $this->save();
    }
}
