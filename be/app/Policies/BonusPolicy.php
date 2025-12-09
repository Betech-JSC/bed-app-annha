<?php

namespace App\Policies;

use App\Models\Bonus;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class BonusPolicy
{
    /**
     * Determine if the user can view any bonuses.
     */
    public function viewAny(User $user): bool
    {
        // HR/admin can view all, users can view their own (handled in controller)
        return true;
    }

    /**
     * Determine if the user can view the bonus.
     */
    public function view(User $user, Bonus $bonus): bool
    {
        // HR/admin can view all
        if ($this->isHROrAdmin($user)) {
            return true;
        }

        // User can only view their own
        return $bonus->user_id === $user->id;
    }

    /**
     * Determine if the user can create bonuses.
     */
    public function create(User $user): bool
    {
        return $this->isHROrAdmin($user);
    }

    /**
     * Determine if the user can update the bonus.
     */
    public function update(User $user, Bonus $bonus): bool
    {
        return $this->isHROrAdmin($user);
    }

    /**
     * Determine if the user can delete the bonus.
     */
    public function delete(User $user, Bonus $bonus): bool
    {
        return $this->isHROrAdmin($user);
    }

    /**
     * Determine if the user can approve the bonus.
     */
    public function approve(User $user, Bonus $bonus): bool
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
