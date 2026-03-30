<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class MaterialBill extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'project_id',
        'supplier_id',
        'bill_number',
        'bill_date',
        'cost_group_id',
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

    public function reject($reason, $user)
    {
        $this->update([
            'status' => 'rejected',
            'rejected_reason' => $reason,
        ]);
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
}
