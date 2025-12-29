<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectProgress extends Model
{
    protected $fillable = [
        'project_id',
        'overall_percentage',
        'calculated_from',
        'last_calculated_at',
    ];

    protected $casts = [
        'overall_percentage' => 'decimal:2',
        'last_calculated_at' => 'datetime',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function calculateFromLogs(): float
    {
        $latestLog = $this->project->constructionLogs()
            ->orderBy('log_date', 'desc')
            ->first();

        if ($latestLog) {
            $finalProgress = $latestLog->completion_percentage;
            $this->overall_percentage = $finalProgress;
            $this->calculated_from = 'logs';
            $this->last_calculated_at = now();
            $this->save();

            // Tự động cập nhật trạng thái dự án khi tiến độ đạt 100%
            if ($finalProgress >= 100 && $this->project) {
                $project = $this->project;
                if ($project->status !== 'completed') {
                    $project->update([
                        'status' => 'completed',
                        'updated_by' => auth()->id() ?? $project->updated_by,
                    ]);
                }
            }

            return $this->overall_percentage;
        }

        return 0;
    }

    public function calculateFromSubcontractors(): float
    {
        $subcontractors = $this->project->subcontractors;
        if ($subcontractors->isEmpty()) {
            return 0;
        }

        $totalWeight = 0;
        $weightedProgress = 0;

        foreach ($subcontractors as $sub) {
            $weight = $sub->total_quote;
            $progress = match ($sub->progress_status) {
                'completed' => 100,
                'in_progress' => 50,
                'not_started' => 0,
                'delayed' => 25,
                default => 0,
            };

            $totalWeight += $weight;
            $weightedProgress += $weight * $progress;
        }

        if ($totalWeight > 0) {
            $finalProgress = $weightedProgress / $totalWeight;
            $this->overall_percentage = $finalProgress;
        } else {
            $this->overall_percentage = 0;
            $finalProgress = 0;
        }

        $this->calculated_from = 'subcontractors';
        $this->last_calculated_at = now();
        $this->save();

        // Tự động cập nhật trạng thái dự án khi tiến độ đạt 100%
        if ($finalProgress >= 100 && $this->project) {
            $project = $this->project;
            if ($project->status !== 'completed') {
                $project->update([
                    'status' => 'completed',
                    'updated_by' => auth()->id() ?? $project->updated_by,
                ]);
            }
        }

        return $this->overall_percentage;
    }

    public function updateManual(float $percentage): bool
    {
        $finalProgress = max(0, min(100, $percentage));
        $this->overall_percentage = $finalProgress;
        $this->calculated_from = 'manual';
        $this->last_calculated_at = now();
        $saved = $this->save();

        // Tự động cập nhật trạng thái dự án khi tiến độ đạt 100%
        if ($finalProgress >= 100 && $this->project) {
            $project = $this->project;
            if ($project->status !== 'completed') {
                $project->update([
                    'status' => 'completed',
                    'updated_by' => auth()->id() ?? $project->updated_by,
                ]);
            }
        }

        return $saved;
    }

    /**
     * Tính tiến độ dựa trên nghiệm thu
     * Tiến độ được tính dựa trên tỷ lệ hạng mục nghiệm thu đã được approved
     * Mỗi giai đoạn (stage) có trọng số bằng nhau, và trong mỗi giai đoạn, tiến độ được tính theo tỷ lệ items đã approved
     * 
     * @return float|null Trả về null nếu không có nghiệm thu để tính
     */
    public function calculateFromAcceptance(): ?float
    {
        $project = $this->project;
        $stages = $project->acceptanceStages()->with('items')->get();

        if ($stages->isEmpty()) {
            // Nếu không có nghiệm thu, trả về null để dùng nguồn khác
            return null;
        }

        // Lọc các stage có items (bỏ qua stage không có items)
        $stagesWithItems = $stages->filter(function ($stage) {
            return $stage->items->isNotEmpty();
        });

        if ($stagesWithItems->isEmpty()) {
            // Nếu không có stage nào có items, trả về null
            return null;
        }

        $totalStages = $stagesWithItems->count();
        $stageProgresses = [];

        // Tính tiến độ cho từng stage dựa trên tỷ lệ items đã approved
        foreach ($stagesWithItems as $stage) {
            $items = $stage->items;
            $totalItems = $items->count();
            $approvedItems = $items->where('acceptance_status', 'approved')->count();
            
            if ($totalItems > 0) {
                // Tiến độ của stage = tỷ lệ items đã approved
                $stageProgress = ($approvedItems / $totalItems) * 100;
                $stageProgresses[] = $stageProgress;
            }
        }

        if (empty($stageProgresses)) {
            return null;
        }

        // Tiến độ tổng hợp = trung bình tiến độ của tất cả các stage
        // Mỗi stage có trọng số bằng nhau
        $finalProgress = array_sum($stageProgresses) / count($stageProgresses);

        // Đảm bảo chỉ đạt 100% khi TẤT CẢ items trong TẤT CẢ stages đã được approved
        $allItemsApproved = $stagesWithItems->every(function ($stage) {
            return $stage->items->every(function ($item) {
                return $item->acceptance_status === 'approved';
            });
        });

        if (!$allItemsApproved) {
            // Nếu chưa tất cả items được approved, đảm bảo không vượt quá 99.99%
            $finalProgress = min($finalProgress, 99.99);
        } else {
            // Nếu tất cả items đã được approved, đảm bảo đạt 100%
            $finalProgress = 100;
        }

        $this->overall_percentage = round($finalProgress, 2);
        $this->calculated_from = 'acceptance';
        $this->last_calculated_at = now();
        $this->save();

        return $this->overall_percentage;
    }

    /**
     * Tính tiến độ tổng hợp từ nhiều nguồn (ưu tiên nghiệm thu)
     */
    public function calculateOverall(): float
    {
        // Ưu tiên tính từ nghiệm thu nếu có
        $acceptanceProgress = $this->calculateFromAcceptance();
        
        // Nếu có nghiệm thu, ưu tiên sử dụng tiến độ từ nghiệm thu
        if ($acceptanceProgress !== null) {
            $finalProgress = $acceptanceProgress;
        } else {
            // Nếu không có nghiệm thu, tính từ các nguồn khác
            $logProgress = $this->calculateFromLogs();
            $subcontractorProgress = $this->calculateFromSubcontractors();

            // Lấy giá trị cao nhất (hoặc có thể tính trung bình có trọng số)
            $finalProgress = max($logProgress, $subcontractorProgress);
            
            $this->overall_percentage = $finalProgress;
            $this->calculated_from = 'mixed';
            $this->last_calculated_at = now();
            $this->save();
        }

        // Tự động cập nhật trạng thái dự án khi tiến độ đạt 100%
        if ($finalProgress >= 100 && $this->project) {
            $project = $this->project;
            // Chỉ cập nhật nếu trạng thái hiện tại chưa phải 'completed'
            if ($project->status !== 'completed') {
                $project->update([
                    'status' => 'completed',
                    'updated_by' => auth()->id() ?? $project->updated_by,
                ]);
            }
        }

        return $this->overall_percentage;
    }
}
