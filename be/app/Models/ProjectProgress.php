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

    /**
     * Tiến độ dựa trên nhật ký thi công — lấy log mới nhất toàn dự án.
     * PURE: chỉ return, không save, không cập nhật trạng thái dự án.
     *
     * @return float|null null nếu dự án chưa có log nào
     */
    public function calculateFromLogs(): ?float
    {
        $latestLog = $this->project->constructionLogs()
            ->orderBy('log_date', 'desc')
            ->first();

        if (!$latestLog) {
            return null;
        }

        return (float) $latestLog->completion_percentage;
    }

    /**
     * Tiến độ dựa trên nhà thầu phụ — weighted by total_quote theo progress_status.
     * PURE: chỉ return, không save, không cập nhật trạng thái dự án.
     *
     * @return float|null null nếu không có nhà thầu phụ hoặc tổng trọng số = 0
     */
    public function calculateFromSubcontractors(): ?float
    {
        $subcontractors = $this->project->subcontractors;
        if ($subcontractors->isEmpty()) {
            return null;
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

        if ($totalWeight <= 0) {
            return null;
        }

        return (float) ($weightedProgress / $totalWeight);
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
     * Tiến độ dựa trên nghiệm thu: trung bình tỷ lệ approved items của mỗi stage có items.
     * Cap tại 99.99% đến khi TẤT CẢ items của TẤT CẢ stages được approved → khi đó = 100%.
     * PURE: chỉ return, không save.
     *
     * @return float|null null nếu dự án không có stage hoặc không có stage nào có items
     */
    public function calculateFromAcceptance(): ?float
    {
        $stages = $this->project->acceptanceStages()->with('items')->get();

        if ($stages->isEmpty()) {
            return null;
        }

        $stagesWithItems = $stages->filter(fn($stage) => $stage->items->isNotEmpty());

        if ($stagesWithItems->isEmpty()) {
            return null;
        }

        $stageProgresses = [];
        foreach ($stagesWithItems as $stage) {
            $items = $stage->items;
            $totalItems = $items->count();
            $approvedItems = $items->where('acceptance_status', 'approved')->count();

            if ($totalItems > 0) {
                $stageProgresses[] = ($approvedItems / $totalItems) * 100;
            }
        }

        if (empty($stageProgresses)) {
            return null;
        }

        $finalProgress = array_sum($stageProgresses) / count($stageProgresses);

        $allItemsApproved = $stagesWithItems->every(
            fn($stage) => $stage->items->every(fn($item) => $item->acceptance_status === 'approved')
        );

        if ($allItemsApproved) {
            return 100.0;
        }

        // Chưa duyệt hết → cap 99.99 để không bao giờ hiển thị 100% trước khi thực sự xong
        return (float) min($finalProgress, 99.99);
    }

    /**
     * Tiến độ từ WBS Tasks — trung bình có trọng số theo duration của root tasks.
     * Root tasks' progress_percentage được TaskProgressService cập nhật tự động
     * từ leaf → root khi có log mới, nên đọc thẳng ở đây là an toàn.
     * PURE: chỉ return, không save.
     *
     * @return float|null null nếu dự án không có root task nào
     */
    public function calculateFromTasks(): ?float
    {
        $rootTasks = $this->project->tasks()
            ->whereNull('parent_id')
            ->whereNull('deleted_at')
            ->get(['id', 'progress_percentage', 'duration']);

        if ($rootTasks->isEmpty()) {
            return null;
        }

        $totalWeight = 0;
        $weightedSum = 0;

        foreach ($rootTasks as $task) {
            // Trọng số = thời lượng (ngày). Nếu không có → dùng 1 (đồng đều)
            $weight   = max(1, (int) ($task->duration ?? 0));
            $progress = (float) ($task->progress_percentage ?? 0);

            $weightedSum += $progress * $weight;
            $totalWeight += $weight;
        }

        if ($totalWeight <= 0) {
            return null;
        }

        return (float) ($weightedSum / $totalWeight);
    }

    /**
     * Tính tiến độ tổng hợp — ƯU TIÊN theo thứ tự, early return nguồn đầu tiên có dữ liệu:
     *   1. Nghiệm thu (acceptance stages có items)      — đáng tin nhất: khách đã duyệt
     *   2. WBS Tasks (root tasks progress_percentage)   — cấu trúc công việc
     *   3. Nhật ký thi công (log mới nhất toàn dự án)  — fallback khi chưa có WBS
     *   4. Nhà thầu phụ (weighted by total_quote)       — fallback cuối cùng
     *
     * Là NƠI DUY NHẤT ghi DB và trigger autoCompleteProject.
     *
     * @param bool $force Bỏ qua cache 10 phút — bắt buộc tính lại ngay
     */
    public function calculateOverall(bool $force = false): float
    {
        if (!$force && $this->last_calculated_at && $this->last_calculated_at->diffInMinutes(now()) < 10) {
            return (float) $this->overall_percentage;
        }

        [$progress, $source] = $this->resolveProgress();

        $this->overall_percentage = round($progress, 2);
        $this->calculated_from    = $source;
        $this->last_calculated_at = now();
        $this->save();

        $this->autoCompleteProject($progress);

        return (float) $this->overall_percentage;
    }

    /**
     * Chọn nguồn tiến độ theo thứ tự ưu tiên, early return nguồn đầu tiên có dữ liệu.
     *
     * @return array{0: float, 1: string} [progress, calculated_from]
     */
    private function resolveProgress(): array
    {
        if (($p = $this->calculateFromAcceptance()) !== null) {
            return [$p, 'acceptance'];
        }
        if (($p = $this->calculateFromTasks()) !== null) {
            return [$p, 'tasks'];
        }
        if (($p = $this->calculateFromLogs()) !== null) {
            return [$p, 'logs'];
        }
        if (($p = $this->calculateFromSubcontractors()) !== null) {
            return [$p, 'subcontractors'];
        }
        return [0.0, 'manual'];
    }

    /**
     * Tự động đánh dấu dự án hoàn thành khi tiến độ đạt 100%
     */
    private function autoCompleteProject(float $progress): void
    {
        if ($progress >= 100 && $this->project && $this->project->status !== 'completed') {
            $this->project->update([
                'status'     => 'completed',
                'updated_by' => auth()->id() ?? $this->project->updated_by,
            ]);
        }
    }
}
