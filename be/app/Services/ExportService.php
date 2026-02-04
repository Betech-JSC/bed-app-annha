<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Carbon\Carbon;

class ExportService
{
    // Payroll export methods removed - HR module deleted

    // Payroll PDF export removed - HR module deleted

    /**
     * Export chấm công ra Excel
     */
    public function exportTimeTrackingToExcel(Collection $timeTrackings, Carbon $startDate, Carbon $endDate): string
    {
        $filename = 'time_tracking_' . $startDate->format('Y-m-d') . '_to_' . $endDate->format('Y-m-d') . '.xlsx';

        // TODO: Implement actual Excel export when maatwebsite/excel is installed

        throw new \Exception("Excel export requires maatwebsite/excel package. Please install it first: composer require maatwebsite/excel");
    }

    // Payroll data preparation removed - HR module deleted

    /**
     * Prepare time tracking data for export (helper method)
     */
    public function prepareTimeTrackingData(Collection $timeTrackings): array
    {
        return $timeTrackings->map(function ($tracking) {
            return [
                'id' => $tracking->id,
                'employee_name' => $tracking->user->name ?? 'N/A',
                'project_name' => $tracking->project->name ?? 'N/A',
                'check_in_at' => $tracking->check_in_at->format('d/m/Y H:i'),
                'check_out_at' => $tracking->check_out_at ? $tracking->check_out_at->format('d/m/Y H:i') : 'N/A',
                'check_in_location' => $tracking->check_in_location ?? 'N/A',
                'check_out_location' => $tracking->check_out_location ?? 'N/A',
                'total_hours' => number_format($tracking->total_hours ?? 0, 2),
                'status' => $tracking->status,
            ];
        })->toArray();
    }
}
