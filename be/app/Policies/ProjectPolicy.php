<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\ProjectPersonnel;
use App\Models\User;

class ProjectPolicy
{
    /**
     * Determine if the user can view any projects.
     */
    public function viewAny(User $user): bool
    {
        // Any authenticated user can view projects they have access to
        return true;
    }

    /**
     * Determine if the user can view the project.
     */
    public function view(User $user, Project $project): bool
    {
        // Super admin can view all
        if ($user->role === 'admin' && $user->owner === true) {
            return true;
        }

        // Customer (owner) can always view
        if ($project->customer_id === $user->id) {
            return true;
        }

        // Project manager can always view
        if ($project->project_manager_id === $user->id) {
            return true;
        }

        // Check if user is in project personnel
        $personnel = ProjectPersonnel::where('project_id', $project->id)
            ->where('user_id', $user->id)
            ->first();

        return $personnel && $personnel->canView();
    }

    /**
     * Determine if the user can create projects.
     */
    public function create(User $user): bool
    {
        // Super admin can always create
        if ($user->role === 'admin' && $user->owner === true) {
            return true;
        }

        // Any authenticated user can create a project
        return true;
    }

    /**
     * Determine if the user can update the project.
     */
    public function update(User $user, Project $project): bool
    {
        // Super admin can always update
        if ($user->role === 'admin' && $user->owner === true) {
            return true;
        }

        // Customer (owner) can always update
        if ($project->customer_id === $user->id) {
            return true;
        }

        // Project manager can always update
        if ($project->project_manager_id === $user->id) {
            return true;
        }

        // Check if user is in project personnel with edit permission
        $personnel = ProjectPersonnel::where('project_id', $project->id)
            ->where('user_id', $user->id)
            ->first();

        return $personnel && $personnel->canEdit();
    }

    /**
     * Determine if the user can delete the project.
     */
    public function delete(User $user, Project $project): bool
    {
        // Super admin can always delete
        if ($user->role === 'admin' && $user->owner === true) {
            return true;
        }

        // Only customer (owner) can delete
        return $project->customer_id === $user->id;
    }

    /**
     * Determine if the user can approve items in the project.
     */
    public function approve(User $user, Project $project): bool
    {
        // Super admin can always approve
        if ($user->role === 'admin' && $user->owner === true) {
            return true;
        }

        // Customer (owner) can always approve
        if ($project->customer_id === $user->id) {
            return true;
        }

        // Project manager can always approve
        if ($project->project_manager_id === $user->id) {
            return true;
        }

        // Check if user is in project personnel with approve permission
        $personnel = ProjectPersonnel::where('project_id', $project->id)
            ->where('user_id', $user->id)
            ->first();

        return $personnel && $personnel->canApprove();
    }
}
