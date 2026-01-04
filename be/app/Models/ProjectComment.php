<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ProjectComment extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'project_id',
        'user_id',
        'content',
        'parent_id',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ProjectComment::class, 'parent_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(ProjectComment::class, 'parent_id')->orderBy('created_at', 'asc');
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($comment) {
            if (empty($comment->uuid)) {
                $comment->uuid = Str::uuid();
            }
        });
    }
}
