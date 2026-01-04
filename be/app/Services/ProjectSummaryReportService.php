<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Cost;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ProjectSummaryReportService
{
    /**
     * Tính toán báo cáo tổng hợp dự án
     * 
     * @param Project $project
     * @return array
     */
    public function getProjectSummaryReport(Project $project): array
    {
        // Giá trị hợp đồng (chỉ hiển thị 1 lần)
        $contractValue = (float) ($project->contract?->contract_value ?? 0);

        // Tính các loại chi phí
        $costDetails = $this->calculateCostDetails($project);

        // Tổng chi phí công trình (KHÔNG bao gồm lương)
        $totalProjectCosts = $costDetails['material_costs']
            + $costDetails['equipment_rental_costs']
            + $costDetails['subcontractor_costs']
            + $costDetails['labor_contract_costs']; // Nhân công khoán

        // Lương (chi phí công ty - KHÔNG tính vào dự án)
        $salaryCosts = $costDetails['salary_costs'];

        // Tổng tất cả chi phí (bao gồm cả lương để tham khảo)
        $totalAllCosts = $totalProjectCosts + $salaryCosts;

        return [
            'project_id' => $project->id,
            'project_name' => $project->name,
            'project_code' => $project->code,
            'contract_value' => $contractValue,
            'cost_details' => $costDetails,
            'total_project_costs' => $totalProjectCosts, // Chi phí công trình
            'total_salary_costs' => $salaryCosts, // Chi phí công ty (lương)
            'total_all_costs' => $totalAllCosts, // Tổng tất cả (tham khảo)
            'profit' => $contractValue - $totalProjectCosts, // Lợi nhuận = Hợp đồng - Chi phí công trình
            'profit_margin' => $contractValue > 0 
                ? (($contractValue - $totalProjectCosts) / $contractValue) * 100 
                : 0,
        ];
    }

    /**
     * Tính chi tiết các loại chi phí
     * 
     * @param Project $project
     * @return array
     */
    private function calculateCostDetails(Project $project): array
    {
        // 1. Chi phí vật liệu (Cost có material_id)
        $materialCosts = (float) Cost::where('project_id', $project->id)
            ->whereNotNull('material_id')
            ->where('status', 'approved')
            ->sum('amount');

        // 2. Chi phí thuê thiết bị (Cost có equipment_allocation_id)
        // Query trực tiếp từ Cost với equipment_allocation_id để liên kết chặt chẽ
        $equipmentRentalCosts = (float) Cost::where('project_id', $project->id)
            ->whereNotNull('equipment_allocation_id')
            ->where('status', 'approved')
            ->sum('amount');

        // Fallback: Nếu không có Cost, tính từ EquipmentAllocation trực tiếp (backward compatible)
        if ($equipmentRentalCosts == 0) {
            $equipmentRentalCosts = (float) $project->equipmentAllocations()
                ->where('allocation_type', 'rent')
                ->whereNotNull('rental_fee')
                ->sum('rental_fee');
        }

        // 3. Chi phí thầu phụ (Cost có subcontractor_id)
        $subcontractorCosts = (float) Cost::where('project_id', $project->id)
            ->whereNotNull('subcontractor_id')
            ->where('status', 'approved')
            ->sum('amount');

        // 4. Nhân công khoán = Chi phí công trình (Cost từ TimeTracking)
        $laborContractCosts = (float) Cost::where('project_id', $project->id)
            ->whereNotNull('time_tracking_id')
            ->where('status', 'approved')
            ->sum('amount');

        // 5. Lương = Chi phí công ty (KHÔNG tính vào dự án)
        // Lấy từ Payroll (nếu chưa tạo Cost) hoặc từ Cost có payroll_id
        $payrollCostsFromCosts = (float) Cost::where('project_id', $project->id)
            ->whereNotNull('payroll_id')
            ->where('status', 'approved')
            ->sum('amount');

        $payrollCostsFromPayroll = (float) $project->payrolls()
            ->where('status', 'approved')
            ->sum('net_salary');

        // Ưu tiên Cost nếu có, nếu không thì dùng Payroll
        $salaryCosts = $payrollCostsFromCosts > 0 
            ? $payrollCostsFromCosts 
            : $payrollCostsFromPayroll;

        return [
            'material_costs' => $materialCosts,
            'equipment_rental_costs' => $equipmentRentalCosts,
            'subcontractor_costs' => $subcontractorCosts,
            'labor_contract_costs' => $laborContractCosts,
            'salary_costs' => $salaryCosts, // Lương - KHÔNG tính vào dự án
        ];
    }

    /**
     * Lấy danh sách chi tiết chi phí theo loại
     * 
     * @param Project $project
     * @param string $type material|equipment|subcontractor|labor
     * @return array
     */
    public function getCostDetailsByType(Project $project, string $type): array
    {
        $query = Cost::where('project_id', $project->id)
            ->where('status', 'approved')
            ->with(['material', 'subcontractor', 'timeTracking']);

        switch ($type) {
            case 'material':
                $query->whereNotNull('material_id')
                    ->with('material');
                break;
            case 'equipment':
                // Query trực tiếp từ Cost có equipment_allocation_id
                $query->whereNotNull('equipment_allocation_id')
                    ->with(['equipmentAllocation' => function ($q) {
                        $q->with('equipment');
                    }]);
                break;
            case 'subcontractor':
                $query->whereNotNull('subcontractor_id')
                    ->with('subcontractor');
                break;
            case 'labor':
                $query->whereNotNull('time_tracking_id')
                    ->with('timeTracking.user');
                break;
            default:
                return [];
        }

        $costs = $query->orderBy('cost_date', 'desc')->get();

        return $costs->map(function ($cost) use ($type) {
            $item = [
                'id' => $cost->id,
                'name' => $cost->name,
                'amount' => (float) $cost->amount,
                'cost_date' => $cost->cost_date?->format('Y-m-d'),
                'description' => $cost->description,
            ];

            switch ($type) {
                case 'material':
                    $item['material'] = $cost->material ? [
                        'id' => $cost->material->id,
                        'name' => $cost->material->name,
                        'quantity' => (float) $cost->quantity,
                        'unit' => $cost->unit,
                    ] : null;
                    break;
                case 'equipment':
                    // Lấy EquipmentAllocation từ equipment_allocation_id (liên kết chặt chẽ)
                    $equipmentAllocation = $cost->equipmentAllocation;
                    
                    $item['equipment'] = $equipmentAllocation?->equipment ? [
                        'id' => $equipmentAllocation->equipment->id,
                        'name' => $equipmentAllocation->equipment->name,
                        'quantity' => $equipmentAllocation->quantity,
                        'rental_fee' => (float) $equipmentAllocation->rental_fee,
                    ] : null;
                    break;
                case 'subcontractor':
                    $item['subcontractor'] = $cost->subcontractor ? [
                        'id' => $cost->subcontractor->id,
                        'name' => $cost->subcontractor->name,
                    ] : null;
                    break;
                case 'labor':
                    $item['time_tracking'] = $cost->timeTracking ? [
                        'id' => $cost->timeTracking->id,
                        'user' => $cost->timeTracking->user ? [
                            'id' => $cost->timeTracking->user->id,
                            'name' => $cost->timeTracking->user->name,
                        ] : null,
                        'check_in_at' => $cost->timeTracking->check_in_at?->format('Y-m-d H:i'),
                    ] : null;
                    break;
            }

            return $item;
        })->toArray();
    }
}

