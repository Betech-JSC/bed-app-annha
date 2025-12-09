<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Project extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'name',
        'code',
        'description',
        'customer_id',
        'project_manager_id',
        'start_date',
        'end_date',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    protected $appends = [
        'is_active',
        'is_completed',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function projectManager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'project_manager_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function contract(): HasOne
    {
        return $this->hasOne(Contract::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(ProjectPayment::class);
    }

    public function additionalCosts(): HasMany
    {
        return $this->hasMany(AdditionalCost::class);
    }

    public function costs(): HasMany
    {
        return $this->hasMany(Cost::class);
    }

    public function personnel(): HasMany
    {
        return $this->hasMany(ProjectPersonnel::class);
    }

    public function subcontractors(): HasMany
    {
        return $this->hasMany(Subcontractor::class);
    }

    public function constructionLogs(): HasMany
    {
        return $this->hasMany(ConstructionLog::class);
    }

    public function acceptanceStages(): HasMany
    {
        return $this->hasMany(AcceptanceStage::class)->orderBy('order');
    }

    public function defects(): HasMany
    {
        return $this->hasMany(Defect::class);
    }

    public function progress(): HasOne
    {
        return $this->hasOne(ProjectProgress::class);
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // ==================================================================
    // ACCESSOR
    // ==================================================================

    public function getIsActiveAttribute(): bool
    {
        return $this->status === 'in_progress';
    }

    public function getIsCompletedAttribute(): bool
    {
        return $this->status === 'completed';
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeActive($query)
    {
        return $query->where('status', 'in_progress');
    }

    public function scopeForCustomer($query, $userId)
    {
        return $query->where('customer_id', $userId);
    }

    public function scopeForPersonnel($query, $userId)
    {
        return $query->whereHas('personnel', function ($q) use ($userId) {
            $q->where('user_id', $userId);
        });
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($project) {
            if (empty($project->uuid)) {
                $project->uuid = Str::uuid();
            }
            if (empty($project->code)) {
                $project->code = static::generateCode();
            }
        });
    }

    public static function generateCode(): string
    {
        $maxAttempts = 10;
        $attempt = 0;

        do {
            $code = 'PRJ-' . strtoupper(Str::random(6));
            $attempt++;
            $exists = static::where('code', $code)->exists();
            if (!$exists) {
                return $code;
            }
        } while ($attempt < $maxAttempts);

        return 'PRJ-' . time() . strtoupper(Str::random(3));
    }
}
