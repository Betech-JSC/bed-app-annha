<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GlobalSubcontractor extends Model
{
    protected $fillable = [
        'name',
        'category',
        'contact_person',
        'phone',
        'email',
        'address',
        'description',
        'tax_code',
        'bank_name',
        'bank_account_number',
        'bank_account_name',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
