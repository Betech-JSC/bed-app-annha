<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Region extends Model
{
    use HasFactory;

    protected $fillable = [
        'country_id',
        'level',
        'code',
        'parent_code',
        'type',
        'name',
        'name_with_type',
        'path',
        'path_with_type',
        'sort',
        'shipping_price',
    ];

    public function transform()
    {
        return [
            'id' => $this->id,
            'title' => $this->name,
            'name' => $this->name,
            'value' => $this->id,
        ];
    }
}
