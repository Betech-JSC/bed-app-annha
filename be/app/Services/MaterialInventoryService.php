<?php

namespace App\Services;

use App\Models\Cost;
use App\Models\Material;
use App\Models\MaterialTransaction;
use App\Models\CostGroup;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MaterialInventoryService
{
    public function createTransactionFromCost(Cost $cost): ?MaterialTransaction
    {
        // Chức năng tự động tạo giao dịch nhập kho đã bị loại bỏ theo yêu cầu loại bỏ module tồn kho.
        // Chỉ giữ lại để tránh lỗi nếu có code references, nhưng không thực hiện logic.
        return null;
    }

    /**
     * Xóa MaterialTransaction khi Cost bị reject hoặc xóa
     * 
     * @param Cost $cost
     * @return bool
     */
    public function deleteTransactionFromCost(Cost $cost): bool
    {
        if (!$cost->material_id) {
            return false;
        }

        try {
            $transactionsCount = $cost->materialTransactions()->count();
            if ($transactionsCount > 0) {
                $cost->materialTransactions()->delete();
                Log::info("Đã xóa {$transactionsCount} MaterialTransaction từ Cost {$cost->id}");
                return true;
            }
            return false;
        } catch (\Exception $e) {
            Log::error("Lỗi khi xóa MaterialTransaction từ Cost {$cost->id}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Ghi nhận sử dụng vật liệu cho dự án và đẩy qua chi phí dự án
     *
     * @param int $materialId
     * @param int $projectId
     * @param float $quantity
     * @param string $notes
     * @param int $createdBy
     * @param string|null $transactionDate
     * @param int|null $costGroupId
     * @param float|null $amount
     * @return MaterialTransaction|null
     */
    public function createUsageTransaction(
        int $materialId,
        int $projectId,
        float $quantity,
        string $notes = '',
        int $createdBy,
        ?string $transactionDate = null,
        ?int $costGroupId = null,
        ?float $amount = null
    ): ?MaterialTransaction {
        try {
            $material = Material::findOrFail($materialId);

            DB::beginTransaction();

            $transactionDateStr = $transactionDate ? \Carbon\Carbon::parse($transactionDate)->toDateString() : now()->toDateString();

            // Lấy unit_price từ amount/quantity nếu có amount, else từ material hoặc transaction nhập gần nhất
            $unitPrice = 0;
            $totalAmount = 0;

            if ($amount !== null && $amount > 0) {
                $totalAmount = (float) $amount;
                $unitPrice = $quantity > 0 ? $totalAmount / $quantity : 0;
            } else {
                $lastInTransaction = MaterialTransaction::where('material_id', $materialId)
                    ->where('type', 'in')
                    ->where('status', 'approved')
                    ->orderBy('transaction_date', 'desc')
                    ->first();
                $unitPrice = $lastInTransaction?->unit_price ?? $material->unit_price ?? 0;
                $totalAmount = $quantity * $unitPrice;
            }

            // Tạo Cost mới khi có cost_group_id và amount - đẩy qua chi phí dự án
            $costId = null;
            if ($costGroupId && $totalAmount > 0) {
                $costGroup = CostGroup::find($costGroupId);
                if ($costGroup && $costGroup->is_active) {
                    // Trạng thái draft - theo quy trình duyệt của module chi phí dự án (draft → pending_management → pending_accountant → approved)
                    $cost = Cost::create([
                        'project_id' => $projectId,
                        'cost_group_id' => $costGroupId,
                        'material_id' => $materialId,
                        'name' => "Sử dụng vật liệu: {$material->name}",
                        'amount' => $totalAmount,
                        'quantity' => $quantity,
                        'description' => "Ghi nhận sử dụng vật liệu cho dự án" . ($notes ? ": {$notes}" : ""),
                        'cost_date' => $transactionDateStr,
                        'status' => 'draft',
                        'created_by' => $createdBy,
                    ]);
                    $costId = $cost->id;

                    $syncService = app(\App\Services\BudgetSyncService::class);
                    $syncService->syncProjectBudgets($projectId);

                    Log::info("Đã tạo Cost {$cost->id} từ MaterialTransaction xuất kho cho Material {$materialId}");
                }
            }

            $transaction = MaterialTransaction::create([
                'material_id' => $materialId,
                'project_id' => $projectId,
                'cost_id' => $costId,
                'type' => 'out',
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'total_amount' => $totalAmount,
                'transaction_date' => $transactionDateStr,
                'notes' => $notes ?: "Sử dụng vật liệu cho dự án",
                'status' => 'approved',
                'created_by' => $createdBy,
                'approved_by' => $createdBy,
                'approved_at' => now(),
            ]);

            DB::commit();

            Log::info("Đã tạo transaction xuất kho {$transaction->id} cho Material {$materialId}" . ($costId ? " với Cost {$costId}" : ""));

            return $transaction->load(['material', 'project', 'cost']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Lỗi khi tạo transaction xuất kho: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Tạo phiếu sử dụng vật liệu tổng hợp và đẩy qua một chi phí tổng dự án
     *
     * @param array $items Array of ['material_id', 'quantity', 'amount', 'notes']
     * @param int $projectId
     * @param int $createdBy
     * @param string|null $transactionDate
     * @param int|null $costGroupId
     * @return array
     */
    public function createBatchUsageTransaction(
        array $items,
        int $projectId,
        int $createdBy,
        ?string $transactionDate = null,
        ?int $costGroupId = null
    ): array {
        try {
            DB::beginTransaction();

            $transactionDateStr = $transactionDate ? \Carbon\Carbon::parse($transactionDate)->toDateString() : now()->toDateString();
            $totalBatchAmount = 0;
            $materialNames = [];

            foreach ($items as $item) {
                $totalBatchAmount += $item['amount'] ?? 0;
                $material = Material::find($item['material_id']);
                if ($material) {
                    $materialNames[] = "[{$material->name} x {$item['quantity']}]";
                }
            }

            // 1. Tạo Cost tổng duy nhất cho cả Batch (nếu có cost_group_id)
            $costId = null;
            if ($costGroupId && $totalBatchAmount > 0) {
                $costGroup = CostGroup::find($costGroupId);
                if ($costGroup && $costGroup->is_active) {
                    $cost = Cost::create([
                        'project_id' => $projectId,
                        'cost_group_id' => $costGroupId,
                        'name' => "Sử dụng vật liệu tổng hợp - " . \Carbon\Carbon::parse($transactionDateStr)->format('d/m/Y'),
                        'amount' => $totalBatchAmount,
                        'description' => "Chi tiết vật liệu: " . implode(', ', $materialNames),
                        'cost_date' => $transactionDateStr,
                        'status' => 'draft',
                        'created_by' => $createdBy,
                    ]);
                    $costId = $cost->id;

                    $syncService = app(\App\Services\BudgetSyncService::class);
                    $syncService->syncProjectBudgets($projectId);
                }
            }

            // 2. Tạo các MaterialTransaction riêng lẻ nhưng link tới cùng costId
            $transactions = [];
            foreach ($items as $item) {
                $materialId = $item['material_id'];
                $quantity = $item['quantity'];
                $amount = $item['amount'] ?? 0;
                $notes = $item['notes'] ?? '';

                $material = Material::findOrFail($materialId);
                $unitPrice = $quantity > 0 ? $amount / $quantity : 0;

                $transaction = MaterialTransaction::create([
                    'material_id' => $materialId,
                    'project_id' => $projectId,
                    'cost_id' => $costId,
                    'type' => 'out',
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'total_amount' => $amount,
                    'transaction_date' => $transactionDateStr,
                    'notes' => $notes ?: "Sử dụng vật liệu trong gói tổng hợp",
                    'status' => 'approved',
                    'created_by' => $createdBy,
                    'approved_by' => $createdBy,
                    'approved_at' => now(),
                ]);
                $transactions[] = $transaction;
            }

            DB::commit();

            return [
                'cost_id' => $costId,
                'transactions' => $transactions
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Lỗi khi tạo batch transaction xuất kho: " . $e->getMessage());
            throw $e;
        }
    }
}
