<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class CashFlow extends Model
{
    protected $fillable = [
        'uuid', 'project_id', 'type', 'category',
        'amount', 'planned_date', 'actual_date',
        'reference_type', 'reference_id',
        'notes', 'created_by',
    ];

    protected $casts = [
        'amount'       => 'decimal:2',
        'planned_date' => 'date',
        'actual_date'  => 'date',
    ];

    // --- Relationships ---
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }

    public function reference()
    {
        return $this->morphTo('reference');
    }

    // --- Scopes ---
    public function scopeInflows($q)  { return $q->where('type', 'inflow'); }
    public function scopeOutflows($q) { return $q->where('type', 'outflow'); }
    public function scopeByCategory($q, string $cat) { return $q->where('category', $cat); }
    public function scopePlanned($q)  { return $q->whereNotNull('planned_date'); }
    public function scopeActual($q)   { return $q->whereNotNull('actual_date'); }

    public function scopeInPeriod($q, string $from, string $to)
    {
        return $q->where(function ($query) use ($from, $to) {
            $query->whereBetween('actual_date', [$from, $to])
                ->orWhereBetween('planned_date', [$from, $to]);
        });
    }

    // --- Labels ---
    public function getCategoryLabelAttribute(): string
    {
        return match ($this->category) {
            'advance'            => 'Tạm ứng',
            'progress_payment'   => 'Thanh toán tiến độ',
            'retention'          => 'Giữ lại bảo hành',
            'warranty'           => 'Chi phí bảo hành',
            'material_purchase'  => 'Mua vật tư',
            'labor'              => 'Nhân công',
            'equipment'          => 'Thiết bị',
            'subcontractor'      => 'Nhà thầu phụ',
            'tax'                => 'Thuế',
            default              => 'Khác',
        };
    }

    // --- Boot ---
    protected static function boot()
    {
        parent::boot();
        static::creating(fn($m) => $m->uuid = $m->uuid ?: Str::uuid());
    }
}
