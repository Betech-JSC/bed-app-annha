<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

use App\Traits\NotifiesUsers;
use App\Traits\HasAutoCode;
use App\Traits\Approvable;

class Payroll extends Model
{
    use SoftDeletes, NotifiesUsers, HasAutoCode, Approvable;

    protected $table = 'payroll';

    public function getCodeColumn(): string
    {
        return 'payroll_number';
    }

    protected $fillable = [
        'uuid',
        'payroll_number',
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
        'allowance_amount',
        'deductions',
        'gross_salary',
        'tax',
        'social_insurance_amount',
        'health_insurance_amount',
        'unemployment_insurance_amount',
        'taxable_income',
        'personal_deduction',
        'dependent_deduction',
        'dependents_count',
        'net_salary',
        'status',
        'calculated_at',
        'approved_by',
        'approved_at',
        'management_approved_by',
        'management_approved_at',
        'accountant_approved_by',
        'accountant_approved_at',
        'rejected_reason',
        'paid_at',
        'notes',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'base_salary' => 'float',
        'total_hours' => 'float',
        'overtime_hours' => 'float',
        'overtime_rate' => 'float',
        'bonus_amount' => 'float',
        'allowance_amount' => 'float',
        'deductions' => 'float',
        'gross_salary' => 'float',
        'tax' => 'float',
        'social_insurance_amount' => 'float',
        'health_insurance_amount' => 'float',
        'unemployment_insurance_amount' => 'float',
        'taxable_income' => 'float',
        'personal_deduction' => 'float',
        'dependent_deduction' => 'float',
        'net_salary' => 'float',
        'calculated_at' => 'datetime',
        'approved_at' => 'datetime',
        'management_approved_at' => 'datetime',
        'accountant_approved_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    // Relationships
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function managementApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'management_approved_by');
    }

    public function accountantApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accountant_approved_by');
    }

    public function attachments(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // Methods
    public function submitForManagementApproval()
    {
        $this->update([
            'status' => 'pending_management',
            'rejected_reason' => null,
        ]);
    }

    public function approveByManagement($user)
    {
        $this->update([
            'status' => 'pending_accountant',
            'management_approved_by' => $user->id,
            'management_approved_at' => now(),
        ]);
    }

    public function approveByAccountant($user)
    {
        $this->update([
            'status' => 'approved',
            'accountant_approved_by' => $user->id,
            'accountant_approved_at' => now(),
            'approved_by' => $user->id, // Maintain backward compatibility
            'approved_at' => now(),
            'paid_at' => now(), // Assume paid once accountant confirms
        ]);
    }

    public function reject($user, $reason = null)
    {
        $this->update([
            'status' => 'rejected',
            'rejected_reason' => $reason,
        ]);
        return true;
    }

    // ==================================================================
    // APPROVABLE OVERRIDES
    // ==================================================================

    protected function getApprovalSummary(): string
    {
        $monthStr = $this->period_start ? $this->period_start->format('m/Y') : '';
        $empName = $this->user ? $this->user->name : 'Nhân viên';
        return "Phiếu lương - {$empName} - Tháng {$monthStr} (" . number_format($this->net_salary, 0, ',', '.') . "đ)";
    }

    protected function getApprovalMetadata(): array
    {
        return [
            'project_name' => $this->project?->name ?? 'Chi phí công ty',
            'project_code' => $this->project?->code,
            'employee_name' => $this->user?->name,
            'payroll_number' => $this->payroll_number,
            'base_salary' => $this->base_salary,
            'bonus_amount' => $this->bonus_amount,
            'allowance_amount' => $this->allowance_amount,
            'deductions' => $this->deductions,
            'net_salary' => $this->net_salary,
            'month' => $this->period_start?->format('m/Y'),
            'type_label' => 'Phiếu lương',
            'creator' => 'Nhân sự',
        ];
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    // ==================================================================
    // NotifiesUsers Implementation
    // ==================================================================

    public function getNotificationProject(): ?Project
    {
        return $this->project;
    }

    public function getNotificationLabel(): string
    {
        return $this->payroll_number ?? "Phiếu lương #{$this->id}";
    }

    protected function notificationMap(): array
    {
        return [
            'submitted' => [
                'title'    => 'Phiếu lương cần duyệt',
                'body'     => 'Phiếu lương {name} cần BĐH duyệt.',
                'target'   => ['management'],
                'tab'      => 'hr',
                'priority' => 'high',
                'category' => 'workflow_approval',
            ],
            'approved_management' => [
                'title'    => 'BĐH đã duyệt phiếu lương',
                'body'     => 'Phiếu lương {name} đã được BĐH duyệt, chờ KT xác nhận.',
                'target'   => ['accountant'],
                'tab'      => 'hr',
                'priority' => 'high',
                'category' => 'workflow_approval',
            ],
            'approved_accountant' => [
                'title'    => 'KT đã xác nhận phiếu lương',
                'body'     => 'Phiếu lương {name} đã được xác nhận chi trả.',
                'target'   => ['user'], // Notify the employee
                'tab'      => 'hr',
                'priority' => 'medium',
                'category' => 'status_change',
            ],
            'rejected' => [
                'title'    => 'Phiếu lương bị từ chối',
                'body'     => 'Phiếu lương {name} bị từ chối: {reason}',
                'target'   => ['management'],
                'tab'      => 'hr',
                'priority' => 'high',
                'category' => 'workflow_approval',
            ],
        ];
    }
}
