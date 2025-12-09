<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class EmployeeSalaryConfig extends Model
{
    protected $table = 'employee_salary_config';

    protected $fillable = [
        'user_id',
        'salary_type',
        'hourly_rate',
        'daily_rate',
        'monthly_salary',
        'project_rate',
        'effective_from',
        'effective_to',
    ];

    protected $casts = [
        'hourly_rate' => 'decimal:2',
        'daily_rate' => 'decimal:2',
        'monthly_salary' => 'decimal:2',
        'project_rate' => 'decimal:2',
        'effective_from' => 'date',
        'effective_to' => 'date',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function getCurrentRate(): ?float
    {
        return $this->getRateForDate(now());
    }

    public function getRateForDate(Carbon $date): ?float
    {
        // Check if config is effective for the date
        if ($this->effective_from > $date) {
            return null;
        }

        if ($this->effective_to && $this->effective_to < $date) {
            return null;
        }

        switch ($this->salary_type) {
            case 'hourly':
                return $this->hourly_rate;
            case 'daily':
                return $this->daily_rate;
            case 'monthly':
                return $this->monthly_salary;
            case 'project_based':
                return $this->project_rate;
            default:
                return null;
        }
    }

    public function isEffectiveForDate(Carbon $date): bool
    {
        if ($this->effective_from > $date) {
            return false;
        }

        if ($this->effective_to && $this->effective_to < $date) {
            return false;
        }

        return true;
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeCurrent($query)
    {
        $now = now()->toDateString();
        return $query->where('effective_from', '<=', $now)
            ->where(function ($q) use ($now) {
                $q->whereNull('effective_to')
                    ->orWhere('effective_to', '>=', $now);
            });
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }
}
