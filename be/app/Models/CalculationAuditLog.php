<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalculationAuditLog extends Model
{
    protected $table = 'calculation_audit_logs';

    protected $fillable = [
        'project_id',
        'payroll_id',
        'calculation_type',
        'input_data',
        'output_data',
        'validation_result',
        'calculated_by',
        'calculated_at',
    ];

    protected $casts = [
        'input_data' => 'array',
        'output_data' => 'array',
        'validation_result' => 'array',
        'calculated_at' => 'datetime',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function payroll(): BelongsTo
    {
        return $this->belongsTo(Payroll::class);
    }

    public function calculator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'calculated_by');
    }
}

