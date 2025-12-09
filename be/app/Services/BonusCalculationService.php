<?php

namespace App\Services;

use App\Models\User;
use App\Models\Project;
use App\Models\Bonus;
use App\Models\ProjectProgress;
use Illuminate\Support\Facades\DB;

class BonusCalculationService
{
    /**
     * Tự động tính thưởng từ % hoàn thành dự án
     */
    public function calculateFromProjectCompletion(User $user, Project $project): ?Bonus
    {
        $completionPercentage = $this->getProjectCompletionPercentage($project);

        if ($completionPercentage <= 0) {
            return null;
        }

        // Base bonus amount (can be configured per project or user)
        $baseAmount = 1000000; // 1M VND default

        // Apply bonus formula based on completion percentage
        $bonusAmount = $this->applyBonusFormula($completionPercentage, $baseAmount);

        if ($bonusAmount <= 0) {
            return null;
        }

        // Check if bonus already exists for this project and user
        $existingBonus = Bonus::forUser($user->id)
            ->forProject($project->id)
            ->where('calculation_method', 'auto')
            ->where('bonus_type', 'project_completion')
            ->first();

        if ($existingBonus) {
            // Update existing bonus
            $existingBonus->update([
                'amount' => $bonusAmount,
                'project_completion_percentage' => $completionPercentage,
                'description' => "Thưởng tự động từ dự án {$project->name} - Hoàn thành {$completionPercentage}%",
            ]);
            return $existingBonus;
        }

        // Create new bonus
        $bonus = Bonus::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'bonus_type' => 'project_completion',
            'amount' => $bonusAmount,
            'calculation_method' => 'auto',
            'project_completion_percentage' => $completionPercentage,
            'description' => "Thưởng tự động từ dự án {$project->name} - Hoàn thành {$completionPercentage}%",
            'status' => 'pending',
        ]);

        return $bonus;
    }

    /**
     * Lấy % hoàn thành từ ProjectProgress
     */
    public function getProjectCompletionPercentage(Project $project): float
    {
        $progress = $project->progress;

        if (!$progress) {
            return 0;
        }

        return (float) $progress->overall_percentage ?? 0;
    }

    /**
     * Áp dụng công thức tính thưởng
     * 
     * Formula: 
     * - 0-50%: 0% of base
     * - 50-75%: 25% of base
     * - 75-90%: 50% of base
     * - 90-100%: 100% of base
     */
    public function applyBonusFormula(float $percentage, float $baseAmount): float
    {
        if ($percentage < 50) {
            return 0;
        } elseif ($percentage < 75) {
            return $baseAmount * 0.25;
        } elseif ($percentage < 90) {
            return $baseAmount * 0.5;
        } else {
            return $baseAmount;
        }
    }

    /**
     * Tính thưởng cho tất cả nhân viên trong dự án
     */
    public function calculateBonusesForProject(Project $project): array
    {
        $personnel = $project->personnel()->with('user')->get();
        $bonuses = [];

        foreach ($personnel as $person) {
            try {
                $bonus = $this->calculateFromProjectCompletion($person->user, $project);
                if ($bonus) {
                    $bonuses[] = $bonus;
                }
            } catch (\Exception $e) {
                // Log error but continue
                \Log::error("Error calculating bonus for user {$person->user_id} in project {$project->id}: " . $e->getMessage());
            }
        }

        return $bonuses;
    }
}
