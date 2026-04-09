<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sequence extends Model
{
    protected $fillable = [
        'type',
        'prefix',
        'suffix',
        'last_value',
        'length',
    ];
}
