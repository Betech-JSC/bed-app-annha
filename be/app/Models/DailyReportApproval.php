<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyReportApproval extends Model
{
    protected $fillable = [
        'construction_log_id', 'approver_id',
        'status', 'notes', 'approved_at',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function constructionLog(): BelongsTo
    {
        return $this->belongsTo(ConstructionLog::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_id');
    }
}
