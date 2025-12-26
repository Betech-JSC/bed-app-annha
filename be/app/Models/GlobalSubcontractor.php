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
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
