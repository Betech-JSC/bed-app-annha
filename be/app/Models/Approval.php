<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Approval extends Model
{
    use HasFactory;

    protected $fillable = [
        'approvable_type',
        'approvable_id',
        'project_id',
        'user_id',
        'status',
        'current_level',
        'summary',
        'metadata',
        'last_action',
        'last_actor_id',
    ];

    protected $casts = [
        'metadata' => 'array',
        'current_level' => 'integer',
    ];

    /**
     * Get the owning approvable model.
     */
    public function approvable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Get the project associated with the approval.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the user who requested the approval.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the last user who acted on this approval.
     */
    public function lastActor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'last_actor_id');
    }

    /**
     * Get the logs for this approval.
     */
    public function logs(): HasMany
    {
        return $this->hasMany(ApprovalLog::class);
    }
}
