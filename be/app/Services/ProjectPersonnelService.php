<?php

namespace App\Services;

use App\Models\ProjectPersonnel;
use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ProjectPersonnelService
{
    /**
     * Assign personnel to a project
     */
    public function assign(Project $project, int $userId, ?int $roleId, ?array $permissions = null, $assigner = null): ProjectPersonnel
    {
        return DB::transaction(function () use ($project, $userId, $roleId, $permissions, $assigner) {
            $personnel = ProjectPersonnel::updateOrCreate(
                [
                    'project_id' => $project->id,
                    'user_id' => $userId,
                ],
                [
                    'role_id' => $roleId,
                    'permissions' => $permissions,
                    'assigned_by' => $assigner ? $assigner->id : null,
                    'assigned_at' => now(),
                ]
            );

            return $personnel->load(['user', 'personnelRole', 'assigner']);
        });
    }

    /**
     * Remove personnel from project
     */
    public function remove(Project $project, int $userId): bool
    {
        return ProjectPersonnel::where('project_id', $project->id)
            ->where('user_id', $userId)
            ->delete();
    }

    /**
     * Remove personnel from project by record ID
     */
    public function removeById(int $id): bool
    {
        return ProjectPersonnel::destroy($id);
    }

    /**
     * Update permissions for project personnel
     */
    public function updatePermissions(ProjectPersonnel $personnel, array $permissions): bool
    {
        $personnel->permissions = $permissions;
        return $personnel->save();
    }

    /**
     * Get all personnel for a project
     */
    public function getPersonnelByProject(Project $project): \Illuminate\Support\Collection
    {
        return $project->personnel()
            ->with(['user', 'assigner', 'personnelRole'])
            ->get();
    }
}
