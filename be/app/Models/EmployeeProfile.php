<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployeeProfile extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'employee_code',
        'full_name',
        'cccd',
        'date_of_birth',
        'place_of_birth',
        'phone',
        'emergency_contact_name',
        'emergency_contact_phone',
        'education_level',
        'skills',
        'profile_photo',
        'legal_documents',
        'employee_type',
        'team_name',
        'subcontractor_id',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'legal_documents' => 'array',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subcontractor(): BelongsTo
    {
        return $this->belongsTo(Subcontractor::class);
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    /**
     * Tự động tạo mã nhân sự nếu chưa có
     */
    public static function generateEmployeeCode(): string
    {
        $prefix = 'NV';
        $lastProfile = self::orderBy('id', 'desc')->first();
        
        if ($lastProfile && $lastProfile->employee_code) {
            $lastNumber = (int) str_replace($prefix, '', $lastProfile->employee_code);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }
        
        return $prefix . str_pad($newNumber, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Lấy label cho employee_type
     */
    public function getEmployeeTypeLabelAttribute(): string
    {
        $labels = [
            'official' => 'Nhân sự chính thức',
            'temporary' => 'Nhân sự thời vụ / khoán',
            'contracted' => 'Nhân sự thuê ngoài / thầu phụ',
            'engineer' => 'Kỹ sư – chỉ huy trưởng – giám sát',
            'worker' => 'Công nhân theo đội / tổ / nhà thầu',
        ];

        return $labels[$this->employee_type] ?? $this->employee_type;
    }
}
