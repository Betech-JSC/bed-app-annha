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
            $this->overall_percentage = $latestLog->completion_percentage;
            $this->calculated_from = 'logs';
            $this->last_calculated_at = now();
            $this->save();
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
            $this->overall_percentage = $weightedProgress / $totalWeight;
        } else {
            $this->overall_percentage = 0;
        }

        $this->calculated_from = 'subcontractors';
        $this->last_calculated_at = now();
        $this->save();

        return $this->overall_percentage;
    }

    public function updateManual(float $percentage): bool
    {
        $this->overall_percentage = max(0, min(100, $percentage));
        $this->calculated_from = 'manual';
        $this->last_calculated_at = now();
        return $this->save();
    }

    /**
     * Tính tiến độ dựa trên nghiệm thu
     * Dự án chỉ đạt 100% khi tất cả hạng mục nghiệm thu đã được approved
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

        $totalItems = 0;
        $approvedItems = 0;
        $totalStages = $stages->count();
        $fullyApprovedStages = 0;

        foreach ($stages as $stage) {
            $items = $stage->items;
            if ($items->isEmpty()) {
                continue;
            }

            $totalItems += $items->count();
            $approvedItems += $items->where('acceptance_status', 'approved')->count();

            // Kiểm tra stage đã fully approved chưa (owner_approved)
            if ($stage->status === 'owner_approved') {
                $fullyApprovedStages++;
            }
        }

        if ($totalItems === 0) {
            // Nếu không có hạng mục nghiệm thu, trả về null
            return null;
        }

        // Tính tiến độ dựa trên tỷ lệ hạng mục đã nghiệm thu
        // Chỉ đạt 100% khi TẤT CẢ hạng mục đã được approved
        $itemProgress = ($approvedItems / $totalItems) * 100;

        // Cũng tính theo tỷ lệ stage đã fully approved
        $stageProgress = $totalStages > 0 ? ($fullyApprovedStages / $totalStages) * 100 : 0;

        // Lấy giá trị nhỏ hơn để đảm bảo chặt chẽ
        // Chỉ khi cả items và stages đều 100% thì mới đạt 100%
        $finalProgress = min($itemProgress, $stageProgress);

        // Đảm bảo chỉ đạt 100% khi TẤT CẢ đã approved
        if ($approvedItems < $totalItems || $fullyApprovedStages < $totalStages) {
            $finalProgress = min($finalProgress, 99.99); // Không cho phép 100% nếu chưa hoàn thành hết
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
            return $acceptanceProgress;
        }

        // Nếu không có nghiệm thu, tính từ các nguồn khác
        $logProgress = $this->calculateFromLogs();
        $subcontractorProgress = $this->calculateFromSubcontractors();

        // Lấy giá trị cao nhất (hoặc có thể tính trung bình có trọng số)
        $finalProgress = max($logProgress, $subcontractorProgress);
        
        $this->overall_percentage = $finalProgress;
        $this->calculated_from = 'mixed';
        $this->last_calculated_at = now();
        $this->save();

        return $this->overall_percentage;
    }
}
