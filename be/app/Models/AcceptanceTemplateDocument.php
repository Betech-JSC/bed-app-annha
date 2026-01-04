<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AcceptanceTemplateDocument extends Model
{
    protected $fillable = [
        'acceptance_template_id',
        'attachment_id',
        'order',
    ];

    protected $casts = [
        'order' => 'integer',
    ];

    public function template(): BelongsTo
    {
        return $this->belongsTo(AcceptanceTemplate::class);
    }

    public function attachment(): BelongsTo
    {
        return $this->belongsTo(Attachment::class);
    }
}
