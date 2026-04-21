<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectRisk;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProjectRiskService
{
    /**
     * Create or update a project risk
     */
    public function upsert(array $data, ?ProjectRisk $risk = null, $user = null): ProjectRisk
    {
        return DB::transaction(function () use ($data, $risk, $user) {
            $isNew = !$risk;
            
            if ($isNew) {
                $risk = new ProjectRisk();
                $risk->status = 'identified';
                $risk->identified_by = $user ? $user->id : null;
                $risk->identified_date = now();
                $risk->uuid = (string) Str::uuid();
            } else {
                $risk->updated_by = $user ? $user->id : null;
            }

            $risk->fill($data);
            $risk->save();

            // If status is closed, ensure resolved_date is set
            if ($risk->status === 'closed' && !$risk->resolved_date) {
                $risk->markAsResolved();
            }

            return $risk->fresh(['owner', 'identifier', 'updater']);
        });
    }

    /**
     * Resolve a risk
     */
    public function resolve(ProjectRisk $risk): bool
    {
        return $risk->markAsResolved();
    }

    /**
     * Get risks with filtering
     */
    public function getRisks(Project $project, array $filters = []): \Illuminate\Support\Collection
    {
        $query = $project->risks()
            ->with([
                'owner',
                'identifier',
                'updater',
            ]);

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        if (!empty($filters['risk_level']) && $filters['risk_level'] === 'high') {
            $query->highRisk();
        }

        if (!empty($filters['active_only']) && ($filters['active_only'] === 'true' || $filters['active_only'] === true)) {
            $query->active();
        }

        return $query->orderByDesc('created_at')->get();
    }
}
