<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

class ProjectWarranty extends Model
{
    use \App\Traits\Approvable, \App\Traits\NotifiesUsers;

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

    // --- Approvable Implementation ---
    public function getApprovalSummary(): string
    {
        return "Nghiệm thu bàn giao & Bảo hành: " . ($this->handover_date ? $this->handover_date->format('d/m/Y') : 'N/A');
    }

    public function getApprovalMetadata(): array
    {
        return [
            'handover_date' => $this->handover_date ? $this->handover_date->format('d/m/Y') : null,
            'warranty_start_date' => $this->warranty_start_date ? $this->warranty_start_date->format('d/m/Y') : null,
            'warranty_end_date' => $this->warranty_end_date ? $this->warranty_end_date->format('d/m/Y') : null,
            'warranty_content' => $this->warranty_content,
        ];
    }

    // --- NotifiesUsers Implementation ---
    public function getNotificationProject(): ?Project { return $this->project; }

    public function getNotificationLabel(): string
    {
        return "Nghiệm thu & Bảo hành " . ($this->handover_date ? $this->handover_date->format('d/m/Y') : '');
    }

    protected function notificationMap(): array
    {
        return [
            'approved' => [
                'title'    => 'Nghiệm thu & Bảo hành đã được duyệt',
                'body'     => 'Phiếu "{name}" của dự án "{project}" đã được duyệt bởi khách hàng.',
                'target'   => ['creator', 'pm'],
                'tab'      => 'acceptance',
                'priority' => 'medium',
            ],
            'rejected' => [
                'title'    => 'Nghiệm thu & Bảo hành bị từ chối',
                'body'     => 'Phiếu "{name}" của dự án "{project}" đã bị từ chối. Lý do: {reason}',
                'target'   => ['creator', 'pm'],
                'tab'      => 'acceptance',
                'priority' => 'high',
            ],
        ];
    }

    // --- Boot ---
    protected static function boot()
    {
        parent::boot();
        static::creating(fn($m) => $m->uuid = $m->uuid ?: Str::uuid());
    }
}
