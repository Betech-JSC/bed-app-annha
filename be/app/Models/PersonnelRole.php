<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PersonnelRole extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'description',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    /**
     * Project personnel với role này
     */
    public function projectPersonnel(): HasMany
    {
        return $this->hasMany(ProjectPersonnel::class, 'role_id');
    }
}
