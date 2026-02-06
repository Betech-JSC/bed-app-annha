<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

class Invoice extends Model
{
    protected $fillable = [
        'uuid',
        'project_id',
        'cost_group_id',
        'acceptance_stage_id',
        'invoice_number',
        'invoice_date',
        'customer_id',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'total_amount',
        'description',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function costGroup(): BelongsTo
    {
        return $this->belongsTo(CostGroup::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function attachments()
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function acceptanceStage(): BelongsTo
    {
        return $this->belongsTo(AcceptanceStage::class, 'acceptance_stage_id');
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($invoice) {
            if (empty($invoice->uuid)) {
                $invoice->uuid = Str::uuid();
            }
            if (empty($invoice->invoice_number)) {
                $invoice->invoice_number = 'INV-' . date('Ymd') . '-' . strtoupper(Str::random(6));
            }
        });
    }
}

