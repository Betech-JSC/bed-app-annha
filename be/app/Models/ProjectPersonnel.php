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
        'role_id',
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

    public function personnelRole(): BelongsTo
    {
        return $this->belongsTo(PersonnelRole::class, 'role_id');
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

    /**
     * Get role code (backward compatibility)
     */
    public function getRoleAttribute(): ?string
    {
        return $this->personnelRole?->code;
    }

    public function canView(): bool
    {
        $roleCode = $this->personnelRole?->code;
        if (!$roleCode) {
            return false;
        }
        
        return in_array($roleCode, [
            'project_manager',
            'supervisor',
            'accountant',
            'viewer',
            'editor',
            'management',
            'team_leader',
            'worker',
            'guest',
            'supervisor_guest',
            'designer',
        ]);
    }

    public function canEdit(): bool
    {
        $roleCode = $this->personnelRole?->code;
        if (!$roleCode) {
            return false;
        }
        
        return in_array($roleCode, [
            'project_manager',
            'supervisor',
            'editor',
            'management',
            'team_leader',
            'designer',
        ]);
    }

    public function canApprove(): bool
    {
        $roleCode = $this->personnelRole?->code;
        if (!$roleCode) {
            return false;
        }
        
        return in_array($roleCode, [
            'project_manager',
            'supervisor',
            'management',
            'supervisor_guest',
        ]);
    }

    public function canViewFinancial(): bool
    {
        $roleCode = $this->personnelRole?->code;
        if (!$roleCode) {
            return false;
        }
        
        return in_array($roleCode, [
            'project_manager',
            'accountant',
            'management',
        ]);
    }

    public function canApproveFinancial(): bool
    {
        $roleCode = $this->personnelRole?->code;
        if (!$roleCode) {
            return false;
        }
        
        return in_array($roleCode, [
            'project_manager',
            'accountant',
            'management',
        ]);
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeByRole($query, $roleCode)
    {
        return $query->whereHas('personnelRole', function ($q) use ($roleCode) {
            $q->where('code', $roleCode);
        });
    }
}
