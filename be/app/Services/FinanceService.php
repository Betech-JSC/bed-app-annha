<?php

namespace App\Services;

use App\Models\CashFlow;
use App\Models\Cost;
use App\Models\Project;
use App\Models\ProjectPayment;
use App\Models\WarrantyRetention;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class FinanceService
{
    /**
     * Dòng tiền dự án (planned vs actual) theo tháng
     */
    public function getCashFlow(int $projectId, ?string $fromDate = null, ?string $toDate = null): array
    {
        $project = Project::findOrFail($projectId);

        $from = $fromDate ? Carbon::parse($fromDate) : ($project->start_date ?: now()->subMonths(6));
        $to   = $toDate ? Carbon::parse($toDate) : ($project->end_date ?: now()->addMonths(6));

        // Lấy tất cả cash flow records
        $flows = CashFlow::where('project_id', $projectId)
            ->where(function ($q) use ($from, $to) {
                $q->whereBetween('planned_date', [$from, $to])
                    ->orWhereBetween('actual_date', [$from, $to]);
            })
            ->orderBy('planned_date')
            ->get();

        // Aggregate theo tháng
        $months = [];
        $cursor = $from->copy()->startOfMonth();
        while ($cursor->lte($to)) {
            $monthKey = $cursor->format('Y-m');
            $monthFlows = $flows->filter(function ($f) use ($monthKey) {
                $date = $f->actual_date ?: $f->planned_date;
                return $date instanceof \DateTimeInterface && $date->format('Y-m') === $monthKey;
            });

            $months[] = [
                'month'           => $monthKey,
                'label'           => $cursor->format('m/Y'),
                'planned_inflow'  => $flows->where('type', 'inflow')->filter(fn($f) => $f->planned_date instanceof \DateTimeInterface && $f->planned_date->format('Y-m') === $monthKey)->sum('amount'),
                'planned_outflow' => $flows->where('type', 'outflow')->filter(fn($f) => $f->planned_date instanceof \DateTimeInterface && $f->planned_date->format('Y-m') === $monthKey)->sum('amount'),
                'actual_inflow'   => $flows->where('type', 'inflow')->filter(fn($f) => $f->actual_date instanceof \DateTimeInterface && $f->actual_date->format('Y-m') === $monthKey)->sum('amount'),
                'actual_outflow'  => $flows->where('type', 'outflow')->filter(fn($f) => $f->actual_date instanceof \DateTimeInterface && $f->actual_date->format('Y-m') === $monthKey)->sum('amount'),
            ];
            $cursor->addMonth();
        }

        // Tính cumulative
        $cumPlannedIn = $cumPlannedOut = $cumActualIn = $cumActualOut = 0;
        foreach ($months as &$m) {
            $cumPlannedIn  += $m['planned_inflow'];
            $cumPlannedOut += $m['planned_outflow'];
            $cumActualIn   += $m['actual_inflow'];
            $cumActualOut  += $m['actual_outflow'];

            $m['cumulative_planned_net'] = $cumPlannedIn - $cumPlannedOut;
            $m['cumulative_actual_net']  = $cumActualIn - $cumActualOut;
        }

        $totals = [
            'total_inflow'  => $flows->where('type', 'inflow')->sum('amount'),
            'total_outflow' => $flows->where('type', 'outflow')->sum('amount'),
            'net_cash_flow' => $flows->where('type', 'inflow')->sum('amount') - $flows->where('type', 'outflow')->sum('amount'),
        ];

        return [
            'months' => $months,
            'totals' => $totals,
            'period' => ['from' => $from->format('Y-m-d'), 'to' => $to->format('Y-m-d')],
        ];
    }

    /**
     * Profit & Loss statement cho dự án
     */
    public function getProfitLoss(int $projectId): array
    {
        $project = Project::with(['contract', 'payments', 'costs', 'subcontractors'])->findOrFail($projectId);

        // REVENUE (Thu nhập)
        $contractValue   = (float) ($project->contract->contract_value ?? 0);
        $additionalValue = $project->additionalCosts()
            ->where('status', 'approved')
            ->sum('amount');
        $totalRevenue = $contractValue + (float) $additionalValue;

        // Payments received
        $paymentsReceived = $project->payments()
            ->whereIn('status', ['paid', 'confirmed'])
            ->sum('amount');

        // COSTS (Chi phí) — grouped by category
        $approvedCosts = Cost::where('project_id', $projectId)
            ->where('status', 'approved')
            ->get();

        $costByCategory = [
            'material'      => $approvedCosts->where('category', 'construction_materials')->sum('amount')
                + $approvedCosts->where('category', 'concrete')->sum('amount'),
            'labor'         => $approvedCosts->where('category', 'labor')->sum('amount'),
            'equipment'     => $approvedCosts->where('category', 'equipment')->sum('amount'),
            'subcontractor' => $approvedCosts->whereNotNull('subcontractor_payment_id')->sum('amount'),
            'transportation' => $approvedCosts->where('category', 'transportation')->sum('amount'),
            'other'         => $approvedCosts->where('category', 'other')->whereNull('subcontractor_id')->sum('amount'),
        ];

        $totalCosts = array_sum($costByCategory);

        // TAX
        $totalTax = $approvedCosts->sum('tax_amount');

        // WARRANTY
        $warrantyCosts = $approvedCosts->where('is_warranty_cost', true)->sum('amount');

        // SUBCONTRACTOR PAYMENTS
        $subPayments = 0;
        foreach ($project->subcontractors as $sub) {
            $subPayments += $sub->payments()->where('status', 'approved')->sum('amount');
        }

        // P/L
        $grossProfit  = $totalRevenue - $totalCosts;
        $grossMargin  = $totalRevenue > 0 ? round(($grossProfit / $totalRevenue) * 100, 2) : 0;
        $netProfit    = $grossProfit - $totalTax;
        $netMargin    = $totalRevenue > 0 ? round(($netProfit / $totalRevenue) * 100, 2) : 0;

        return [
            'revenue' => [
                'contract_value'    => $contractValue,
                'additional_value'  => (float) $additionalValue,
                'total_revenue'     => $totalRevenue,
                'payments_received' => (float) $paymentsReceived,
                'receivable'        => $totalRevenue - (float) $paymentsReceived,
            ],
            'costs' => [
                'by_category'  => $costByCategory,
                'total_costs'  => $totalCosts,
                'tax'          => (float) $totalTax,
                'warranty'     => (float) $warrantyCosts,
                'subcontractor_payments' => $subPayments,
            ],
            'profit_loss' => [
                'gross_profit'  => $grossProfit,
                'gross_margin'  => $grossMargin,
                'net_profit'    => $netProfit,
                'net_margin'    => $netMargin,
            ],
            'project_name' => $project->name,
            'project_code' => $project->code,
        ];
    }

    /**
     * So sánh Ngân sách vs Thực chi
     */
    public function getBudgetVsActual(int $projectId): array
    {
        $project = Project::with(['budgets.items'])->findOrFail($projectId);
        $latestBudget = $project->budgets()->latest()->first();

        if (!$latestBudget) {
            return ['budget' => null, 'items' => [], 'summary' => ['total_budget' => 0, 'total_actual' => 0, 'variance' => 0]];
        }

        $items = [];
        foreach ($latestBudget->items as $item) {
            $budgetAmt = (float) $item->estimated_amount;
            $actualAmt = (float) $item->actual_amount;
            $variance  = $budgetAmt - $actualAmt;
            $variancePct = $budgetAmt > 0 ? round(($variance / $budgetAmt) * 100, 2) : 0;

            $items[] = [
                'id'                => $item->id,
                'name'              => $item->name,
                'cost_group'        => $item->cost_group,
                'budget_amount'     => $budgetAmt,
                'actual_amount'     => $actualAmt,
                'variance'          => $variance,
                'variance_pct'      => $variancePct,
                'status'            => $variance >= 0 ? 'under_budget' : 'over_budget',
            ];
        }

        $totalBudget = collect($items)->sum('budget_amount');
        $totalActual = collect($items)->sum('actual_amount');

        return [
            'budget'  => [
                'id'      => $latestBudget->id,
                'name'    => $latestBudget->name ?? 'Ngân sách chính',
                'version' => $latestBudget->version ?? 1,
            ],
            'items'   => $items,
            'summary' => [
                'total_budget'  => $totalBudget,
                'total_actual'  => $totalActual,
                'variance'      => $totalBudget - $totalActual,
                'variance_pct'  => $totalBudget > 0 ? round((($totalBudget - $totalActual) / $totalBudget) * 100, 2) : 0,
            ],
        ];
    }

    /**
     * Công nợ nhà thầu phụ
     */
    public function getSubcontractorDebt(int $projectId): array
    {
        $project = Project::with(['subcontractors.payments'])->findOrFail($projectId);
        $debts = [];

        foreach ($project->subcontractors as $sub) {
            $totalQuote = (float) ($sub->total_quote ?? 0);
            $totalPaid  = (float) ($sub->total_paid ?? 0);
            $remaining  = $totalQuote - $totalPaid;

            $debts[] = [
                'id'             => $sub->id,
                'name'           => $sub->name,
                'scope'          => $sub->scope_of_work,
                'total_quote'    => $totalQuote,
                'total_paid'     => $totalPaid,
                'remaining'      => $remaining,
                'payment_status' => $sub->payment_status,
                'progress_status' => $sub->progress_status,
                'paid_pct'       => $totalQuote > 0 ? round(($totalPaid / $totalQuote) * 100, 2) : 0,
            ];
        }

        return [
            'subcontractors' => $debts,
            'summary' => [
                'total_contract' => collect($debts)->sum('total_quote'),
                'total_paid'     => collect($debts)->sum('total_paid'),
                'total_remaining' => collect($debts)->sum('remaining'),
            ],
        ];
    }

    /**
     * Tổng hợp thuế
     */
    public function getTaxSummary(int $projectId): array
    {
        $costs = Cost::where('project_id', $projectId)
            ->where('status', 'approved')
            ->where('tax_amount', '>', 0)
            ->get();

        $byType = $costs->groupBy('tax_type')->map(function ($group, $type) {
            return [
                'type'        => $type,
                'total_tax'   => $group->sum('tax_amount'),
                'total_base'  => $group->sum('amount'),
                'count'       => $group->count(),
            ];
        })->values()->toArray();

        return [
            'by_type'   => $byType,
            'total_tax' => $costs->sum('tax_amount'),
        ];
    }

    /**
     * Warranty retentions
     */
    public function getWarrantyRetentions(int $projectId): array
    {
        $retentions = WarrantyRetention::where('project_id', $projectId)
            ->with(['subcontractor', 'releasedByUser'])
            ->get();

        return [
            'retentions' => $retentions,
            'summary' => [
                'total_retention' => $retentions->sum('retention_amount'),
                'total_released'  => $retentions->sum('released_amount'),
                'total_holding'   => $retentions->where('release_status', 'holding')->sum('retention_amount'),
                'expired_count'   => $retentions->filter(fn($r) => $r->is_expired)->count(),
            ],
        ];
    }
}
