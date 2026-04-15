<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeSalaryConfig extends Model
{
    protected $table = 'employee_salary_config';

    protected $fillable = [
        'user_id',
        'project_id',
        'salary_type',
        'hourly_rate',
        'daily_rate',
        'monthly_salary',
        'project_rate',
        'overtime_rate',
        'effective_from',
        'effective_to',
    ];

    protected $casts = [
        'hourly_rate' => 'decimal:2',
        'daily_rate' => 'decimal:2',
        'monthly_salary' => 'decimal:2',
        'project_rate' => 'decimal:2',
        'overtime_rate' => 'decimal:2',
        'effective_from' => 'date',
        'effective_to' => 'date',
    ];

    // ───── Relationships ─────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    // ───── Scopes ─────

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForProject($query, ?int $projectId)
    {
        return $query->where('project_id', $projectId);
    }

    public function scopeCurrent($query)
    {
        $today = now()->toDateString();
        return $query->where('effective_from', '<=', $today)
            ->where(function ($q) use ($today) {
                $q->whereNull('effective_to')
                    ->orWhere('effective_to', '>=', $today);
            })
            ->orderByDesc('effective_from');
    }

    // ───── Helpers ─────

    /**
     * Lấy đơn giá giờ quy đổi (dùng cho tính Cost)
     */
    public function getHourlyEquivalent(): float
    {
        return match ($this->salary_type) {
            'hourly' => (float) ($this->hourly_rate ?? 0),
            'daily' => (float) ($this->daily_rate ?? 0) / 8,
            'monthly' => (float) ($this->monthly_salary ?? 0) / 26 / 8,
            default => 0,
        };
    }

    /**
     * Lấy đơn giá OT (fallback về hourly equivalent nếu chưa cấu hình)
     */
    public function getOvertimeRate(): float
    {
        if ($this->overtime_rate && $this->overtime_rate > 0) {
            return (float) $this->overtime_rate;
        }
        return $this->getHourlyEquivalent();
    }
}
