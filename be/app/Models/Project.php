<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Project extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'name',
        'code',
        'description',
        'customer_id',
        'project_manager_id',
        'start_date',
        'end_date',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    protected $appends = [
        'is_active',
        'is_completed',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function projectManager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'project_manager_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function contract(): HasOne
    {
        return $this->hasOne(Contract::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(ProjectPayment::class);
    }

    public function additionalCosts(): HasMany
    {
        return $this->hasMany(AdditionalCost::class);
    }

    public function costs(): HasMany
    {
        return $this->hasMany(Cost::class);
    }

    public function personnel(): HasMany
    {
        return $this->hasMany(ProjectPersonnel::class);
    }

    public function subcontractors(): HasMany
    {
        return $this->hasMany(Subcontractor::class);
    }

    public function constructionLogs(): HasMany
    {
        return $this->hasMany(ConstructionLog::class);
    }

    public function acceptanceStages(): HasMany
    {
        return $this->hasMany(AcceptanceStage::class)->orderBy('order');
    }

    public function defects(): HasMany
    {
        return $this->hasMany(Defect::class);
    }

    public function progress(): HasOne
    {
        return $this->hasOne(ProjectProgress::class);
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function phases(): HasMany
    {
        return $this->hasMany(ProjectPhase::class)->orderBy('order');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(ProjectTask::class)->orderBy('order');
    }

    public function timeTrackings(): HasMany
    {
        return $this->hasMany(TimeTracking::class);
    }

    public function payrolls(): HasMany
    {
        return $this->hasMany(Payroll::class);
    }

    public function bonuses(): HasMany
    {
        return $this->hasMany(Bonus::class);
    }

    public function budgets(): HasMany
    {
        return $this->hasMany(ProjectBudget::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function receipts(): HasMany
    {
        return $this->hasMany(Receipt::class);
    }

    public function materialTransactions(): HasMany
    {
        return $this->hasMany(MaterialTransaction::class);
    }

    public function equipmentAllocations(): HasMany
    {
        return $this->hasMany(EquipmentAllocation::class);
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function performanceEvaluations(): HasMany
    {
        return $this->hasMany(PerformanceEvaluation::class);
    }

    public function risks(): HasMany
    {
        return $this->hasMany(ProjectRisk::class);
    }

    public function changeRequests(): HasMany
    {
        return $this->hasMany(ChangeRequest::class);
    }

    public function evmMetrics(): HasMany
    {
        return $this->hasMany(ProjectEvmMetric::class);
    }

    // ==================================================================
    // ACCESSOR
    // ==================================================================

    public function getIsActiveAttribute(): bool
    {
        return $this->status === 'in_progress';
    }

    public function getIsCompletedAttribute(): bool
    {
        // Dự án hoàn thành khi toàn bộ tiến độ nghiệm thu hoàn thành
        $stages = $this->acceptanceStages;
        if ($stages->isEmpty()) {
            return $this->status === 'completed';
        }
        
        // Kiểm tra tất cả stages đã hoàn thành (tất cả items đạt nghiệm thu)
        return $stages->every(function ($stage) {
            return $stage->is_completed;
        });
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeActive($query)
    {
        return $query->where('status', 'in_progress');
    }

    public function scopeForCustomer($query, $userId)
    {
        return $query->where('customer_id', $userId);
    }

    public function scopeForPersonnel($query, $userId)
    {
        return $query->whereHas('personnel', function ($q) use ($userId) {
            $q->where('user_id', $userId);
        });
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($project) {
            if (empty($project->uuid)) {
                $project->uuid = Str::uuid();
            }
            if (empty($project->code)) {
                $project->code = static::generateCode();
            }
        });
    }

    public static function generateCode(): string
    {
        $date = now()->format('dmy'); // DDMMYYYY format
        $prefix = 'ANNHA-' . $date . '-';
        
        // Tìm số thứ tự cao nhất trong ngày
        $todayStart = now()->startOfDay();
        $todayEnd = now()->endOfDay();
        
        $lastProject = static::whereBetween('created_at', [$todayStart, $todayEnd])
            ->where('code', 'like', $prefix . '%')
            ->orderByDesc('code')
            ->first();
        
        $sequence = 1;
        if ($lastProject && preg_match('/-(\d+)$/', $lastProject->code, $matches)) {
            $sequence = (int)$matches[1] + 1;
        }
        
        // Format sequence với 2 chữ số (01, 02, ...)
        $code = $prefix . str_pad($sequence, 2, '0', STR_PAD_LEFT);
        
        // Đảm bảo không trùng (trường hợp hiếm)
        $maxAttempts = 10;
        $attempt = 0;
        while (static::where('code', $code)->exists() && $attempt < $maxAttempts) {
            $sequence++;
            $code = $prefix . str_pad($sequence, 2, '0', STR_PAD_LEFT);
            $attempt++;
        }
        
        return $code;
    }
}
