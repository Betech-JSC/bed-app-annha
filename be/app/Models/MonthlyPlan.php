<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MonthlyPlan extends Model
{
    use SoftDeletes;

    protected $fillable = ['month', 'year', 'title', 'general_goal', 'meeting_notes', 'status', 'created_by'];

    public function tasks(): HasMany
    {
        return $this->hasMany(MonthlyTask::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
