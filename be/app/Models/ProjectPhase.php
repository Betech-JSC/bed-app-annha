<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ProjectPhase extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'project_id',
        'name',
        'description',
        'start_date',
        'end_date',
        'order',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'order' => 'integer',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(ProjectTask::class)->orderBy('order');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function calculateProgress(): float
    {
        $tasks = $this->tasks;
        if ($tasks->isEmpty()) {
            return 0;
        }

        $totalProgress = $tasks->sum('progress_percentage');
        return $totalProgress / $tasks->count();
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeOrdered($query)
    {
        return $query->orderBy('order');
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($phase) {
            if (empty($phase->uuid)) {
                $phase->uuid = Str::uuid();
            }
        });
    }
}

