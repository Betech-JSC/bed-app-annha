<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

class EquipmentRental extends Model
{
    protected $fillable = [
        'uuid', 'project_id', 'equipment_name', 'equipment_id',
        'supplier_id', 'rental_start_date', 'rental_end_date', 'total_cost',
        'status', 'rejection_reason', 'notes', 'created_by',
        'approved_by', 'approved_at', 'confirmed_by', 'confirmed_at', 'cost_id',
    ];

    protected $casts = [
        'total_cost'        => 'decimal:2',
        'rental_start_date' => 'date',
        'rental_end_date'   => 'date',
        'approved_at'       => 'datetime',
        'confirmed_at'      => 'datetime',
    ];

    // ─── Relationships ───
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function equipment(): BelongsTo { return $this->belongsTo(Equipment::class, 'equipment_id'); }
    public function supplier(): BelongsTo { return $this->belongsTo(Supplier::class); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function approver(): BelongsTo { return $this->belongsTo(User::class, 'approved_by'); }
    public function confirmer(): BelongsTo { return $this->belongsTo(User::class, 'confirmed_by'); }
    public function cost(): BelongsTo { return $this->belongsTo(Cost::class); }
    public function attachments(): MorphMany { return $this->morphMany(Attachment::class, 'attachable'); }

    // ─── Status Labels ───
    const STATUS_LABELS = [
        'draft'              => 'Nháp',
        'pending_management' => 'Chờ BĐH duyệt',
        'pending_accountant' => 'Chờ Kế toán',
        'completed'          => 'Hoàn tất',
        'rejected'           => 'Từ chối',
    ];

    // ─── Boot ───
    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            $model->uuid = $model->uuid ?: Str::uuid();
        });
    }
}
