<?php

namespace App\Services;

use App\Models\Cost;
use App\Models\Material;
use App\Models\MaterialTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MaterialInventoryService
{
    /**
     * Tự động tạo MaterialTransaction khi Cost (vật liệu) được approved
     * 
     * @param Cost $cost
     * @return MaterialTransaction|null
     */
    public function createTransactionFromCost(Cost $cost): ?MaterialTransaction
    {
        // Chỉ xử lý nếu Cost có material_id và status là approved
        if (!$cost->material_id || $cost->status !== 'approved') {
            return null;
        }

        // Kiểm tra xem đã có transaction chưa (tránh duplicate)
        if ($cost->materialTransaction) {
            Log::info("Cost {$cost->id} đã có MaterialTransaction, bỏ qua");
            return $cost->materialTransaction;
        }

        try {
            DB::beginTransaction();

            $material = Material::find($cost->material_id);
            if (!$material) {
                Log::warning("Material {$cost->material_id} không tồn tại cho Cost {$cost->id}");
                DB::rollBack();
                return null;
            }

            // Tính toán unit_price từ amount và quantity
            $unitPrice = $cost->quantity > 0 
                ? $cost->amount / $cost->quantity 
                : $cost->amount;

            // Tạo transaction type "in" (nhập kho) khi Cost được approved
            $transaction = MaterialTransaction::create([
                'material_id' => $cost->material_id,
                'project_id' => $cost->project_id,
                'cost_id' => $cost->id,
                'type' => 'in', // Nhập kho
                'quantity' => $cost->quantity ?? 1,
                'unit_price' => $unitPrice,
                'total_amount' => $cost->amount,
                'supplier_id' => null, // Có thể lấy từ Cost nếu cần
                'transaction_date' => $cost->cost_date,
                'notes' => "Tự động tạo từ chi phí: {$cost->name}",
                'status' => 'approved', // Tự động approved vì Cost đã approved
                'created_by' => $cost->created_by,
                'approved_by' => $cost->accountant_approved_by ?? $cost->management_approved_by,
                'approved_at' => $cost->accountant_approved_at ?? $cost->management_approved_at ?? now(),
            ]);

            DB::commit();

            Log::info("Đã tạo MaterialTransaction {$transaction->id} từ Cost {$cost->id}");

            return $transaction->load(['material', 'project', 'cost']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Lỗi khi tạo MaterialTransaction từ Cost {$cost->id}: " . $e->getMessage());
            return null;
        }
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
            $transaction = $cost->materialTransaction;
            if ($transaction) {
                $transaction->delete();
                Log::info("Đã xóa MaterialTransaction {$transaction->id} từ Cost {$cost->id}");
                return true;
            }
            return false;
        } catch (\Exception $e) {
            Log::error("Lỗi khi xóa MaterialTransaction từ Cost {$cost->id}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Tạo transaction xuất kho cho dự án
     * 
     * @param int $materialId
     * @param int $projectId
     * @param float $quantity
     * @param string $notes
     * @param int $createdBy
     * @return MaterialTransaction|null
     */
    public function createOutTransaction(
        int $materialId,
        int $projectId,
        float $quantity,
        string $notes = '',
        int $createdBy
    ): ?MaterialTransaction {
        try {
            $material = Material::findOrFail($materialId);
            
            // Kiểm tra tồn kho
            $currentStock = $material->current_stock;
            if ($currentStock < $quantity) {
                throw new \Exception("Không đủ tồn kho. Tồn kho hiện tại: {$currentStock}, yêu cầu: {$quantity}");
            }

            DB::beginTransaction();

            // Lấy unit_price từ material hoặc từ transaction nhập gần nhất
            $lastInTransaction = MaterialTransaction::where('material_id', $materialId)
                ->where('type', 'in')
                ->where('status', 'approved')
                ->orderBy('transaction_date', 'desc')
                ->first();

            $unitPrice = $lastInTransaction?->unit_price ?? $material->unit_price ?? 0;
            $totalAmount = $quantity * $unitPrice;

            $transaction = MaterialTransaction::create([
                'material_id' => $materialId,
                'project_id' => $projectId,
                'cost_id' => null, // Xuất kho không liên kết với Cost
                'type' => 'out', // Xuất kho
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'total_amount' => $totalAmount,
                'transaction_date' => now()->toDateString(),
                'notes' => $notes ?: "Xuất kho cho dự án",
                'status' => 'approved',
                'created_by' => $createdBy,
                'approved_by' => $createdBy,
                'approved_at' => now(),
            ]);

            DB::commit();

            Log::info("Đã tạo transaction xuất kho {$transaction->id} cho Material {$materialId}");

            return $transaction->load(['material', 'project']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Lỗi khi tạo transaction xuất kho: " . $e->getMessage());
            throw $e;
        }
    }
}




