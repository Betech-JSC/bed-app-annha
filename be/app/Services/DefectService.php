<?php

namespace App\Services;

use App\Models\Defect;
use App\Models\DefectHistory;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class DefectService
{
    /**
     * Create or update a defect.
     */
    public function upsertDefect(array $data, ?Defect $defect = null, ?User $actor = null): Defect
    {
        // BUSINESS RULE: Auto-link task_id from acceptance_stage if provided
        $taskId = $data['task_id'] ?? null;
        if (!$taskId && isset($data['acceptance_stage_id'])) {
            $acceptanceStage = \App\Models\AcceptanceStage::find($data['acceptance_stage_id']);
            if ($acceptanceStage && $acceptanceStage->task_id) {
                $taskId = $acceptanceStage->task_id;
            }
        }

        $payload = [
            'project_id' => $data['project_id'] ?? ($defect ? $defect->project_id : null),
            'task_id' => $taskId,
            'acceptance_stage_id' => $data['acceptance_stage_id'] ?? null,
            'acceptance_template_id' => $data['acceptance_template_id'] ?? null,
            'defect_type' => $data['defect_type'] ?? 'other',
            'description' => $data['description'] ?? ($defect ? $defect->description : null),
            'severity' => $data['severity'] ?? ($defect ? $defect->severity : 'medium'),
            'status' => $data['status'] ?? ($defect ? $defect->status : 'open'),
        ];

        return DB::transaction(function () use ($payload, $defect, $actor, $data) {
            if (!$defect) {
                $payload['reported_by'] = $actor->id ?? null;
                $defect = Defect::create($payload);

                $this->logHistory($defect, 'created', 'open', $actor);
            } else {
                $oldStatus = $defect->status;
                $defect->update($payload);

                if (isset($payload['status']) && $oldStatus !== $payload['status']) {
                    $this->logHistory($defect, 'status_changed', $payload['status'], $actor, $oldStatus);
                }
            }

            // Sync violated criteria if provided
            if (isset($data['violated_criteria_ids'])) {
                $defect->violatedCriteria()->sync($data['violated_criteria_ids']);
            }

            return $defect;
        });
    }

    /**
     * Centralized status transition logic with validation and history logging.
     */
    public function transitionStatus(Defect $defect, string $status, User $actor, array $params = []): void
    {
        $oldStatus = $defect->status;
        if ($oldStatus === $status) return;

        DB::transaction(function () use ($defect, $status, $actor, $params, $oldStatus) {
            switch ($status) {
                case 'in_progress':
                    if (isset($params['rejection_reason'])) {
                        // Rejection loop
                        $defect->markAsRejected($actor, $params['rejection_reason']);
                        $this->logHistory($defect, 'rejected', 'in_progress', $actor, $oldStatus);
                    } else {
                        $defect->markAsInProgress($actor);
                        if (isset($params['expected_completion_date'])) {
                            $defect->update(['expected_completion_date' => $params['expected_completion_date']]);
                        }
                        $this->logHistory($defect, 'status_changed', 'in_progress', $actor, $oldStatus);
                    }
                    break;

                case 'fixed':
                    $defect->markAsFixed($actor);
                    $this->logHistory($defect, 'status_changed', 'fixed', $actor, $oldStatus);
                    break;

                case 'verified':
                    $defect->markAsVerified($actor);
                    $this->logHistory($defect, 'status_changed', 'verified', $actor, $oldStatus);
                    break;

                default:
                    $defect->update(['status' => $status]);
                    $this->logHistory($defect, 'status_changed', $status, $actor, $oldStatus);
                    break;
            }
        });
    }

    /**
     * Update status for specific violated criteria.
     */
    public function verifyCriteria(Defect $defect, array $criteriaData, User $actor): void
    {
        foreach ($criteriaData as $item) {
            $defect->violatedCriteria()->updateExistingPivot($item['id'], [
                'status' => $item['status'],
                'verified_at' => now(),
                'verified_by' => $actor->id,
            ]);
        }
    }

    /**
     * Get defects with filtering and full relations
     */
    public function getDefects(\App\Models\Project $project, array $filters = []): \Illuminate\Support\Collection
    {
        $query = $project->defects()
            ->with([
                'reporter',
                'fixer',
                'verifier',
                'task',
                'acceptanceStage',
                'violatedCriteria',
                'attachments' => function ($q) {
                    $q->orderBy('description')->orderBy('created_at');
                }
            ]);

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['severity'])) {
            $query->where('severity', $filters['severity']);
        }

        return $query->orderByDesc('created_at')->get();
    }

    /**
     * Internal helper to log history.
     */
    private function logHistory(Defect $defect, string $action, string $newStatus, ?User $actor, ?string $oldStatus = null): void
    {
        DefectHistory::create([
            'defect_id' => $defect->id,
            'action' => $action,
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'user_id' => $actor?->id,
        ]);
    }
}
