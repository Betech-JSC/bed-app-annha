<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use App\Traits\HasAutoCode;

class Project extends Model
{
    use SoftDeletes, HasAutoCode;

    protected $fillable = [
        'uuid',
        'name',
        'code',
        'description',
        'customer_id',
        'project_manager_id',
        'supervisor_id',
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

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supervisor_id');
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

    public function acceptances(): HasMany
    {
        return $this->hasMany(Acceptance::class)->orderBy('order');
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

    // TimeTracking relationship removed - module not found

    // Payrolls relationship removed - HR module deleted

    // Bonuses relationship removed - HR module deleted

    public function budgets(): HasMany
    {
        return $this->hasMany(ProjectBudget::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function warranties(): HasMany
    {
        return $this->hasMany(ProjectWarranty::class);
    }

    public function maintenances(): HasMany
    {
        return $this->hasMany(ProjectMaintenance::class);
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

    // LeaveRequest and PerformanceEvaluation relationships removed - modules not found

    public function comments(): HasMany
    {
        return $this->hasMany(ProjectComment::class)->whereNull('parent_id')->orderBy('created_at', 'desc');
    }

    public function allComments(): HasMany
    {
        return $this->hasMany(ProjectComment::class)->orderBy('created_at', 'desc');
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

    public function kpis(): HasMany
    {
        return $this->hasMany(Kpi::class);
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
        });
    }
}
