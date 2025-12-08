<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attachment extends Model
{
    protected $fillable = [
        'original_name',
        'type',
        'file_name',
        'file_path',
        'file_url',
        'file_size',
        'mime_type',
        'attachable_id',
        'attachable_type',
        'uploaded_by',
        'sort_order',
        'description',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'sort_order' => 'integer',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    /** Người upload file */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /** Polymorphic: Model mà attachment này thuộc về (Order, Flight, etc.) */
    public function attachable()
    {
        return $this->morphTo();
    }
}
