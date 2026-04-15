<?php

namespace App\Services;

use App\Models\LaborProductivity;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Exception;

class LaborProductivityService
{
    /**
     * Create or update a productivity record
     */
    public function upsert(array $data, ?LaborProductivity $record = null, User $actor): LaborProductivity
    {
        if ($record) {
            $record->update($data);
        } else {
            $data['created_by'] = $actor->id;
            $record = LaborProductivity::create($data);
        }

        return $record->load(['user:id,name', 'task:id,name']);
    }

    /**
     * Get dashboard data for project
     */
    public function getDashboardData(int $projectId, array $filters = []): array
    {
        $query = LaborProductivity::forProject($projectId);

        if (!empty($filters['from'])) $query->where('record_date', '>=', $filters['from']);
        if (!empty($filters['to'])) $query->where('record_date', '<=', $filters['to']);

        $records = $query->with('user:id,name')->get();

        // Summary stats
        $summary = [
            'total_records'         => $records->count(),
            'total_workers'         => $records->unique('user_id')->count(),
            'avg_efficiency'        => round($records->avg('efficiency_percent') ?? 0, 1),
            'avg_productivity_rate' => round($records->avg('productivity_rate') ?? 0, 2),
            'total_planned'         => $records->sum('planned_quantity'),
            'total_actual'          => $records->sum('actual_quantity'),
            'total_hours'           => $records->sum(fn($r) => (int)$r->workers_count * (float)$r->hours_spent),
        ];

        // By User statistics
        $byUser = $records->groupBy('user_id')->map(function ($userRecords) {
            $user = $userRecords->first()->user;
            return [
                'user_id'          => $user?->id,
                'user_name'        => $user?->name ?? '—',
                'records_count'    => $userRecords->count(),
                'avg_efficiency'   => round($userRecords->avg('efficiency_percent'), 1),
                'avg_productivity' => round($userRecords->avg('productivity_rate'), 2),
                'total_actual'     => $userRecords->sum('actual_quantity'),
                'total_hours'      => $userRecords->sum(fn($r) => (int)$r->workers_count * (float)$r->hours_spent),
            ];
        })->sortByDesc('avg_efficiency')->values();

        // By Work Item statistics
        $byItem = $records->groupBy('work_item')->map(function ($itemRecords, $item) {
            return [
                'work_item'      => $item,
                'unit'           => $itemRecords->first()->unit,
                'records_count'  => $itemRecords->count(),
                'avg_efficiency' => round($itemRecords->avg('efficiency_percent'), 1),
                'total_planned'  => $itemRecords->sum('planned_quantity'),
                'total_actual'   => $itemRecords->sum('actual_quantity'),
            ];
        })->values();

        // Trend over time
        $trend = $records->groupBy(fn($r) => $r->record_date->format('Y-m-d'))
            ->map(function ($dayRecords, $date) {
                return [
                    'date'           => $date,
                    'avg_efficiency' => round($dayRecords->avg('efficiency_percent'), 1),
                    'records_count'  => $dayRecords->count(),
                    'total_actual'   => $dayRecords->sum('actual_quantity'),
                ];
            })->sortKeys()->values();

        return [
            'summary' => $summary,
            'by_user' => $byUser,
            'by_item' => $byItem,
            'trend'   => $trend,
        ];
    }
}
