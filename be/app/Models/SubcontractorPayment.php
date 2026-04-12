<?php

namespace App\Models;

use App\Models\Cost;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class SubcontractorPayment extends Model
{
    use SoftDeletes, \App\Traits\NotifiesUsers;

    protected $fillable = [
        'uuid',
        'subcontractor_id',
        'budget_item_id',
        'project_id',
        'payment_number',
        'payment_stage',
        'amount',
        'accepted_volume',
        'payment_date',
        'payment_method',
        'reference_number',
        'description',
        'status',
        'created_by',
        'approved_by',
        'approved_at',
        'paid_by',
        'paid_at',
        'rejected_by',
        'rejected_at',
        'rejection_reason',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'accepted_volume' => 'decimal:2',
        'payment_date' => 'date',
        'approved_at' => 'datetime',
        'paid_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    protected $appends = [
        'status_label',
        'payment_method_label',
    ];

    // ==================================================================
    // RELATIONSHIPS
    // ==================================================================

    public function subcontractor(): BelongsTo
    {
        return $this->belongsTo(Subcontractor::class);
    }

    public function budgetItem(): BelongsTo
    {
        return $this->belongsTo(BudgetItem::class, 'budget_item_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function payer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by');
    }

    public function rejector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // ==================================================================
    // ACCESSORS
    // ==================================================================

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'draft' => 'Nháp',
            'pending_management_approval' => 'Chờ ban điều hành duyệt',
            'pending_accountant_confirmation' => 'Chờ kế toán xác nhận',
            'approved' => 'Đã duyệt',
            'paid' => 'Đã thanh toán',
            'rejected' => 'Đã từ chối',
            'cancelled' => 'Đã hủy',
            default => ucfirst($this->status),
        };
    }

    public function getPaymentMethodLabelAttribute(): string
    {
        return match ($this->payment_method) {
            'cash' => 'Tiền mặt',
            'bank_transfer' => 'Chuyển khoản',
            'check' => 'Séc',
            'other' => 'Khác',
            default => ucfirst($this->payment_method),
        };
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function submitForApproval(): bool
    {
        $this->status = 'pending_management_approval';
        return $this->save();
    }

    public function approve(?User $user = null): bool
    {
        // CRITICAL: Must only approve from pending_management_approval to prevent double-approval
        if ($this->status !== 'pending_management_approval') {
            return false;
        }

        if ($user) {
            $this->approved_by = $user->id;
        }
        $this->approved_at = now();
        $this->status = 'pending_accountant_confirmation';
        return $this->save();
    }

    public function markAsPaid(?User $user = null): bool
    {
        // CRITICAL: Must only pay after accountant confirms. Prevents financial leak.
        if ($this->status !== 'pending_accountant_confirmation') {
            return false;
        }

        if ($user) {
            $this->paid_by = $user->id;
        }
        $this->paid_at = now();
        $this->status = 'paid';
        
        // Cập nhật tổng thanh toán cho subcontractor
        if ($this->subcontractor) {
            $this->subcontractor->recordPayment($this->amount);
        }
        
        return $this->save();
    }

    public function reject(?User $user = null, ?string $reason = null): bool
    {
        // CRITICAL: Only allow rejection from approval states — never from paid/draft/rejected
        if (!in_array($this->status, ['pending_management_approval', 'pending_accountant_confirmation'])) {
            return false;
        }

        if ($user) {
            $this->rejected_by = $user->id;
        }
        $this->rejected_at = now();
        $this->rejection_reason = $reason;
        $this->status = 'rejected';
        return $this->save();
    }

    // ==================================================================
    // SCOPES
    // ==================================================================

    public function scopeBySubcontractor($query, int $subcontractorId)
    {
        return $query->where('subcontractor_id', $subcontractorId);
    }

    public function scopeByProject($query, int $projectId)
    {
        return $query->where('project_id', $projectId);
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    /**
     * Đồng bộ thông tin thanh toán sang bảng Chi phí dự án (Cost)
     */
    public function syncToCostTable(): void
    {
        if ($this->status === 'cancelled') {
            Cost::where('subcontractor_payment_id', $this->id)->delete();
            return;
        }

        $costGroupId = \App\Models\CostGroup::where('code', 'subcontractor')
            ->orWhere('name', 'LIKE', '%Nhà thầu phụ%')
            ->value('id') ?: 5;
        
        $costStatus = match($this->status) {
            'draft'                           => 'draft',
            'pending_management_approval'     => 'pending_management_approval',
            'pending_accountant_confirmation' => 'pending_accountant_approval',
            'paid'                            => 'approved',
            'rejected'                        => 'rejected',
            default                           => 'draft'
        };

        Cost::updateOrCreate(
            ['subcontractor_payment_id' => $this->id],
            [
                'project_id'               => $this->project_id,
                'subcontractor_id'         => $this->subcontractor_id,
                'name'                     => "Thanh toán thầu phụ: " . ($this->subcontractor->name ?? 'N/A') . " - Đợt: " . ($this->payment_stage ?? 'N/A'),
                'amount'                   => $this->amount,
                'cost_date'                => $this->payment_date ?: now(),
                'category'                 => 'other',
                'cost_group_id'            => $costGroupId,
                'description'              => $this->description ?: "Đồng bộ từ phiếu chi thầu phụ " . $this->payment_number,
                'status'                   => $costStatus,
                'budget_item_id'           => $this->budget_item_id,
                'created_by'               => $this->created_by,
                'management_approved_by'   => $this->approved_by,
                'management_approved_at'   => $this->approved_at,
                'accountant_approved_by'   => $this->paid_by,
                'accountant_approved_at'   => $this->paid_at,
                'rejected_reason'          => $this->rejection_reason,
            ]
        );
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
        return "Phiếu chi Thầu phụ: " . ($this->subcontractor->name ?? 'N/A') . " - Đợt: " . ($this->payment_stage ?? 'N/A');
    }

    protected function notificationMap(): array
    {
        return [
            'submitted' => [
                'title'    => 'Phiếu chi thầu phụ cần duyệt',
                'body'     => 'Phiếu chi thầu phụ {name} cho dự án {project} cần BĐH duyệt.',
                'target'   => ['management', 'pm'],
                'tab'      => 'subcontractors',
                'priority' => 'high',
                'category' => 'workflow_approval',
            ],
            'approved_management' => [
                'title'    => 'BĐH đã duyệt phiếu chi thầu phụ',
                'body'     => 'Phiếu chi thầu phụ {name} đã được BĐH duyệt, chờ KT xác nhận.',
                'target'   => ['creator', 'accountant', 'pm'],
                'tab'      => 'subcontractors',
                'priority' => 'high',
                'category' => 'workflow_approval',
            ],
            'paid' => [
                'title'    => 'KT đã xác nhận thanh toán thầu phụ',
                'body'     => 'Phiếu chi thầu phụ {name} đã được thanh toán.',
                'target'   => ['creator', 'pm'],
                'tab'      => 'subcontractors',
                'priority' => 'medium',
                'category' => 'status_change',
            ],
            'rejected' => [
                'title'    => 'Phiếu chi thầu phụ bị từ chối',
                'body'     => 'Phiếu chi thầu phụ {name} bị từ chối: {reason}',
                'target'   => ['creator', 'pm'],
                'tab'      => 'subcontractors',
                'priority' => 'high',
                'category' => 'workflow_approval',
            ],
        ];
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($payment) {
            if (empty($payment->uuid)) {
                $payment->uuid = Str::uuid();
            }
            if (empty($payment->payment_number)) {
                $payment->payment_number = 'PT-' . date('Ymd') . '-' . strtoupper(Str::random(6));
            }
        });

        static::saved(function ($payment) {
            $payment->syncToCostTable();
        });

        static::deleted(function ($payment) {
            Cost::where('subcontractor_payment_id', $payment->id)->delete();
        });
    }
}
