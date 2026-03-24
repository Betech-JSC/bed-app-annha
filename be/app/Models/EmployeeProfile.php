<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * EmployeeProfile - Hồ sơ nhân viên
 * (Stub model - chưa có migration, sẽ triển khai sau)
 */
class EmployeeProfile extends Model
{
    protected $fillable = [
        'user_id',
        'employee_code',
        'position',
        'department',
        'join_date',
        'address',
        'bank_name',
        'bank_account',
        'tax_code',
        'social_insurance_number',
    ];

    protected $casts = [
        'join_date' => 'date',
    ];

    /**
     * User owning this profile
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
