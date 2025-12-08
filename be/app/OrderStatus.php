<?php

namespace App\Enums;

enum OrderStatus: string
{
    case Pending = 'pending';
    case Matched = 'matched';
    case Confirmed = 'confirmed';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';

    /**
     * Lấy danh sách tất cả giá trị Enum
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Kiểm tra trạng thái có hợp lệ không
     */
    public static function isValid(string $status): bool
    {
        return in_array($status, self::values());
    }
}
