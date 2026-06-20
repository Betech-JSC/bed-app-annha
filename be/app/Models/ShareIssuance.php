<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShareIssuance extends Model
{
    protected $fillable = [
        'issue_date', 'shares_count', 'share_price', 'description', 'created_by'
    ];

    protected $casts = [
        'issue_date' => 'date',
        'shares_count' => 'integer',
        'share_price' => 'decimal:2',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
