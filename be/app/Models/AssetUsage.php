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
    ];

    protected $casts = [
        'quantity'      => 'integer',
        'received_date' => 'date',
        'returned_date' => 'date',
    ];

    // ─── Relationships ───
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function asset(): BelongsTo { return $this->belongsTo(Equipment::class, 'equipment_id'); }
    public function receiver(): BelongsTo { return $this->belongsTo(User::class, 'receiver_id'); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function attachments(): MorphMany { return $this->morphMany(Attachment::class, 'attachable'); }

    const STATUS_LABELS = [
        'pending_receive' => 'Chờ xác nhận nhận',
        'in_use'          => 'Đang sử dụng',
        'pending_return'  => 'Chờ xác nhận trả',
        'returned'        => 'Đã trả',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            $model->uuid = $model->uuid ?: Str::uuid();
        });
    }
}
