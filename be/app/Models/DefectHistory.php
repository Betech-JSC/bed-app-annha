<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DefectHistory extends Model
{
    protected $fillable = [
        'defect_id',
        'action',
        'old_status',
        'new_status',
        'comment',
        'user_id',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function defect(): BelongsTo
    {
        return $this->belongsTo(Defect::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
