<?php

namespace App\Services;

use App\Models\CostGroup;
use Illuminate\Support\Facades\Log;

class CostGroupAutoDetectService
{
    /**
     * Tự động xác định cost_group_id dựa trên nguồn phát sinh chi phí
     * 
     * @param array $costData Dữ liệu cost (có thể chứa material_id, subcontractor_id, payroll_id, equipment_allocation_id)
     * @return int|null
     */
    public function detectCostGroup(array $costData): ?int
    {
        // Nếu đã có cost_group_id, giữ nguyên
        if (!empty($costData['cost_group_id'])) {
            return $costData['cost_group_id'];
        }

        // Ưu tiên theo thứ tự: material > subcontractor > labor > equipment > other
        
        // 1. Vật liệu (Material)
        if (!empty($costData['material_id'])) {
            return $this->findCostGroupByCode('material');
        }

        // 2. Nhà thầu phụ (Subcontractor)
        if (!empty($costData['subcontractor_id'])) {
            return $this->findCostGroupByCode('subcontractor');
        }

        // 3. Nhân công (Labor - TimeTracking hoặc Payroll)
        if (!empty($costData['payroll_id'])) {
            return $this->findCostGroupByCode('labor');
        }

        // 4. Thiết bị (Equipment)
        if (!empty($costData['equipment_allocation_id'])) {
            return $this->findCostGroupByCode('equipment');
        }

        // 5. Chi phí khác (Other) - không có cost_group_id
        return null;
    }

    /**
     * Tìm CostGroup theo code hoặc tên
     * 
     * @param string $code Code của cost group (material, subcontractor, labor, equipment, other)
     * @return int|null
     */
    protected function findCostGroupByCode(string $code): ?int
    {
        $patterns = $this->getNamePatterns($code);
        
        // 1. Tìm theo các code có thể có
        if (!empty($patterns['codes'])) {
            $costGroup = CostGroup::whereIn('code', $patterns['codes'])
                ->where('is_active', true)
                ->first();

            if ($costGroup) {
                return $costGroup->id;
            }
        }

        // 2. Tìm theo tên (fallback)
        if (!empty($patterns['names'])) {
            foreach ($patterns['names'] as $namePattern) {
                $costGroup = CostGroup::where('name', 'LIKE', "%{$namePattern}%")
                    ->where('is_active', true)
                    ->first();
                
                if ($costGroup) {
                    return $costGroup->id;
                }
            }
        }

        // 3. Nếu vẫn không tìm thấy, log warning và trả về null
        Log::warning("Không tìm thấy CostGroup với code: {$code}", [
            'code' => $code,
            'searched_codes' => $patterns['codes'] ?? [],
            'searched_names' => $patterns['names'] ?? [],
            'available_groups' => CostGroup::where('is_active', true)->pluck('code', 'name')->toArray()
        ]);

        return null;
    }

    /**
     * Lấy danh sách pattern tên và code cho từng loại
     * 
     * @param string $code
     * @return array
     */
    protected function getNamePatterns(string $code): array
    {
        $patterns = [
            'material' => [
                'codes' => ['material', 'VLXD', 'VL'],
                'names' => ['Vật liệu', 'Material', 'Nguyên vật liệu', 'Vật liệu xây dựng']
            ],
            'subcontractor' => [
                'codes' => ['subcontractor', 'NTP', 'NT'],
                'names' => ['Nhà thầu phụ', 'Thầu phụ', 'Subcontractor', 'Nhà thầu']
            ],
            'labor' => [
                'codes' => ['labor', 'NC', 'LC'],
                'names' => ['Nhân công', 'Nhân sự', 'Labor', 'Lao động']
            ],
            'equipment' => [
                'codes' => ['equipment', 'TBMM', 'TB'],
                'names' => ['Thiết bị', 'Equipment', 'Máy móc', 'Thiết bị máy móc']
            ],
            'other' => [
                'codes' => ['other', 'CPK', 'CP'],
                'names' => ['Khác', 'Other', 'Chi phí khác']
            ],
        ];

        return $patterns[$code] ?? ['codes' => [], 'names' => []];
    }

    /**
     * Xác định category dựa trên cost_group_id hoặc nguồn phát sinh
     * 
     * @param array $costData
     * @return string
     */
    public function detectCategory(array $costData): string
    {
        // Nếu đã có category, giữ nguyên
        if (!empty($costData['category'])) {
            return $costData['category'];
        }

        // Xác định category dựa trên nguồn phát sinh
        if (!empty($costData['material_id'])) {
            return 'material';
        }

        if (!empty($costData['subcontractor_id'])) {
            return 'subcontractor';
        }

        if (!empty($costData['payroll_id'])) {
            return 'labor';
        }

        if (!empty($costData['equipment_allocation_id'])) {
            return 'equipment';
        }

        // Chi phí khác
        return 'other';
    }
}
