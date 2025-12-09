<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectPersonnel extends Model
{
    protected $table = 'project_personnel';

    protected $fillable = [
        'project_id',
        'user_id',
        'role',
        'permissions',
        'assigned_by',
        'assigned_at',
    ];

    protected $casts = [
        'permissions' => 'array',
        'assigned_at' => 'datetime',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function hasPermission(string $permission): bool
    {
        if (!$this->permissions) {
            return false;
        }
        return in_array($permission, $this->permissions);
    }

    public function canView(): bool
    {
        return in_array($this->role, ['project_manager', 'supervisor', 'accountant', 'viewer', 'editor']);
    }

    public function canEdit(): bool
    {
        return in_array($this->role, ['project_manager', 'supervisor', 'editor']);
    }

    public function canApprove(): bool
    {
        return in_array($this->role, ['project_manager', 'supervisor']);
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeByRole($query, $role)
    {
        return $query->where('role', $role);
    }
}
