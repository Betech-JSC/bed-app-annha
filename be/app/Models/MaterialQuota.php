<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class MaterialQuota extends Model
{
    protected $fillable = [
        'uuid', 'project_id', 'task_id', 'material_id',
        'planned_quantity', 'unit', 'actual_quantity',
        'variance_percentage', 'notes', 'created_by',
    ];

    protected $casts = [
        'planned_quantity'    => 'decimal:3',
        'actual_quantity'     => 'decimal:3',
        'variance_percentage' => 'decimal:2',
    ];

    protected $appends = ['is_exceeded', 'usage_percentage'];

    // --- Relationships ---
    public function project(): BelongsTo  { return $this->belongsTo(Project::class); }
    public function task(): BelongsTo     { return $this->belongsTo(ProjectTask::class, 'task_id'); }
    public function material(): BelongsTo { return $this->belongsTo(Material::class); }
    public function creator(): BelongsTo  { return $this->belongsTo(User::class, 'created_by'); }

    // --- Scopes ---
    public function scopeExceeded($q) { return $q->whereColumn('actual_quantity', '>', 'planned_quantity'); }
    public function scopeWarning($q)  { return $q->whereRaw('actual_quantity >= planned_quantity * 0.8'); }

    // --- Accessors ---
    public function getIsExceededAttribute(): bool
    {
        return (float) $this->actual_quantity > (float) $this->planned_quantity;
    }

    public function getUsagePercentageAttribute(): float
    {
        if ((float) $this->planned_quantity <= 0) return 0;
        return round(((float) $this->actual_quantity / (float) $this->planned_quantity) * 100, 2);
    }

    // --- Methods ---

    /**
     * Cập nhật actual_quantity từ MaterialTransactions
     */
    public function syncActualQuantity(): void
    {
        $totalUsed = MaterialTransaction::where('project_id', $this->project_id)
            ->where('material_id', $this->material_id)
            ->where('type', 'export')
            ->where('status', '!=', 'cancelled')
            ->when($this->task_id, fn($q) => $q->where('task_id', $this->task_id))
            ->sum('quantity');

        $this->actual_quantity = $totalUsed;
        $this->variance_percentage = $this->planned_quantity > 0
            ? round((($totalUsed - (float) $this->planned_quantity) / (float) $this->planned_quantity) * 100, 2)
            : 0;
        $this->saveQuietly();
    }

    // --- Boot ---
    protected static function boot()
    {
        parent::boot();
        static::creating(fn($m) => $m->uuid = $m->uuid ?: Str::uuid());
    }
}
