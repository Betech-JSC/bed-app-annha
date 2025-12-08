<?php

namespace App\Services;

use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Database\DatabaseManager;
use Illuminate\Validation\ValidationException;

class WalletService
{
    public function __construct(
        protected DatabaseManager $db
    ) {
    }

    public function ensureWallet(User $user): Wallet
    {
        return $user->wallet()->firstOrCreate([], [
            'balance'        => 0,
            'frozen_balance' => 0,
            'currency'       => 'VND',
            'status'         => 'active',
        ]);
    }

    public function deposit(User $user, PaymentMethod $method, float $amount, ?string $description = null): Transaction
    {
        $wallet = $this->ensureWallet($user);
        $wallet->ensureActive();

        if ($amount < $method->min_amount || $amount > $method->max_amount) {
            throw ValidationException::withMessages([
                'amount' => 'Số tiền nạp không nằm trong giới hạn cho phép của phương thức này.',
            ]);
        }

        $fee = $this->calculateFee($method, $amount);

        return $wallet->recordTransaction([
            'wallet_id'    => $wallet->id,
            'type'         => 'deposit',
            'method'       => $method->code,
            'amount'       => $amount,
            'fee'          => $fee,
            'status'       => 'pending',
            'description'  => $description ?? 'Nạp tiền ví',
            'gateway_data' => [
                'instructions' => $method->instructions,
                'metadata'     => $method->metadata,
            ],
            'metadata'     => [
                'payment_method_id' => $method->id,
            ],
        ]);
    }

    public function markDepositCompleted(Transaction $transaction, array $gatewayData = []): Transaction
    {
        if ($transaction->type !== 'deposit') {
            throw new \InvalidArgumentException('Chỉ xử lý được giao dịch nạp tiền.');
        }

        if ($transaction->status === 'completed') {
            return $transaction;
        }

        return $this->db->transaction(function () use ($transaction, $gatewayData) {
            $wallet = $transaction->wallet;
            $netAmount = $transaction->amount - $transaction->fee;

            $wallet->adjustBalance($netAmount);
            $wallet->last_transaction_at = now();
            $wallet->save();

            $transaction->update([
                'status'       => 'completed',
                'gateway_data' => array_merge($transaction->gateway_data ?? [], $gatewayData),
                'completed_at' => now(),
            ]);

            return $transaction;
        });
    }

    public function holdEscrow(Order $order): void
    {
        $senderWallet = $this->ensureWallet($order->sender);
        $senderWallet->ensureActive();

        if (!$senderWallet->hasSufficientBalance((float) $order->escrow_amount)) {
            throw ValidationException::withMessages([
                'wallet' => 'Số dư ví không đủ để giữ hộ khoản thanh toán.',
            ]);
        }

        $this->db->transaction(function () use ($order, $senderWallet) {
            $senderWallet->adjustBalance(-$order->escrow_amount);
            $senderWallet->adjustFrozen($order->escrow_amount);

            $senderWallet->recordTransaction([
                'wallet_id'    => $senderWallet->id,
                'type'         => 'escrow_hold',
                'method'       => 'wallet',
                'amount'       => $order->escrow_amount,
                'status'       => 'completed',
                'reference_type' => Order::class,
                'reference_id' => $order->id,
                'description'  => 'Giữ hộ tiền thưởng cho đơn #' . $order->uuid,
                'metadata'     => [
                    'order_uuid' => $order->uuid,
                ],
                'completed_at' => now(),
            ]);
        });
    }

    public function releaseEscrowToCustomer(Order $order): void
    {
        $senderWallet = $this->ensureWallet($order->sender);
        $customerWallet = $this->ensureWallet($order->customer);

        $amount = (float) $order->escrow_amount;

        $this->db->transaction(function () use ($order, $senderWallet, $customerWallet, $amount) {
            $senderWallet->adjustFrozen(-$amount);

            $customerWallet->adjustBalance($amount);

            $customerWallet->recordTransaction([
                'wallet_id'    => $customerWallet->id,
                'type'         => 'escrow_release',
                'method'       => 'wallet',
                'amount'       => $amount,
                'status'       => 'completed',
                'reference_type' => Order::class,
                'reference_id' => $order->id,
                'description'  => 'Nhận thưởng từ đơn #' . $order->uuid,
                'metadata'     => [
                    'order_uuid' => $order->uuid,
                    'from_user'  => $order->sender_id,
                ],
                'completed_at' => now(),
            ]);
        });
    }

    public function refundEscrowToSender(Order $order): void
    {
        $senderWallet = $this->ensureWallet($order->sender);
        $amount = (float) $order->escrow_amount;

        $this->db->transaction(function () use ($order, $senderWallet, $amount) {
            $senderWallet->adjustFrozen(-$amount);
            $senderWallet->adjustBalance($amount);

            $senderWallet->recordTransaction([
                'wallet_id'    => $senderWallet->id,
                'type'         => 'escrow_refund',
                'method'       => 'wallet',
                'amount'       => $amount,
                'status'       => 'completed',
                'reference_type' => Order::class,
                'reference_id' => $order->id,
                'description'  => 'Hoàn tiền escrow do đơn #' . $order->uuid . ' bị hủy',
                'metadata'     => [
                    'order_uuid' => $order->uuid,
                ],
                'completed_at' => now(),
            ]);
        });
    }

    protected function calculateFee(PaymentMethod $method, float $amount): float
    {
        $percentFee = ($method->fee_percent / 100) * $amount;
        return round($percentFee + $method->fee_flat, 2);
    }
}

