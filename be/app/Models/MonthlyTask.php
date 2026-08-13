<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MonthlyTask extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'monthly_plan_id', 'title', 'description', 'assigned_to', 
        'status', 'evaluation', 'evaluation_reason', 'due_date', 'created_by'
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(MonthlyPlan::class, 'monthly_plan_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
