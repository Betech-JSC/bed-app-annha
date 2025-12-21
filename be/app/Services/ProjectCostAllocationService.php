<?php

namespace App\Services;

use App\Models\TimeTracking;
use App\Models\Cost;
use App\Models\EmployeeSalaryConfig;
use Carbon\Carbon;

class ProjectCostAllocationService
{
    /**
     * Allocate personnel cost to project when time tracking is approved
     */
    public function allocatePersonnelCost(TimeTracking $timeTracking): ?Cost
    {
        // Only allocate if project_id is set
        if (!$timeTracking->project_id) {
            return null;
        }

        // Get salary config for the user at the time of check-in
        $checkInDate = $timeTracking->check_in_at->toDateString();
        $config = EmployeeSalaryConfig::forUser($timeTracking->user_id)
            ->where('effective_from', '<=', $checkInDate)
            ->where(function ($q) use ($checkInDate) {
                $q->whereNull('effective_to')
                    ->orWhere('effective_to', '>=', $checkInDate);
            })
            ->orderByDesc('effective_from')
            ->first();

        if (!$config) {
            // No salary config found, skip allocation
            return null;
        }

        // Calculate overtime hours
        $overtimeData = $timeTracking->calculateOvertimeHours();
        $regularHours = $overtimeData['regular_hours'];
        $overtimeHours = $overtimeData['overtime_hours'];

        // Determine rates
        $hourlyRate = 0;
        $overtimeRate = 0;

        if ($config->salary_type === 'hourly' && $config->hourly_rate) {
            $hourlyRate = $config->hourly_rate;
        } elseif ($config->salary_type === 'daily' && $config->daily_rate) {
            // For daily rate, calculate hourly equivalent
            $hourlyRate = $config->daily_rate / 8;
        }

        // Use overtime_rate from config if set, otherwise use hourly rate
        if ($config->overtime_rate) {
            $overtimeRate = $config->overtime_rate;
        } else {
            $overtimeRate = $hourlyRate;
        }

        // Calculate total cost: regular hours × hourly rate + overtime hours × overtime rate
        $regularCost = $regularHours * $hourlyRate;
        $overtimeCost = $overtimeHours * $overtimeRate;
        $totalCost = $regularCost + $overtimeCost;

        // Load user if not already loaded
        if (!$timeTracking->relationLoaded('user')) {
            $timeTracking->load('user');
        }

        $userName = $timeTracking->user ? $timeTracking->user->name : "User #{$timeTracking->user_id}";

        // Create cost record
        $cost = Cost::create([
            'project_id' => $timeTracking->project_id,
            'category' => 'labor',
            'name' => "Nhân công - {$userName} - " . $timeTracking->check_in_at->format('d/m/Y'),
            'amount' => round($totalCost, 2),
            'description' => "Chi phí nhân công từ chấm công. Giờ làm việc: {$regularHours}h, Tăng ca: {$overtimeHours}h",
            'cost_date' => $timeTracking->check_in_at->toDateString(),
            'status' => 'pending_management_approval', // Requires approval workflow
            'created_by' => $timeTracking->approved_by ?? $timeTracking->user_id, // Use approver or user
        ]);

        return $cost;
    }
}

