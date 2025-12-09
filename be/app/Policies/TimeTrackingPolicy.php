<?php

namespace App\Policies;

use App\Models\TimeTracking;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class TimeTrackingPolicy
{
    /**
     * Determine if the user can view any time trackings.
     */
    public function viewAny(User $user): bool
    {
        return $this->isHROrAdmin($user);
    }

    /**
     * Determine if the user can view the time tracking.
     */
    public function view(User $user, TimeTracking $timeTracking): bool
    {
        // HR/admin can view all
        if ($this->isHROrAdmin($user)) {
            return true;
        }

        // User can only view their own
        return $timeTracking->user_id === $user->id;
    }

    /**
     * Determine if the user can create time trackings.
     */
    public function create(User $user): bool
    {
        // Any authenticated user can create their own time tracking
        return true;
    }

    /**
     * Determine if the user can update the time tracking.
     */
    public function update(User $user, TimeTracking $timeTracking): bool
    {
        // HR/admin can update all
        if ($this->isHROrAdmin($user)) {
            return true;
        }

        // User can only update their own
        return $timeTracking->user_id === $user->id;
    }

    /**
     * Determine if the user can delete the time tracking.
     */
    public function delete(User $user, TimeTracking $timeTracking): bool
    {
        return $this->isHROrAdmin($user);
    }

    /**
     * Determine if the user can approve the time tracking.
     */
    public function approve(User $user, TimeTracking $timeTracking): bool
    {
        return $this->isHROrAdmin($user);
    }

    /**
     * Check if user is HR or Admin
     */
    protected function isHROrAdmin(User $user): bool
    {
        $hasHRRole = DB::table('role_user')
            ->join('roles', 'role_user.role_id', '=', 'roles.id')
            ->where('role_user.user_id', $user->id)
            ->where(function ($q) {
                $q->where('roles.name', 'hr')
                    ->orWhere('roles.name', 'admin');
            })
            ->exists();

        return $hasHRRole || $user->role === 'admin';
    }
}
