<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Cost;
use App\Models\AdditionalCost;
use App\Models\Payroll;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class SummaryReportController extends Controller
{

    /**
     * Lấy báo cáo tổng
     */
    public function index(Request $request)
    {
        try {
            $period = $request->query('period', 'all');
            
            // Lấy vốn công ty
            $companyCapital = $this->getCompanyCapital();
            
            // Lấy lợi nhuận dự án
            $projectProfits = $this->getProjectProfits($period);
            
            // Lấy chi phí cố định
            $fixedCosts = $this->getFixedCosts($period);
            
            // Lấy chi phí lương
            $salaryCosts = $this->getSalaryCosts($period);
            
            // Tính tổng hợp
            $summary = $this->calculateSummary($projectProfits, $fixedCosts, $salaryCosts);
            
            // Dữ liệu cho biểu đồ
            $charts = $this->getChartsData($period);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'company_capital' => $companyCapital,
                    'project_profits' => $projectProfits,
                    'fixed_costs' => $fixedCosts,
                    'salary_costs' => $salaryCosts,
                    'summary' => $summary,
                    'charts' => $charts,
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('SummaryReportController error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi lấy báo cáo.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Lấy vốn công ty
     */
    protected function getCompanyCapital()
    {
        $setting = Setting::where('key', 'company_capital')->first();
        
        return [
            'amount' => $setting ? (float) $setting->value : 0,
            'currency' => 'VND'
        ];
    }

    /**
     * Lấy lợi nhuận dự án
     */
    protected function getProjectProfits($period)
    {
        $query = Project::with(['contract', 'payments', 'costs', 'additionalCosts']);
        
        // Filter theo period
        if ($period !== 'all') {
            $dateRange = $this->getDateRange($period);
            $query->whereBetween('created_at', $dateRange);
        }
        
        $projects = $query->get();
        
        $totalProfit = 0;
        $totalRevenue = 0;
        $totalCosts = 0;
        $projectList = [];
        
        foreach ($projects as $project) {
            // Revenue từ contract hoặc payments đã thanh toán
            $revenue = 0;
            if ($project->contract) {
                $revenue = (float) $project->contract->contract_value;
            } else {
                // Nếu không có contract, tính từ payments đã thanh toán
                $revenue = (float) $project->payments()->where('status', 'paid')->sum('amount');
            }
            
            // Costs: từ costs đã approved, additional costs đã approved, và subcontractor payments
            $costs = (float) $project->costs()->where('status', 'approved')->sum('amount');
            $additionalCosts = (float) $project->additionalCosts()
                ->where('status', 'approved')
                ->sum('amount');
            
            // Subcontractor costs (nếu có model ProjectSubcontractor)
            $subcontractorCosts = 0;
            if (class_exists(\App\Models\ProjectSubcontractor::class)) {
                $subcontractorCosts = (float) \App\Models\ProjectSubcontractor::where('project_id', $project->id)
                    ->sum('total_paid');
            }
            
            $totalProjectCosts = $costs + $additionalCosts + $subcontractorCosts;
            $profit = $revenue - $totalProjectCosts;
            
            $totalProfit += $profit;
            $totalRevenue += $revenue;
            $totalCosts += $totalProjectCosts;
            
            $projectList[] = [
                'id' => $project->id,
                'name' => $project->name,
                'code' => $project->code,
                'revenue' => $revenue,
                'total_costs' => $totalProjectCosts,
                'profit' => $profit,
                'profit_margin' => $revenue > 0 
                    ? round(($profit / $revenue) * 100, 2) 
                    : 0,
            ];
        }
        
        return [
            'total_profit' => round($totalProfit, 2),
            'total_revenue' => round($totalRevenue, 2),
            'total_costs' => round($totalCosts, 2),
            'project_count' => count($projects),
            'projects' => $projectList,
        ];
    }

    /**
     * Lấy chi phí cố định
     */
    protected function getFixedCosts($period)
    {
        $query = Cost::where('category', 'fixed_cost')
            ->where('status', 'approved');
        
        // Filter theo period
        if ($period !== 'all') {
            $dateRange = $this->getDateRange($period);
            $query->whereBetween('cost_date', $dateRange);
        }
        
        $total = $query->sum('amount');
        
        return [
            'total' => (float) $total,
            'currency' => 'VND'
        ];
    }

    /**
     * Lấy chi phí lương
     */
    protected function getSalaryCosts($period)
    {
        $query = Payroll::where('status', 'approved');
        
        // Filter theo period
        if ($period !== 'all') {
            $dateRange = $this->getDateRange($period);
            $query->whereBetween('period_start', $dateRange);
        }
        
        $payrolls = $query->get();
        
        $total = $payrolls->sum('net_salary');
        $monthlyBreakdown = [];
        
        // Group by month
        $grouped = $payrolls->groupBy(function ($payroll) {
            return Carbon::parse($payroll->period_start)->format('Y-m');
        });
        
        foreach ($grouped as $month => $items) {
            $monthlyBreakdown[] = [
                'period' => $month,
                'amount' => (float) $items->sum('net_salary')
            ];
        }
        
        return [
            'total' => (float) $total,
            'count' => $payrolls->count(),
            'currency' => 'VND',
            'monthly_breakdown' => $monthlyBreakdown,
        ];
    }

    /**
     * Tính tổng hợp
     */
    protected function calculateSummary($projectProfits, $fixedCosts, $salaryCosts)
    {
        $totalRevenue = $projectProfits['total_revenue'];
        $totalExpenses = $projectProfits['total_costs'] + $fixedCosts['total'] + $salaryCosts['total'];
        $totalProjectProfit = $projectProfits['total_profit'];
        $netProfit = $totalRevenue - $totalExpenses;
        $profitMargin = $totalRevenue > 0 ? ($netProfit / $totalRevenue) * 100 : 0;
        
        return [
            'total_revenue' => $totalRevenue,
            'total_expenses' => $totalExpenses,
            'total_project_profit' => $totalProjectProfit,
            'net_profit' => $netProfit,
            'profit_margin' => round($profitMargin, 2),
        ];
    }

    /**
     * Lấy dữ liệu cho biểu đồ
     */
    protected function getChartsData($period)
    {
        $monthlyData = [];
        
        // Lấy dữ liệu theo tháng
        $startDate = $this->getStartDate($period);
        $endDate = Carbon::now();
        
        $current = Carbon::parse($startDate);
        
        while ($current->lte($endDate)) {
            $month = $current->format('Y-m');
            $monthStart = $current->copy()->startOfMonth();
            $monthEnd = $current->copy()->endOfMonth();
            
            // Revenue từ projects
            $revenue = 0;
            $monthProjects = Project::with(['contract', 'payments'])
                ->whereBetween('created_at', [$monthStart, $monthEnd])
                ->get();
            
            foreach ($monthProjects as $project) {
                if ($project->contract) {
                    $revenue += (float) $project->contract->contract_value;
                } else {
                    $revenue += (float) $project->payments()->where('status', 'paid')->sum('amount');
                }
            }
            
            // Project costs
            $projectCosts = Cost::where('status', 'approved')
                ->whereBetween('cost_date', [$monthStart, $monthEnd])
                ->sum('amount');
            
            // Salary costs
            $salaryCosts = Payroll::where('status', 'approved')
                ->whereBetween('period_start', [$monthStart, $monthEnd])
                ->sum('net_salary');
            
            $totalCosts = $projectCosts + $salaryCosts;
            $profit = $revenue - $totalCosts;
            
            $monthlyData[] = [
                'period' => $month,
                'revenue' => (float) $revenue,
                'project_costs' => (float) $projectCosts,
                'salary_costs' => (float) $salaryCosts,
                'total_costs' => (float) $totalCosts,
                'profit' => (float) $profit,
            ];
            
            $current->addMonth();
        }
        
        return [
            'monthly' => $monthlyData
        ];
    }

    /**
     * Lấy date range theo period
     */
    protected function getDateRange($period)
    {
        $endDate = Carbon::now();
        
        switch ($period) {
            case 'month':
                $startDate = $endDate->copy()->startOfMonth();
                break;
            case 'quarter':
                $startDate = $endDate->copy()->startOfQuarter();
                break;
            case 'year':
                $startDate = $endDate->copy()->startOfYear();
                break;
            default:
                $startDate = Carbon::parse('2020-01-01'); // Từ đầu
                break;
        }
        
        return [$startDate, $endDate];
    }

    /**
     * Lấy start date theo period
     */
    protected function getStartDate($period)
    {
        switch ($period) {
            case 'month':
                return Carbon::now()->startOfMonth();
            case 'quarter':
                return Carbon::now()->startOfQuarter();
            case 'year':
                return Carbon::now()->startOfYear();
            default:
                return Carbon::parse('2020-01-01');
        }
    }

    /**
     * Cập nhật vốn công ty
     */
    public function updateCompanyCapital(Request $request)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0',
        ]);

        try {
            $setting = Setting::firstOrNew(['key' => 'company_capital']);
            $setting->value = $validated['amount'];
            $setting->save();

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật vốn công ty.',
                'data' => [
                    'amount' => (float) $validated['amount'],
                    'currency' => 'VND'
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Cập nhật chi phí cố định
     */
    public function updateFixedCosts(Request $request)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0',
        ]);

        try {
            // Lưu vào setting hoặc tạo cost record
            $setting = Setting::firstOrNew(['key' => 'fixed_costs_total']);
            $setting->value = $validated['amount'];
            $setting->save();

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật chi phí cố định.',
                'data' => [
                    'total' => (float) $validated['amount'],
                    'currency' => 'VND'
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
}

