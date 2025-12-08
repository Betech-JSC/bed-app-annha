<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use HasFactory;

    /**
     * Bảng tương ứng trong database
     *
     * @var string
     */
    protected $table = 'settings';

    /**
     * Các field được phép gán giá trị hàng loạt
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'key',
        'value',
        'type',
        'description',
    ];

    /**
     * Tự động cast value theo type nếu có
     */
    protected $casts = [
        'value' => 'string',
    ];

    /**
     * Lấy giá trị đã được xử lý đúng kiểu
     */
    public function getTypedValueAttribute()
    {
        return match ($this->type) {
            'integer' => (int) $this->value,
            'float', 'decimal' => (float) $this->value,
            'boolean' => filter_var($this->value, FILTER_VALIDATE_BOOLEAN),
            'json' => json_decode($this->value, true),
            default => $this->value,
        };
    }
}
