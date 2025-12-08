<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use App\Models\Transaction;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WalletController extends Controller
{
    public function __construct(
        protected WalletService $walletService
    ) {
    }

    public function me(Request $request)
    {
        $wallet = $this->walletService->ensureWallet($request->user())->load('transactions');

        return ApiResponse::success([
            'balance'        => $wallet->balance,
            'frozen_balance' => $wallet->frozen_balance,
            'currency'       => $wallet->currency,
            'status'         => $wallet->status,
            'last_transaction_at' => $wallet->last_transaction_at,
        ]);
    }

    public function deposit(Request $request)
    {
        $validated = $request->validate([
            'payment_method' => [
                'required',
                Rule::exists('payment_methods', 'code')->where('is_active', true),
            ],
            'amount' => 'required|numeric|min:50000',
            'description' => 'nullable|string|max:255',
        ]);

        $method = PaymentMethod::where('code', $validated['payment_method'])->firstOrFail();

        $transaction = $this->walletService->deposit(
            $request->user(),
            $method,
            (float) $validated['amount'],
            $validated['description'] ?? null
        );

        return ApiResponse::success([
            'transaction_uuid' => $transaction->uuid,
            'amount'           => $transaction->amount,
            'fee'              => $transaction->fee,
            'status'           => $transaction->status,
            'instructions'     => $transaction->gateway_data['instructions'] ?? null,
            'metadata'         => $transaction->gateway_data['metadata'] ?? null,
        ], 'Tạo yêu cầu nạp tiền thành công. Vui lòng thanh toán theo hướng dẫn.');
    }

    public function confirmDeposit(Request $request, string $uuid)
    {
        $user = auth()->user();
        $transaction = Transaction::where('uuid', $uuid)
            ->where('user_id', $user->id)
            ->where('type', 'deposit')
            ->firstOrFail();

        if ($transaction->status === 'completed') {
            return ApiResponse::success($transaction, 'Giao dịch đã hoàn tất trước đó.');
        }

        // Cho phép user đính kèm thông tin để CSKH duyệt
        $payload = $request->validate([
            'payment_reference' => 'required|string|max:190',
            'note'              => 'nullable|string|max:500',
        ]);

        $transaction->update([
            'gateway_data' => array_merge($transaction->gateway_data ?? [], [
                'user_reference' => $payload['payment_reference'],
                'note'           => $payload['note'] ?? null,
            ]),
            'status' => 'processing',
        ]);

        return ApiResponse::success($transaction, 'Đã ghi nhận thông tin thanh toán, vui lòng chờ duyệt.');
    }

    public function transactions(Request $request)
    {
        $transactions = $request->user()
            ->transactions()
            ->latest()
            ->paginate(20);

        return ApiResponse::success($transactions, 'Danh sách giao dịch ví');
    }

    public function approveDeposit(Request $request, string $uuid)
    {
        // $this->ensureSupportRole($request);

        $payload = $request->validate([
            'action' => 'required|in:approve,reject',
            'note'   => 'nullable|string|max:500',
        ]);

        $transaction = Transaction::where('uuid', $uuid)
            ->where('type', 'deposit')
            ->firstOrFail();

        if ($payload['action'] === 'approve') {
            if ($transaction->status === 'completed') {
                return ApiResponse::success($transaction, 'Giao dịch đã được duyệt trước đó.');
            }

            $transaction = $this->walletService->markDepositCompleted($transaction, [
                'approved_by'  => $request->user()->id,
                'approved_note'=> $payload['note'],
            ]);

            return ApiResponse::success($transaction, 'Đã duyệt và cộng tiền vào ví.');
        }

        // reject flow
        if (in_array($transaction->status, ['failed', 'cancelled'])) {
            return ApiResponse::success($transaction, 'Giao dịch đã bị từ chối trước đó.');
        }

        $transaction->update([
            'status'       => 'failed',
            'cancelled_at' => now(),
            'gateway_data' => array_merge($transaction->gateway_data ?? [], [
                'rejected_by'  => $request->user()->id,
                'rejected_note'=> $payload['note'],
            ]),
        ]);

        return ApiResponse::success($transaction, 'Đã từ chối giao dịch nạp tiền.');
    }

    private function ensureSupportRole(Request $request): void
    {
        if (!in_array($request->user()->role, ['admin', 'support'])) {
            abort(
                response()->json([
                    'status'  => 'error',
                    'message' => 'Bạn không có quyền duyệt giao dịch ví.',
                ], 403)
            );
        }
    }
}

