<?php

namespace App\Services;

use App\Models\Payroll;
use App\Models\TimeTracking;
use Illuminate\Support\Collection;
use Carbon\Carbon;

class ExportService
{
    /**
     * Export bảng lương ra Excel
     * Note: Requires maatwebsite/excel package
     */
    public function exportPayrollToExcel(Collection $payrolls, string $period): string
    {
        // This is a placeholder - actual implementation requires maatwebsite/excel
        // For now, return a message indicating the feature needs the package

        $filename = 'payroll_' . $period . '_' . now()->format('Y-m-d') . '.xlsx';

        // TODO: Implement actual Excel export when maatwebsite/excel is installed
        // Example:
        // return Excel::download(new PayrollExport($payrolls), $filename);

        throw new \Exception("Excel export requires maatwebsite/excel package. Please install it first: composer require maatwebsite/excel");
    }

    /**
     * Export bảng lương ra PDF
     * Note: Requires barryvdh/laravel-dompdf package
     */
    public function exportPayrollToPDF(Collection $payrolls, string $period): string
    {
        // This is a placeholder - actual implementation requires barryvdh/laravel-dompdf
        // For now, return a message indicating the feature needs the package

        $filename = 'payroll_' . $period . '_' . now()->format('Y-m-d') . '.pdf';

        // TODO: Implement actual PDF export when barryvdh/laravel-dompdf is installed
        // Example:
        // $pdf = PDF::loadView('hr.payroll-pdf', ['payrolls' => $payrolls, 'period' => $period]);
        // return $pdf->download($filename);

        throw new \Exception("PDF export requires barryvdh/laravel-dompdf package. Please install it first: composer require barryvdh/laravel-dompdf");
    }

    /**
     * Export chấm công ra Excel
     */
    public function exportTimeTrackingToExcel(Collection $timeTrackings, Carbon $startDate, Carbon $endDate): string
    {
        $filename = 'time_tracking_' . $startDate->format('Y-m-d') . '_to_' . $endDate->format('Y-m-d') . '.xlsx';

        // TODO: Implement actual Excel export when maatwebsite/excel is installed

        throw new \Exception("Excel export requires maatwebsite/excel package. Please install it first: composer require maatwebsite/excel");
    }

    /**
     * Prepare payroll data for export (helper method)
     */
    public function preparePayrollData(Collection $payrolls): array
    {
        return $payrolls->map(function ($payroll) {
            return [
                'uuid' => $payroll->uuid,
                'employee_name' => $payroll->user->name ?? 'N/A',
                'employee_email' => $payroll->user->email ?? 'N/A',
                'period' => $payroll->period_start->format('d/m/Y') . ' - ' . $payroll->period_end->format('d/m/Y'),
                'base_salary' => number_format($payroll->base_salary, 2),
                'total_hours' => number_format($payroll->total_hours, 2),
                'overtime_hours' => number_format($payroll->overtime_hours, 2),
                'bonus_amount' => number_format($payroll->bonus_amount, 2),
                'gross_salary' => number_format($payroll->gross_salary, 2),
                'tax' => number_format($payroll->tax, 2),
                'net_salary' => number_format($payroll->net_salary, 2),
                'status' => $payroll->status,
            ];
        })->toArray();
    }

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
