<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class MaterialSupplier extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'name',
        'code',
        'contact_person',
        'phone',
        'email',
        'address',
        'tax_code',
        'notes',
        'status',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function transactions(): HasMany
    {
        return $this->hasMany(MaterialTransaction::class, 'supplier_id');
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($supplier) {
            if (empty($supplier->uuid)) {
                $supplier->uuid = Str::uuid();
            }
        });
    }
}

