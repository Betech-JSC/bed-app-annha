<?php

namespace App\Services;

use App\Models\Equipment;
use App\Models\EquipmentAllocation;
use App\Models\Cost;
use App\Models\CostGroup;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class EquipmentAllocationService
{
    /**
     * Tự động tạo Cost khi mua thiết bị (allocation_type = 'buy')
     * 
     * @param EquipmentAllocation $allocation
     * @return Cost|null
     */
    public function createCostFromPurchase(EquipmentAllocation $allocation): ?Cost
    {
        // Theo yêu cầu mới, thiết bị có sẵn (Owned/Buy) chỉ dùng để điều động nội bộ, 
        // không tự động tạo chi phí dự án như trước.
        return null;
    }

    public function createCostFromRental(EquipmentAllocation $allocation): ?Cost
    {
        // Chỉ xử lý nếu là thuê và chưa có cost_id
        if ($allocation->allocation_type !== 'rent' || $allocation->cost_id) {
            return null;
        }

        try {
            DB::beginTransaction();

            $equipment = $allocation->equipment;
            $project = $allocation->project;

            $totalFee = $allocation->rental_fee ?? 0;

            if ($totalFee <= 0) {
                Log::warning("EquipmentAllocation {$allocation->id} có phí thuê = 0, bỏ qua tạo Cost");
                DB::rollBack();
                return null;
            }

            // Tìm CostGroup cho thiết bị
            $costGroup = CostGroup::where('code', 'equipment')
                ->orWhere('name', 'like', '%thiết bị%')
                ->orWhere('name', 'like', '%equipment%')
                ->where('is_active', true)
                ->first();

            if (!$costGroup) {
                Log::warning("Không tìm thấy CostGroup cho thiết bị, bỏ qua tạo Cost");
                DB::rollBack();
                return null;
            }

            // Tạo Cost với equipment_allocation_id để liên kết chặt chẽ
            $cost = Cost::create([
                'project_id' => $project->id,
                'cost_group_id' => $costGroup->id,
                'equipment_allocation_id' => $allocation->id,
                'name' => "Thuê thiết bị: {$equipment->name}" . ($allocation->quantity > 1 ? " (x{$allocation->quantity})" : ""),
                'amount' => $totalFee,
                'description' => "Chi phí thuê thiết bị cho dự án" . ($allocation->notes ? ": {$allocation->notes}" : ""),
                'cost_date' => $allocation->start_date ?? now()->toDateString(),
                'status' => 'draft',
                'created_by' => $allocation->created_by,
            ]);

            // Cập nhật allocation với cost_id
            $allocation->update(['cost_id' => $cost->id]);

            DB::commit();

            Log::info("Đã tạo Cost {$cost->id} từ EquipmentAllocation {$allocation->id}");

            return $cost->load(['costGroup']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Lỗi khi tạo Cost từ EquipmentAllocation {$allocation->id}: " . $e->getMessage());
            return null;
        }
    }


    /**
     * Cập nhật Cost khi allocation thay đổi (thuê hoặc mua)
     * 
     * @param EquipmentAllocation $allocation
     * @return bool
     */
    public function updateCostFromAllocation(EquipmentAllocation $allocation): bool
    {
        if (!$allocation->cost_id) {
            return false;
        }

        try {
            $cost = Cost::find($allocation->cost_id);
            if (!$cost || $cost->status !== 'draft') {
                return false;
            }

            $equipment = $allocation->equipment;

            if ($allocation->allocation_type === 'rent') {
                $cost->update([
                    'amount' => $allocation->rental_fee ?? 0,
                    'name' => "Thuê thiết bị: {$equipment->name}" . ($allocation->quantity > 1 ? " (x{$allocation->quantity})" : ""),
                    'description' => "Chi phí thuê thiết bị cho dự án" . ($allocation->notes ? ": {$allocation->notes}" : ""),
                    'cost_date' => $allocation->start_date ?? now()->toDateString(),
                ]);
            } else {
                return false;
            }

            Log::info("Đã cập nhật Cost {$cost->id} từ EquipmentAllocation {$allocation->id}");

            return true;
        } catch (\Exception $e) {
            Log::error("Lỗi khi cập nhật Cost từ EquipmentAllocation {$allocation->id}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Cập nhật Cost khi allocation thay đổi (thuê) - backward compatible
     * 
     * @param EquipmentAllocation $allocation
     * @return bool
     */
    public function updateCostFromRental(EquipmentAllocation $allocation): bool
    {
        return $this->updateCostFromAllocation($allocation);
    }

    /**
     * Xóa Cost khi allocation bị xóa hoặc chuyển từ rent sang buy
     * 
     * @param EquipmentAllocation $allocation
     * @return bool
     */
    public function deleteCostFromRental(EquipmentAllocation $allocation): bool
    {
        if (!$allocation->cost_id) {
            return false;
        }

        try {
            $cost = Cost::find($allocation->cost_id);
            if ($cost && $cost->status === 'draft') {
                // Chỉ xóa nếu Cost ở trạng thái draft
                $cost->delete();
                Log::info("Đã xóa Cost {$cost->id} từ EquipmentAllocation {$allocation->id}");
                return true;
            }
            return false;
        } catch (\Exception $e) {
            Log::error("Lỗi khi xóa Cost từ EquipmentAllocation {$allocation->id}: " . $e->getMessage());
            return false;
        }
    }
}


