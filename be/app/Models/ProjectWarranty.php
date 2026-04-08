<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

class ProjectWarranty extends Model
{
    protected $fillable = [
        'uuid', 'project_id', 'handover_date', 'warranty_content',
        'warranty_start_date', 'warranty_end_date', 'status',
        'created_by', 'approved_by', 'notes'
    ];

    protected $casts = [
        'handover_date' => 'date',
        'warranty_start_date' => 'date',
        'warranty_end_date' => 'date',
    ];

    const STATUS_DRAFT = 'draft';
    const STATUS_PENDING_CUSTOMER = 'pending_customer';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';

    const STATUS_LABELS = [
        self::STATUS_DRAFT => 'Nháp',
        self::STATUS_PENDING_CUSTOMER => 'Chờ KH duyệt',
        self::STATUS_APPROVED => 'Đã duyệt',
        self::STATUS_REJECTED => 'Từ chối',
    ];

    // --- Relationships ---
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function approver(): BelongsTo { return $this->belongsTo(User::class, 'approved_by'); }
    public function attachments(): MorphMany { return $this->morphMany(Attachment::class, 'attachable'); }

    // --- Boot ---
    protected static function boot()
    {
        parent::boot();
        static::creating(fn($m) => $m->uuid = $m->uuid ?: Str::uuid());
    }
}
