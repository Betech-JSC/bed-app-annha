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
     * Tự động tạo Cost khi thuê thiết bị (allocation_type = 'rent')
     * 
     * @param EquipmentAllocation $allocation
     * @return Cost|null
     */
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

            // Tính số ngày thuê
            $billingStart = $allocation->billing_start_date ?? $allocation->start_date;
            $billingEnd = $allocation->billing_end_date ?? $allocation->end_date ?? now()->toDateString();
            
            $startDate = Carbon::parse($billingStart);
            $endDate = Carbon::parse($billingEnd);
            $days = max(1, $startDate->diffInDays($endDate) + 1); // Ít nhất 1 ngày

            // Tính phí thuê
            $dailyRate = $allocation->daily_rate ?? $equipment->rental_rate_per_day ?? 0;
            $totalFee = $allocation->rental_fee ?? ($dailyRate * $days * $allocation->quantity);

            if ($totalFee <= 0) {
                Log::warning("EquipmentAllocation {$allocation->id} có phí thuê = 0, bỏ qua tạo Cost");
                DB::rollBack();
                return null;
            }

            // Tìm CostGroup cho thiết bị (tìm theo code hoặc name)
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
                'equipment_allocation_id' => $allocation->id, // Liên kết với EquipmentAllocation
                'name' => "Thuê thiết bị: {$equipment->name}" . ($allocation->quantity > 1 ? " (x{$allocation->quantity})" : ""),
                'amount' => $totalFee,
                'description' => "Thuê thiết bị từ {$billingStart} đến {$billingEnd} ({$days} ngày)",
                'cost_date' => $billingStart,
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
     * Tính phí thuê dựa trên số ngày và daily rate
     * 
     * @param EquipmentAllocation $allocation
     * @return float
     */
    public function calculateRentalFee(EquipmentAllocation $allocation): float
    {
        if ($allocation->allocation_type !== 'rent') {
            return 0;
        }

        // Nếu đã có rental_fee, dùng giá trị đó
        if ($allocation->rental_fee && $allocation->rental_fee > 0) {
            return (float) $allocation->rental_fee;
        }

        // Tính từ daily_rate và số ngày
        $billingStart = $allocation->billing_start_date ?? $allocation->start_date;
        $billingEnd = $allocation->billing_end_date ?? $allocation->end_date ?? now()->toDateString();
        
        $startDate = Carbon::parse($billingStart);
        $endDate = Carbon::parse($billingEnd);
        $days = max(1, $startDate->diffInDays($endDate) + 1);

        $dailyRate = $allocation->daily_rate ?? $allocation->equipment->rental_rate_per_day ?? 0;
        $quantity = $allocation->quantity ?? 1;

        return (float) ($dailyRate * $days * $quantity);
    }

    /**
     * Cập nhật Cost khi allocation thay đổi (thuê)
     * 
     * @param EquipmentAllocation $allocation
     * @return bool
     */
    public function updateCostFromRental(EquipmentAllocation $allocation): bool
    {
        if ($allocation->allocation_type !== 'rent' || !$allocation->cost_id) {
            return false;
        }

        try {
            $cost = Cost::find($allocation->cost_id);
            if (!$cost || $cost->status !== 'draft') {
                // Chỉ cập nhật nếu Cost ở trạng thái draft
                return false;
            }

            $equipment = $allocation->equipment;
            $totalFee = $this->calculateRentalFee($allocation);

            $billingStart = $allocation->billing_start_date ?? $allocation->start_date;
            $billingEnd = $allocation->billing_end_date ?? $allocation->end_date ?? now()->toDateString();
            $startDate = Carbon::parse($billingStart);
            $endDate = Carbon::parse($billingEnd);
            $days = max(1, $startDate->diffInDays($endDate) + 1);

            $cost->update([
                'amount' => $totalFee,
                'name' => "Thuê thiết bị: {$equipment->name}" . ($allocation->quantity > 1 ? " (x{$allocation->quantity})" : ""),
                'description' => "Thuê thiết bị từ {$billingStart} đến {$billingEnd} ({$days} ngày)",
                'cost_date' => $billingStart,
            ]);

            Log::info("Đã cập nhật Cost {$cost->id} từ EquipmentAllocation {$allocation->id}");

            return true;
        } catch (\Exception $e) {
            Log::error("Lỗi khi cập nhật Cost từ EquipmentAllocation {$allocation->id}: " . $e->getMessage());
            return false;
        }
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


