<?php

namespace App\Policies;

use App\Models\Payroll;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class PayrollPolicy
{
    /**
     * Determine if the user can view any payrolls.
     */
    public function viewAny(User $user): bool
    {
        // HR/admin can view all, users can view their own (handled in controller)
        return true;
    }

    /**
     * Determine if the user can view the payroll.
     */
    public function view(User $user, Payroll $payroll): bool
    {
        // HR/admin can view all
        if ($this->isHROrAdmin($user)) {
            return true;
        }

        // User can only view their own
        return $payroll->user_id === $user->id;
    }

    /**
     * Determine if the user can create payrolls.
     */
    public function create(User $user): bool
    {
        return $this->isHROrAdmin($user);
    }

    /**
     * Determine if the user can update the payroll.
     */
    public function update(User $user, Payroll $payroll): bool
    {
        return $this->isHROrAdmin($user);
    }

    /**
     * Determine if the user can delete the payroll.
     */
    public function delete(User $user, Payroll $payroll): bool
    {
        return $this->isHROrAdmin($user);
    }

    /**
     * Determine if the user can approve the payroll.
     */
    public function approve(User $user, Payroll $payroll): bool
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
