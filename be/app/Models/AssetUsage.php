<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

class AssetUsage extends Model
{
    protected $fillable = [
        'uuid', 'project_id', 'equipment_id', 'quantity',
        'receiver_id', 'received_date', 'returned_date',
        'status', 'notes', 'created_by',
        'approved_by', 'approved_at',
        'confirmed_by', 'confirmed_at',
        'rejection_reason',
    ];

    protected $casts = [
        'quantity'      => 'integer',
        'received_date' => 'date',
        'returned_date' => 'date',
        'approved_at'   => 'datetime',
        'confirmed_at'  => 'datetime',
    ];

    // ─── Relationships ───
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function asset(): BelongsTo { return $this->belongsTo(Equipment::class, 'equipment_id'); }
    public function receiver(): BelongsTo { return $this->belongsTo(User::class, 'receiver_id'); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function approver(): BelongsTo { return $this->belongsTo(User::class, 'approved_by'); }
    public function confirmer(): BelongsTo { return $this->belongsTo(User::class, 'confirmed_by'); }
    public function attachments(): MorphMany { return $this->morphMany(Attachment::class, 'attachable'); }

    // ─── Status Labels ───
    const STATUS_LABELS = [
        'draft'              => 'Nháp',
        'pending_management' => 'Chờ BĐH duyệt',
        'pending_accountant' => 'Chờ Kế toán',
        'approved'           => 'Đã duyệt',
        'in_use'             => 'Đang sử dụng',
        'pending_return'     => 'Chờ xác nhận trả',
        'returned'           => 'Đã trả',
        'rejected'           => 'Từ chối',
        // Legacy — backwards compatibility
        'pending_receive'    => 'Chờ xác nhận nhận',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            $model->uuid = $model->uuid ?: Str::uuid();
        });
    }
}
