<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

class ProjectMaintenance extends Model
{
    use \App\Traits\Approvable, \App\Traits\NotifiesUsers;

    protected $fillable = [
        'uuid', 'project_id', 'maintenance_date',
        'next_maintenance_date', 'status', 'notes', 'created_by', 'approved_by'
    ];

    protected $casts = [
        'maintenance_date' => 'date',
        'next_maintenance_date' => 'date',
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
        return "Bảo trì định kỳ dự án: " . ($this->maintenance_date ? $this->maintenance_date->format('d/m/Y') : 'N/A');
    }

    public function getApprovalMetadata(): array
    {
        return [
            'maintenance_date' => $this->maintenance_date ? $this->maintenance_date->format('d/m/Y') : null,
            'next_maintenance_date' => $this->next_maintenance_date ? $this->next_maintenance_date->format('d/m/Y') : null,
            'notes' => $this->notes,
        ];
    }

    // --- NotifiesUsers Implementation ---
    public function getNotificationProject(): ?Project { return $this->project; }

    public function getNotificationLabel(): string
    {
        return "Bảo trì định kỳ " . ($this->maintenance_date ? $this->maintenance_date->format('d/m/Y') : '');
    }

    protected function notificationMap(): array
    {
        return [
            'approved' => [
                'title'    => 'Phiếu bảo trì đã được duyệt',
                'body'     => 'Phiếu bảo trì "{name}" của dự án "{project}" đã được duyệt.',
                'target'   => ['creator', 'pm'],
                'tab'      => 'technical',
                'priority' => 'medium',
            ],
            'rejected' => [
                'title'    => 'Phiếu bảo trì bị từ chối',
                'body'     => 'Phiếu bảo trì "{name}" của dự án "{project}" đã bị từ chối. Lý do: {reason}',
                'target'   => ['creator', 'pm'],
                'tab'      => 'technical',
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
