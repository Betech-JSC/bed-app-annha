<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

class Subcontractor extends Model
{
    protected $fillable = [
        'uuid',
        'project_id',
        'global_subcontractor_id',
        'name',
        'category',
        'bank_name',
        'bank_account_number',
        'bank_account_name',
        'total_quote',
        'advance_payment',
        'total_paid',
        'progress_start_date',
        'progress_end_date',
        'progress_status',
        'payment_status',
        'payment_schedule',
        'approved_by',
        'approved_at',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'total_quote' => 'decimal:2',
        'advance_payment' => 'decimal:2',
        'total_paid' => 'decimal:2',
        'progress_start_date' => 'date',
        'progress_end_date' => 'date',
        'approved_at' => 'datetime',
        'payment_schedule' => 'array',
    ];

    protected $appends = [
        'remaining_amount',
        'payment_percentage',
        'approved_amount',
        'pending_amount',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function globalSubcontractor(): BelongsTo
    {
        return $this->belongsTo(GlobalSubcontractor::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function items(): HasMany
    {
        return $this->hasMany(SubcontractorItem::class)->orderBy('order');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SubcontractorPayment::class)->orderByDesc('created_at');
    }

    public function costs(): HasMany
    {
        return $this->hasMany(Cost::class);
    }

    public function contracts(): HasMany
    {
        return $this->hasMany(SubcontractorContract::class);
    }

    public function acceptances(): HasMany
    {
        return $this->hasMany(SubcontractorAcceptance::class);
    }

    public function progress(): HasMany
    {
        return $this->hasMany(SubcontractorProgress::class);
    }

    // ==================================================================
    // ACCESSOR
    // ==================================================================

    public function getRemainingAmountAttribute(): float
    {
        return $this->total_quote - $this->total_paid;
    }

    public function getApprovedAmountAttribute(): float
    {
        return $this->payments()
            ->whereIn('status', ['pending_accountant_confirmation', 'paid'])
            ->sum('amount');
    }

    public function getPendingAmountAttribute(): float
    {
        return $this->payments()
            ->whereIn('status', ['pending_management_approval'])
            ->sum('amount');
    }

    public function getPaymentPercentageAttribute(): float
    {
        if ($this->total_quote == 0) {
            return 0;
        }
        return ($this->total_paid / $this->total_quote) * 100;
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function recordPayment(float $amount): bool
    {
        $this->total_paid += $amount;
        
        if ($this->total_paid >= $this->total_quote && $this->total_quote > 0) {
            $this->payment_status = 'completed';
        } elseif ($this->total_paid > 0) {
            $this->payment_status = 'partial';
        } else {
            $this->payment_status = 'pending';
        }
        
        return $this->save();
    }

    /**
     * Tính toán lại tổng tiền đã thanh toán từ bảng subcontractor_payments
     */
    public function recalculateFinancials(): bool
    {
        $this->total_paid = $this->payments()
            ->where('status', 'paid')
            ->sum('amount');

        if ($this->total_paid >= $this->total_quote && $this->total_quote > 0) {
            $this->payment_status = 'completed';
        } elseif ($this->total_paid > 0) {
            $this->payment_status = 'partial';
        } else {
            $this->payment_status = 'pending';
        }

        return $this->save();
    }

    public function approve(?User $user = null): bool
    {
        if ($user) {
            $this->approved_by = $user->id;
        }
        $this->approved_at = now();
        return $this->save();
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeByCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    public function scopeByProgressStatus($query, $status)
    {
        return $query->where('progress_status', $status);
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($subcontractor) {
            if (empty($subcontractor->uuid)) {
                $subcontractor->uuid = (string) Str::uuid();
            }
        });

        static::saving(function ($subcontractor) {
            // Nếu không có global_subcontractor_id nhưng có name (người dùng nhập tên trực tiếp)
            if (empty($subcontractor->global_subcontractor_id) && !empty($subcontractor->name)) {
                $nameTrimmed = trim($subcontractor->name);
                // Tìm kiếm GlobalSubcontractor có cùng tên
                $gs = \App\Models\GlobalSubcontractor::where('name', $nameTrimmed)->first();
                if (!$gs) {
                    // Tạo mới nếu chưa có
                    $gs = \App\Models\GlobalSubcontractor::create([
                        'name' => $nameTrimmed,
                        'category' => $subcontractor->category,
                        'bank_name' => $subcontractor->bank_name,
                        'bank_account_number' => $subcontractor->bank_account_number,
                        'bank_account_name' => $subcontractor->bank_account_name,
                    ]);
                } else {
                    // Nếu đã có GlobalSubcontractor trùng tên, cập nhật thông tin mới nhất sang GlobalSubcontractor
                    $updateData = [];
                    if (!empty($subcontractor->category) && $subcontractor->category !== $gs->category) {
                        $updateData['category'] = $subcontractor->category;
                    }
                    if (!empty($subcontractor->bank_name) && $subcontractor->bank_name !== $gs->bank_name) {
                        $updateData['bank_name'] = $subcontractor->bank_name;
                    }
                    if (!empty($subcontractor->bank_account_number) && $subcontractor->bank_account_number !== $gs->bank_account_number) {
                        $updateData['bank_account_number'] = $subcontractor->bank_account_number;
                    }
                    if (!empty($subcontractor->bank_account_name) && $subcontractor->bank_account_name !== $gs->bank_account_name) {
                        $updateData['bank_account_name'] = $subcontractor->bank_account_name;
                    }
                    
                    if (!empty($updateData)) {
                        $gs->update($updateData);
                    }
                }
                // Gán liên kết id cho nhà thầu phụ dự án
                $subcontractor->global_subcontractor_id = $gs->id;
            } elseif (!empty($subcontractor->global_subcontractor_id)) {
                // Nếu có global_subcontractor_id, đảm bảo đồng bộ thông tin 2 chiều
                $gs = \App\Models\GlobalSubcontractor::find($subcontractor->global_subcontractor_id);
                if ($gs) {
                    if (empty($subcontractor->name)) {
                        $subcontractor->name = $gs->name;
                    }
                    
                    $updateData = [];
                    if (!empty($subcontractor->name) && trim($subcontractor->name) !== $gs->name) {
                        $updateData['name'] = trim($subcontractor->name);
                    }
                    if (!empty($subcontractor->category) && $subcontractor->category !== $gs->category) {
                        $updateData['category'] = $subcontractor->category;
                    }
                    if (!empty($subcontractor->bank_name) && $subcontractor->bank_name !== $gs->bank_name) {
                        $updateData['bank_name'] = $subcontractor->bank_name;
                    }
                    if (!empty($subcontractor->bank_account_number) && $subcontractor->bank_account_number !== $gs->bank_account_number) {
                        $updateData['bank_account_number'] = $subcontractor->bank_account_number;
                    }
                    if (!empty($subcontractor->bank_account_name) && $subcontractor->bank_account_name !== $gs->bank_account_name) {
                        $updateData['bank_account_name'] = $subcontractor->bank_account_name;
                    }
                    
                    if (!empty($updateData)) {
                        $gs->update($updateData);
                    }
                }
            }
        });
    }
}
