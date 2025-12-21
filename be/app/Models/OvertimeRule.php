<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class OvertimeRule extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'type',
        'start_time',
        'end_time',
        'multiplier',
        'description',
        'is_active',
        'effective_from',
        'effective_to',
    ];

    protected $casts = [
        'start_time' => 'datetime:H:i',
        'end_time' => 'datetime:H:i',
        'multiplier' => 'decimal:2',
        'is_active' => 'boolean',
        'effective_from' => 'date',
        'effective_to' => 'date',
    ];

    // ==================================================================
    // METHODS
    // ==================================================================

    /**
     * Lấy quy định OT phù hợp cho một thời điểm
     */
    public static function getRuleForDateTime(Carbon $dateTime, string $type = null): ?self
    {
        $query = self::where('is_active', true)
            ->where(function ($q) use ($dateTime) {
                $q->whereNull('effective_from')
                    ->orWhere('effective_from', '<=', $dateTime->toDateString());
            })
            ->where(function ($q) use ($dateTime) {
                $q->whereNull('effective_to')
                    ->orWhere('effective_to', '>=', $dateTime->toDateString());
            });

        if ($type) {
            $query->where('type', $type);
        } else {
            // Auto detect type
            $dayOfWeek = $dateTime->dayOfWeek;
            if ($dayOfWeek === Carbon::SATURDAY || $dayOfWeek === Carbon::SUNDAY) {
                $query->where('type', 'weekend');
            } else {
                $query->where('type', 'weekday');
            }
        }

        return $query->orderByDesc('multiplier')->first();
    }

    /**
     * Kiểm tra thời gian có nằm trong khoảng OT không
     */
    public function isTimeInRange(Carbon $time): bool
    {
        if (!$this->start_time || !$this->end_time) {
            return true; // Nếu không có giới hạn thời gian, áp dụng cho tất cả
        }

        $timeOnly = $time->format('H:i');
        $start = $this->start_time->format('H:i');
        $end = $this->end_time->format('H:i');

        if ($start <= $end) {
            // Normal range (e.g., 17:30 - 22:00)
            return $timeOnly >= $start && $timeOnly <= $end;
        } else {
            // Overnight range (e.g., 22:00 - 06:00)
            return $timeOnly >= $start || $timeOnly <= $end;
        }
    }
}
