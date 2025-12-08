<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

class Flight extends Model
{
    protected $fillable = [
        'uuid',
        'customer_id',
        'from_airport',
        'to_airport',
        'flight_date',
        'airline',
        'status',
        'flight_number',
        'boarding_pass_url',
        'verified',
        'verified_at',
        'verified_by',
        'max_weight',
        'booked_weight',
        'note',
    ];

    protected $casts = [
        'flight_date' => 'date',
        'verified_at' => 'datetime',
        'verified'    => 'boolean',
        'max_weight'  => 'decimal:2',
        'booked_weight' => 'decimal:2',
    ];

    protected $appends = [
        'available_weight',
        'is_fully_booked',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    /** Hành khách sở hữu chuyến bay */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id')->withDefault();
    }

    public function requests(): HasMany
    {
        return $this->hasMany(Request::class);
    }

    /** Người xác thực vé (admin hoặc AI) */
    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    /** Ảnh/video/file đính kèm (vé máy bay, hành lý thừa…) */
    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable')->orderBy('sort_order');
    }

    /** Các order đã được tạo từ chuyến bay này */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    // ==================================================================
    // ACCESSOR & MUTATOR
    // ==================================================================

    /** Còn bao nhiêu kg mang thêm */
    public function getAvailableWeightAttribute(): float
    {
        return round($this->max_weight - $this->booked_weight, 2);
    }

    /** Đã hết chỗ chưa */
    public function getIsFullyBookedAttribute(): bool
    {
        return $this->available_weight < 0.5; // dưới 0.5kg coi như hết
    }

    /** URL ảnh vé (dễ dùng ở frontend) */
    public function getBoardingPassUrlAttribute(): ?string
    {
        return $this->boardingPass?->url ?? $this->attributes['boarding_pass_url'] ?? null;
    }

    // ==================================================================
    // SCOPE TIỆN ÍCH
    // ==================================================================

    /** Chỉ lấy chuyến bay đã được duyệt vé */
    public function scopeVerified($query)
    {
        return $query->where('verified', true);
    }

    /** Chỉ lấy chuyến bay còn chỗ trống */
    public function scopeHasAvailableWeight($query, float $minKg = 0.5)
    {
        return $query->whereRaw('max_weight - booked_weight >= ?', [$minKg]);
    }

    /** Chỉ lấy chuyến bay trong tương lai (từ giờ trở đi) */
    public function scopeUpcoming($query)
    {
        return $query->where('flight_date', '>=', today())
            ->orWhere(function ($q) {
                $q->where('flight_date', today())
                    ->whereTime('created_at', '>=', now()->subHours(6));
            });
    }

    /** Tìm chuyến bay theo tuyến + ngày */
    public function scopeByRouteAndDate($query, string $from, string $to, string $date = null)
    {
        $query->where('from_airport', $from)
            ->where('to_airport', $to);

        if ($date) {
            $query->whereDate('flight_date', $date);
        }

        return $query;
    }

    // ==================================================================
    // HÀM TIỆN ÍCH
    // ==================================================================

    /** Tăng booked_weight khi có đơn hàng mới */
    public function increaseBookedWeight(float $kg): bool
    {
        if ($this->available_weight < $kg) {
            return false;
        }

        $this->booked_weight += $kg;
        return $this->save();
    }

    /** Giảm booked_weight khi hủy đơn */
    public function decreaseBookedWeight(float $kg): bool
    {
        $this->booked_weight = max(0, $this->booked_weight - $kg);
        return $this->save();
    }

    /** Đánh dấu đã xác thực vé */
    public function markAsVerified(User|\App\Models\Admin|int|null $verifier = null): bool
    {
        $this->verified    = true;
        $this->verified_at = now();
        
        // Nếu là object, lấy ID. Nếu là Admin, không lưu (vì verified_by chỉ reference users table)
        if ($verifier instanceof User) {
            $this->verified_by = $verifier->id;
        } elseif ($verifier instanceof \App\Models\Admin) {
            // Admin không có trong users table, nên không lưu ID
            $this->verified_by = null;
        } elseif (is_int($verifier)) {
            $this->verified_by = $verifier;
        } else {
            $this->verified_by = null;
        }

        return $this->save();
    }

    public function transform()
    {
        return [
            'id'               => $this->id,
            'uuid'             => $this->uuid,
            'from_airport'     => $this->from_airport,
            'to_airport'       => $this->to_airport,
            'flight_date'      => $this->flight_date->format('Y-m-d'),
            'airline'          => $this->airline,
            'flight_number'    => $this->flight_number,
            'available_weight' => round($this->max_weight - $this->booked_weight, 2),
            'max_weight'       => $this->max_weight,
            'customer'         => $this->customer,
            'can_send_request' => true,
            'created_at'       => $this->created_at->format('Y-m-d H:i:s'),
        ];
    }
}
