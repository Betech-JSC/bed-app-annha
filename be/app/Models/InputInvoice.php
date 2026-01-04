<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class InputInvoice extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'project_id',
        'invoice_type',
        'issue_date',
        'invoice_number',
        'supplier_name',
        'amount_before_vat',
        'vat_percentage',
        'vat_amount',
        'total_amount',
        'description',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'issue_date' => 'date',
        'amount_before_vat' => 'decimal:2',
        'vat_percentage' => 'decimal:2',
        'vat_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // ==================================================================
    // ACCESSOR
    // ==================================================================

    /**
     * Tính VAT amount từ amount_before_vat và vat_percentage
     */
    public function calculateVatAmount(): float
    {
        if ($this->vat_percentage <= 0 || $this->amount_before_vat <= 0) {
            return 0.0;
        }
        return (float) ($this->amount_before_vat * $this->vat_percentage / 100);
    }

    /**
     * Tính total_amount từ amount_before_vat + vat_amount
     */
    public function calculateTotalAmount(): float
    {
        return (float) ($this->amount_before_vat + $this->vat_amount);
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
            
            // Tự động tính VAT amount và total amount
            if ($invoice->amount_before_vat > 0) {
                $vatAmount = $invoice->vat_percentage > 0 
                    ? ($invoice->amount_before_vat * $invoice->vat_percentage / 100)
                    : 0;
                $invoice->vat_amount = $vatAmount;
                $invoice->total_amount = $invoice->amount_before_vat + $vatAmount;
            }
        });

        static::updating(function ($invoice) {
            // Tự động tính lại VAT amount và total amount khi cập nhật
            if ($invoice->isDirty(['amount_before_vat', 'vat_percentage'])) {
                $vatAmount = $invoice->vat_percentage > 0 
                    ? ($invoice->amount_before_vat * $invoice->vat_percentage / 100)
                    : 0;
                $invoice->vat_amount = $vatAmount;
                $invoice->total_amount = $invoice->amount_before_vat + $vatAmount;
            }
        });
    }
}
