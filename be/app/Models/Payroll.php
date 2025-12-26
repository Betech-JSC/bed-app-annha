<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
use App\Models\Project;

class Payroll extends Model
{
    protected $table = 'payroll';

    protected $fillable = [
        'uuid',
        'user_id',
        'project_id',
        'period_type',
        'period_start',
        'period_end',
        'base_salary',
        'total_hours',
        'overtime_hours',
        'overtime_rate',
        'bonus_amount',
        'deductions',
        'gross_salary',
        'tax',
        'net_salary',
        'status',
        'calculated_at',
        'approved_by',
        'approved_at',
        'paid_at',
        'notes',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'base_salary' => 'decimal:2',
        'total_hours' => 'decimal:2',
        'overtime_hours' => 'decimal:2',
        'overtime_rate' => 'decimal:2',
        'bonus_amount' => 'decimal:2',
        'deductions' => 'decimal:2',
        'gross_salary' => 'decimal:2',
        'tax' => 'decimal:2',
        'net_salary' => 'decimal:2',
        'calculated_at' => 'datetime',
        'approved_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    protected $appends = [
        'is_approved',
        'is_paid',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    // ==================================================================
    // ACCESSOR
    // ==================================================================

    public function getIsApprovedAttribute(): bool
    {
        return $this->status === 'approved';
    }

    public function getIsPaidAttribute(): bool
    {
        return $this->status === 'paid';
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function calculate(): bool
    {
        // This method will be called by PayrollCalculationService
        $this->status = 'calculated';
        $this->calculated_at = now();
        return $this->save();
    }

    public function approve(?User $user = null): bool
    {
        $this->status = 'approved';
        if ($user) {
            $this->approved_by = $user->id;
        }
        $this->approved_at = now();
        $saved = $this->save();

        // Tự động tạo Cost record nếu có project_id
        if ($saved && $this->project_id) {
            $this->createCostFromPayroll();
        }

        return $saved;
    }

    /**
     * Tự động tạo Cost record từ Payroll
     */
    protected function createCostFromPayroll(): void
    {
        try {
            // Tìm CostGroup cho "Nhân công" hoặc tạo mặc định
            $costGroup = \App\Models\CostGroup::where('code', 'labor')
                ->orWhere('name', 'LIKE', '%Nhân công%')
                ->orWhere('name', 'LIKE', '%Nhân sự%')
                ->first();

            if (!$costGroup) {
                // Nếu không tìm thấy, tìm nhóm đầu tiên hoặc bỏ qua
                $costGroup = \App\Models\CostGroup::first();
            }

            if (!$costGroup) {
                \Log::warning("Không tìm thấy CostGroup để tạo Cost từ Payroll", [
                    'payroll_id' => $this->id,
                    'project_id' => $this->project_id
                ]);
                return;
            }

            // Kiểm tra xem đã có Cost record cho payroll này chưa
            $existingCost = \App\Models\Cost::where('payroll_id', $this->id)->first();
            if ($existingCost) {
                // Cập nhật amount nếu đã có
                $existingCost->update([
                    'amount' => $this->net_salary,
                    'name' => "Lương {$this->user->name} - " .
                        \Carbon\Carbon::parse($this->period_start)->format('d/m/Y') .
                        " đến " .
                        \Carbon\Carbon::parse($this->period_end)->format('d/m/Y'),
                ]);
                return;
            }

            // Tạo Cost record mới
            \App\Models\Cost::create([
                'project_id' => $this->project_id,
                'cost_group_id' => $costGroup->id,
                'payroll_id' => $this->id,
                'name' => "Lương {$this->user->name} - " .
                    \Carbon\Carbon::parse($this->period_start)->format('d/m/Y') .
                    " đến " .
                    \Carbon\Carbon::parse($this->period_end)->format('d/m/Y'),
                'amount' => $this->net_salary,
                'description' => "Lương kỳ {$this->period_type} - Tổng giờ: {$this->total_hours}h, OT: {$this->overtime_hours}h, Thưởng: " .
                    number_format($this->bonus_amount, 0, ',', '.') . " VNĐ",
                'cost_date' => $this->period_end,
                'status' => 'approved', // Tự động approved vì Payroll đã được approve
                'created_by' => $this->approved_by ?? $this->user_id,
                'management_approved_by' => $this->approved_by,
                'management_approved_at' => $this->approved_at,
                'accountant_approved_by' => $this->approved_by,
                'accountant_approved_at' => $this->approved_at,
            ]);
        } catch (\Exception $e) {
            \Log::error('Lỗi khi tạo Cost từ Payroll: ' . $e->getMessage(), [
                'payroll_id' => $this->id,
                'project_id' => $this->project_id,
                'error' => $e->getMessage()
            ]);
        }
    }

    public function markAsPaid(): bool
    {
        $this->status = 'paid';
        $this->paid_at = now();
        return $this->save();
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForProject($query, $projectId)
    {
        return $query->where('project_id', $projectId);
    }

    public function scopeByPeriod($query, $startDate, $endDate)
    {
        return $query->whereBetween('period_start', [$startDate, $endDate])
            ->orWhereBetween('period_end', [$startDate, $endDate]);
    }

    public function scopePending($query)
    {
        return $query->whereIn('status', ['draft', 'calculated']);
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($payroll) {
            if (empty($payroll->uuid)) {
                $payroll->uuid = Str::uuid();
            }
        });
    }
}
