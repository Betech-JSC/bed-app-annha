<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetAssignment extends Model
{
    protected $fillable = [
        'company_asset_id', 'action', 'user_id', 'project_id',
        'location', 'notes', 'performed_by',
    ];

    public function asset(): BelongsTo { return $this->belongsTo(CompanyAsset::class, 'company_asset_id'); }
    public function user(): BelongsTo  { return $this->belongsTo(User::class); }
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function performer(): BelongsTo { return $this->belongsTo(User::class, 'performed_by'); }
}
