<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Wallet extends Model
{
    protected $fillable = [
        'user_id',
        'balance',
        'frozen_balance',
        'currency',
        'status',
        'last_transaction_at',
    ];

    protected $casts = [
        'balance'            => 'decimal:2',
        'frozen_balance'     => 'decimal:2',
        'last_transaction_at'=> 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function ensureActive(): void
    {
        if ($this->status !== 'active') {
            throw new \RuntimeException('Wallet đang bị khóa, vui lòng liên hệ hỗ trợ.');
        }
    }

    public function hasSufficientBalance(float $amount): bool
    {
        return $this->balance >= $amount;
    }

    public function adjustBalance(float $amount): void
    {
        $this->balance = $this->balance + $amount;
        $this->last_transaction_at = now();
        $this->save();
    }

    public function adjustFrozen(float $amount): void
    {
        $this->frozen_balance = $this->frozen_balance + $amount;
        $this->last_transaction_at = now();
        $this->save();
    }

    public function recordTransaction(array $attributes): Transaction
    {
        return $this->transactions()->create(array_merge([
            'uuid'   => Str::uuid(),
            'user_id'=> $this->user_id,
        ], $attributes));
    }
}
