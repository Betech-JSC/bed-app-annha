<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

use App\Traits\NotifiesUsers;
use App\Traits\HasAutoCode;
use App\Traits\Approvable;

class MaterialBill extends Model
{
    use SoftDeletes, NotifiesUsers, HasAutoCode, Approvable;

    public function getCodeColumn(): string
    {
        return 'bill_number';
    }

    protected $fillable = [
        'uuid',
        'project_id',
        'supplier_id',
        'bill_number',
        'bill_date',
        'cost_group_id',
        'budget_item_id',
        'total_amount',
        'notes',
        'status',
        'created_by',
        'management_approved_by',
        'management_approved_at',
        'accountant_approved_by',
        'accountant_approved_at',
        'rejected_reason',
    ];

    protected $casts = [
        'bill_date' => 'date',
        'management_approved_at' => 'datetime',
        'accountant_approved_at' => 'datetime',
        'total_amount' => 'float',
    ];

    // Relationships
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function costGroup(): BelongsTo
    {
        return $this->belongsTo(CostGroup::class);
    }

    public function budgetItem(): BelongsTo
    {
        return $this->belongsTo(BudgetItem::class, 'budget_item_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function managementApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'management_approved_by');
    }

    public function accountantApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accountant_approved_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(MaterialBillItem::class);
    }

    public function attachments(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // Methods
    public function submitForManagementApproval()
    {
        $this->update(['status' => 'pending_management']);
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
        ]);
    }

    public function approve($user)
    {
        if ($this->status === 'pending_management') {
            $this->approveByManagement($user);
            return true;
        } elseif ($this->status === 'pending_accountant') {
            $this->approveByAccountant($user);
            return true;
        }
        return false;
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
        return "Phiếu vật tư " . ($this->project ? $this->project->name : "dự án") . " - " . ($this->bill_number ?? "#".$this->id);
    }

    protected function getApprovalMetadata(): array
    {
        return [
            'project_name' => $this->project?->name,
            'project_code' => $this->project?->code,
            'bill_number' => $this->bill_number,
            'total_amount' => $this->total_amount,
            'supplier_name' => $this->supplier?->name,
            'bill_date' => $this->bill_date?->format('d/m/Y'),
            'type_label' => 'Phiếu vật tư',
            'creator' => $this->creator?->name,
        ];
    }

    /**
     * Kích hoạt các tác vụ phụ khi hóa đơn được duyệt (Công nợ, Kho bãi)
     * Đảm bảo chỉ chạy 1 lần khi status chuyển sang approved
     */
    public function triggerApprovalSideEffects(): void
    {
        if ($this->status !== 'approved') return;

        // 1. Cập nhật công nợ nhà cung cấp
        if ($this->supplier) {
            $this->supplier->recordDebt($this->total_amount);
        }

        // 2. Tạo MaterialTransactions (Nhập kho dự án)
        // Kiểm tra xem đã có transaction nào được tạo cho bill này chưa để tránh trùng lặp
        $existingTransactions = MaterialTransaction::where('reference_number', $this->bill_number)
            ->where('project_id', $this->project_id)
            ->exists();

        if (!$existingTransactions) {
            $cost = Cost::where('material_bill_id', $this->id)->first();
            
            foreach ($this->items as $item) {
                MaterialTransaction::create([
                    'material_id' => $item->material_id,
                    'project_id' => $this->project_id,
                    'cost_id' => $cost ? $cost->id : null,
                    'type' => 'in',
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'total_amount' => $item->total_price,
                    'supplier_id' => $this->supplier_id,
                    'reference_number' => $this->bill_number,
                    'transaction_date' => $this->bill_date,
                    'notes' => "Nhập từ phiếu vật tư #" . ($this->bill_number ?? $this->id),
                    'status' => 'approved',
                    'created_by' => $this->created_by,
                    'approved_by' => $this->accountant_approved_by,
                    'approved_at' => $this->accountant_approved_at,
                ]);
            }
        }
    }


    /**
     * Đồng bộ hóa dữ liệu sang bản ghi Chi phí liên kết
     */
    public function syncToCost(): void
    {
        if ($this->status === 'cancelled') {
            Cost::where('material_bill_id', $this->id)->delete();
            return;
        }

        $newCostStatus = match ($this->status) {
            'approved'           => 'approved',
            'pending_management' => 'pending_management_approval',
            'pending_accountant' => 'pending_accountant_approval',
            'rejected'           => 'rejected',
            default              => 'draft',
        };

        $supplierName = $this->supplier ? $this->supplier->name : '';
        $name = "Phiếu vật liệu #" . ($this->bill_number ?? $this->id) . ($supplierName ? " - {$supplierName}" : '');

        Cost::updateOrCreate(
            ['material_bill_id' => $this->id],
            [
                'project_id'               => $this->project_id,
                'name'                     => $name,
                'amount'                   => $this->total_amount,
                'cost_date'                => $this->bill_date ?: now(),
                'cost_group_id'            => $this->cost_group_id,
                'budget_item_id'           => $this->budget_item_id,
                'supplier_id'              => $this->supplier_id,
                'status'                   => $newCostStatus,
                'created_by'               => $this->created_by,
                'management_approved_by'   => $this->management_approved_by,
                'management_approved_at'   => $this->management_approved_at,
                'accountant_approved_by'   => $this->accountant_approved_by,
                'accountant_approved_at'   => $this->accountant_approved_at,
                'rejected_reason'          => $this->rejected_reason,
            ]
        );
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });

        static::saved(function ($model) {
            // Tự động đồng bộ sang Cost khi Bill thay đổi
            $model->syncToCost();
        });

        static::deleted(function ($model) {
            Cost::where('material_bill_id', $model->id)->delete();
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
        return $this->bill_number ?? "Phiếu vật tư #{$this->id}";
    }

    protected function notificationMap(): array
    {
        return [
            'submitted' => [
                'title'    => 'Phiếu vật tư cần duyệt',
                'body'     => 'Phiếu vật tư {name} cần BĐH duyệt.',
                'target'   => ['management', 'pm'],
                'tab'      => 'materials',
                'priority' => 'high',
                'category' => 'workflow_approval',
            ],
            'approved_management' => [
                'title'    => 'BĐH đã duyệt phiếu vật tư',
                'body'     => 'Phiếu vật tư {name} đã được BĐH duyệt, chờ KT xác nhận.',
                'target'   => ['creator', 'accountant', 'pm'],
                'tab'      => 'materials',
                'priority' => 'high',
                'category' => 'workflow_approval',
            ],
            'approved_accountant' => [
                'title'    => 'KT đã xác nhận phiếu vật tư',
                'body'     => 'Phiếu vật tư {name} đã được xác nhận. Chi phí đã được ghi nhận.',
                'target'   => ['creator', 'pm'],
                'tab'      => 'materials',
                'priority' => 'medium',
                'category' => 'status_change',
            ],
            'rejected' => [
                'title'    => 'Phiếu vật tư bị từ chối',
                'body'     => 'Phiếu vật tư {name} bị từ chối: {reason}',
                'target'   => ['creator', 'pm'],
                'tab'      => 'materials',
                'priority' => 'high',
                'category' => 'workflow_approval',
            ],
        ];
    }
}
