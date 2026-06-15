<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\HasAutoCode;
use Illuminate\Support\Str;

class GlobalEquipment extends Model
{
    use SoftDeletes, HasAutoCode;

    protected $table = 'global_equipments';

    protected $fillable = [
        'uuid',
        'name',
        'code',
        'category',
        'brand',
        'model',
        'unit',
        'unit_price',
        'description',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
    ];

    /**
     * Get actual equipment instances associated with this definition.
     */
    public function equipments()
    {
        return $this->hasMany(Equipment::class, 'global_equipment_id');
    }

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }
}
