<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

class EquipmentPurchase extends Model
{
    protected $fillable = [
        'uuid', 'project_id', 'total_amount', 'status', 'rejection_reason',
        'notes', 'created_by', 'approved_by', 'approved_at',
        'confirmed_by', 'confirmed_at',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'approved_at'  => 'datetime',
        'confirmed_at' => 'datetime',
    ];

    // ─── Relationships ───
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function items(): HasMany { return $this->hasMany(EquipmentPurchaseItem::class, 'purchase_id'); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function approver(): BelongsTo { return $this->belongsTo(User::class, 'approved_by'); }
    public function confirmer(): BelongsTo { return $this->belongsTo(User::class, 'confirmed_by'); }
    public function attachments(): MorphMany { return $this->morphMany(Attachment::class, 'attachable'); }

    const STATUS_LABELS = [
        'draft'              => 'Nháp',
        'pending_management' => 'Chờ BĐH duyệt',
        'pending_accountant' => 'Chờ Kế toán',
        'completed'          => 'Hoàn tất',
        'rejected'           => 'Từ chối',
    ];

    /**
     * Tính lại tổng tiền từ items
     */
    public function recalculateTotal(): void
    {
        $this->update([
            'total_amount' => $this->items()->sum('total_price'),
        ]);
    }

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            $model->uuid = $model->uuid ?: Str::uuid();
        });
    }
}
