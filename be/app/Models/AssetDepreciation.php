<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetDepreciation extends Model
{
    protected $fillable = ['company_asset_id', 'depreciation_date', 'amount', 'remaining_value'];

    protected $casts = [
        'depreciation_date' => 'date',
        'amount'            => 'decimal:2',
        'remaining_value'   => 'decimal:2',
    ];

    public function asset(): BelongsTo
    {
        return $this->belongsTo(CompanyAsset::class, 'company_asset_id');
    }
}
