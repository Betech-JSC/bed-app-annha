<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Str;

class Reminder extends Model
{
    protected $fillable = [
        'uuid',
        'remindable_type',
        'remindable_id',
        'title',
        'body',
        'reminder_type',
        'reminder_date',
        'due_date',
        'status',
        'user_id',
        'is_recurring',
        'recurrence_pattern',
        'recurrence_interval',
        'next_reminder_date',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'reminder_date' => 'datetime',
        'due_date' => 'datetime',
        'next_reminder_date' => 'datetime',
        'is_recurring' => 'boolean',
        'recurrence_interval' => 'integer',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function remindable(): MorphTo
    {
        return $this->morphTo();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($reminder) {
            if (empty($reminder->uuid)) {
                $reminder->uuid = Str::uuid();
            }
        });
    }
}

