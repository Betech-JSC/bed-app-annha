<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

class ProjectMaintenance extends Model
{
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
