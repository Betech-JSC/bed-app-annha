<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectProgress;
use App\Models\ConstructionLog;
use App\Models\Subcontractor;

class ProgressCalculationService
{
    /**
     * Tính tiến độ từ nhật ký công trình
     */
    public function calculateFromLogs(Project $project): float
    {
        $latestLog = $project->constructionLogs()
            ->orderBy('log_date', 'desc')
            ->first();

        if (!$latestLog) {
            return 0;
        }

        $progress = $project->progress;
        if (!$progress) {
            $progress = $project->progress()->create([
                'overall_percentage' => 0,
                'calculated_from' => 'logs',
            ]);
        }

        $progress->calculateFromLogs();

        return $progress->overall_percentage;
    }

    /**
     * Tính tiến độ từ nhà thầu phụ
     */
    public function calculateFromSubcontractors(Project $project): float
    {
        $subcontractors = $project->subcontractors;

        if ($subcontractors->isEmpty()) {
            return 0;
        }

        $progress = $project->progress;
        if (!$progress) {
            $progress = $project->progress()->create([
                'overall_percentage' => 0,
                'calculated_from' => 'subcontractors',
            ]);
        }

        $progress->calculateFromSubcontractors();

        return $progress->overall_percentage;
    }

    /**
     * Tính tiến độ tự động (ưu tiên logs, fallback subcontractors)
     */
    public function calculateAuto(Project $project): float
    {
        // Try logs first
        $hasLogs = $project->constructionLogs()->exists();
        if ($hasLogs) {
            return $this->calculateFromLogs($project);
        }

        // Fallback to subcontractors
        $hasSubcontractors = $project->subcontractors()->exists();
        if ($hasSubcontractors) {
            return $this->calculateFromSubcontractors($project);
        }

        return 0;
    }

    /**
     * Tính tiến độ trung bình từ cả logs và subcontractors
     */
    public function calculateAverage(Project $project): float
    {
        $logProgress = $this->calculateFromLogs($project);
        $subcontractorProgress = $this->calculateFromSubcontractors($project);

        if ($logProgress > 0 && $subcontractorProgress > 0) {
            $average = ($logProgress + $subcontractorProgress) / 2;

            $progress = $project->progress;
            if (!$progress) {
                $progress = $project->progress()->create([
                    'overall_percentage' => 0,
                    'calculated_from' => 'manual',
                ]);
            }

            $progress->updateManual($average);
            $progress->calculated_from = 'logs,subcontractors';
            $progress->save();

            return $average;
        }

        return max($logProgress, $subcontractorProgress);
    }
}
