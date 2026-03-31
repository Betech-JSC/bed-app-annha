<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Cost;
use App\Models\AdditionalCost;
use App\Models\ProjectPayment;
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

        // Chi phí phát sinh (AdditionalCost đã được approved hoặc confirmed/paid)
        // Đây là phần doanh thu thêm từ khách hàng
        $additionalRevenue = (float) AdditionalCost::where('project_id', $project->id)
            ->whereIn('status', ['approved', 'confirmed', 'customer_paid'])
            ->sum('amount');

        // Tổng doanh thu = Hợp đồng + Phát sinh
        $totalRevenue = $contractValue + $additionalRevenue;

        // Tổng chi phí công trình (Tất cả chi phí gắn với dự án, trừ lương/payroll)
        $totalProjectCosts = $costDetails['material_costs']
            + $costDetails['equipment_rental_costs']
            + $costDetails['subcontractor_costs']
            + $costDetails['other_costs'];

        // Lương (chi phí công ty - KHÔNG tính vào giá thành dự án trực tiếp)
        $salaryCosts = $costDetails['salary_costs'];

        // Tổng tất cả chi phí (bao gồm cả lương để tham khảo)
        $totalAllCosts = $totalProjectCosts + $salaryCosts;

        // Đã thanh toán (ProjectPayment đã được paid hoặc confirmed hoặc customer_paid)
        $paidPayments = (float) ProjectPayment::where('project_id', $project->id)
            ->whereIn('status', ['paid', 'confirmed', 'customer_paid'])
            ->sum('amount');

        return [
            'project_id' => $project->id,
            'project_name' => $project->name,
            'project_code' => $project->code,
            'project_status' => $project->status,
            'contract_value' => $contractValue,
            'additional_costs' => $additionalRevenue, 
            'total_revenue' => $totalRevenue,
            'cost_details' => $costDetails,
            'total_project_costs' => $totalProjectCosts,
            'total_salary_costs' => $salaryCosts,
            'total_all_costs' => $totalAllCosts,
            'paid_payments' => $paidPayments,
            'profit' => $totalRevenue - $totalProjectCosts, // Lợi nhuận = Tổng doanh thu - Chi phí công trình
            'profit_margin' => $totalRevenue > 0 
                ? (($totalRevenue - $totalProjectCosts) / $totalRevenue) * 100 
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
        // Lấy tất cả chi phí đã duyệt của dự án
        $allApprovedCosts = Cost::where('project_id', $project->id)
            ->where('status', 'approved')
            ->get();

        $materialCosts = 0;
        $equipmentRentalCosts = 0;
        $subcontractorCosts = 0;
        $salaryCosts = 0;
        $otherCosts = 0;

        foreach ($allApprovedCosts as $cost) {
            if ($cost->material_id) {
                $materialCosts += (float) $cost->amount;
            } elseif ($cost->equipment_allocation_id) {
                $equipmentRentalCosts += (float) $cost->amount;
            } elseif ($cost->subcontractor_payment_id) {
                // CHỈ tính các khoản thực chi cho thầu phụ (có liên kết payment)
                $subcontractorCosts += (float) $cost->amount;
            } elseif ($cost->payroll_id) {
                $salaryCosts += (float) $cost->amount;
            } else {
                // Các chi phí khác (vận chuyển, tiếp khách, v.v. gắn với dự án)
                // Lưu ý: Nếu có subcontractor_id nhưng không có payment_id (do tính từ quote), nó sẽ vào đây
                $otherCosts += (float) $cost->amount;
            }
        }

        // Fallback cho Equipment Rental (backward compatible)
        if ($equipmentRentalCosts == 0) {
            $equipmentRentalCosts = (float) $project->equipmentAllocations()
                ->where('allocation_type', 'rent')
                ->whereNotNull('rental_fee')
                ->sum('rental_fee');
        }

        return [
            'material_costs' => $materialCosts,
            'equipment_rental_costs' => $equipmentRentalCosts,
            'subcontractor_costs' => $subcontractorCosts,
            'salary_costs' => $salaryCosts,
            'other_costs' => $otherCosts,
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
            ->with(['material', 'subcontractor']);

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
                $query->whereNotNull('subcontractor_payment_id')
                    ->with('subcontractor');
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

            }

            return $item;
        })->toArray();
    }
}

