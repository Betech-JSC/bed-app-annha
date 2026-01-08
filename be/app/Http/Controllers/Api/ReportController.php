<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ConstructionLog;
use App\Models\SubcontractorProgress;
use App\Models\MaterialTransaction;
use App\Models\Cost;
use App\Models\ProjectPayment;
use App\Models\SubcontractorPayment;
use App\Models\SupplierAcceptance;
use App\Models\SubcontractorAcceptance;
use App\Services\FinancialCalculationService;
use App\Services\TaskProgressService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportController extends Controller
{
    protected $financialCalculationService;

    public function __construct(FinancialCalculationService $financialCalculationService)
    {
        $this->financialCalculationService = $financialCalculationService;
    }

    /**
     * Progress Report - Column-based overview with horizontal scrolling
     * 
     * Returns progress data organized by columns (phases/tasks) for reporting
     */
    public function progressReport(Request $request, string $projectId)
    {
        $user = auth()->user();

        if (!$user->hasPermission('reports.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem báo cáo.'
            ], 403);
        }

        $project = Project::findOrFail($projectId);
        $taskProgressService = app(TaskProgressService::class);

        // Get all tasks with hierarchy
        $tasks = ProjectTask::where('project_id', $projectId)
            ->whereNull('deleted_at')
            ->with(['parent', 'children'])
            ->orderBy('order')
            ->get();

        // Build column structure (by parent tasks - parent tasks act as "phases")
        $rootTasks = $tasks->whereNull('parent_id');
        
        $columns = [];
        foreach ($rootTasks as $parentTask) {
            $columnTasks = [];
            $columnTasks[] = $this->buildTaskColumnData($parentTask, $tasks, $taskProgressService);
            
            // Get children of this parent task
            $childTasks = $tasks->where('parent_id', $parentTask->id);
            foreach ($childTasks as $childTask) {
                $columnTasks[] = $this->buildTaskColumnData($childTask, $tasks, $taskProgressService);
            }

            $columns[] = [
                'parent_task' => [
                    'id' => $parentTask->id,
                    'name' => $parentTask->name,
                    'order' => $parentTask->order,
                ],
                'tasks' => $columnTasks,
            ];
        }

        // Overall statistics
        $overallProgress = 0;
        $rootTasks = $tasks->whereNull('parent_id');
        if ($rootTasks->isNotEmpty()) {
            $totalProgress = 0;
            $count = 0;
            foreach ($rootTasks as $task) {
                $totalProgress += (float) ($task->progress_percentage ?? 0);
                $count++;
            }
            $overallProgress = $count > 0 ? round($totalProgress / $count, 2) : 0;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'code' => $project->code,
                ],
                'overall_progress' => $overallProgress,
                'columns' => $columns,
                'statistics' => [
                    'total_tasks' => $tasks->count(),
                    'tasks_by_status' => [
                        'not_started' => $tasks->where('status', 'not_started')->count(),
                        'in_progress' => $tasks->where('status', 'in_progress')->count(),
                        'delayed' => $tasks->where('status', 'delayed')->count(),
                        'completed' => $tasks->where('status', 'completed')->count(),
                    ],
                ],
            ],
        ]);
    }

    /**
     * Build task column data recursively
     */
    private function buildTaskColumnData(ProjectTask $task, $allTasks, TaskProgressService $service): array
    {
        $children = $allTasks->where('parent_id', $task->id);
        $childData = [];
        
        foreach ($children as $child) {
            $childData[] = $this->buildTaskColumnData($child, $allTasks, $service);
        }

        return [
            'id' => $task->id,
            'name' => $task->name,
            'start_date' => $task->start_date?->toDateString(),
            'end_date' => $task->end_date?->toDateString(),
            'progress_percentage' => (float) ($task->progress_percentage ?? 0),
            'status' => $task->status,
            'priority' => $task->priority,
            'has_children' => $children->isNotEmpty(),
            'children' => $childData,
        ];
    }

    /**
     * Báo cáo tiến độ thi công
     */
    public function constructionProgress(Request $request, string $projectId)
    {
        $user = auth()->user();

        if (!$user->hasPermission('reports.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem báo cáo.'
            ], 403);
        }

        $project = Project::findOrFail($projectId);
        $fromDate = $request->query('from_date', now()->subDays(30)->toDateString());
        $toDate = $request->query('to_date', now()->toDateString());

        // Tiến độ từ nhật ký thi công
        $constructionLogs = ConstructionLog::where('project_id', $projectId)
            ->whereBetween('log_date', [$fromDate, $toDate])
            ->orderBy('log_date', 'desc')
            ->get();

        // Tiến độ từ thầu phụ
        $subcontractorProgress = SubcontractorProgress::where('project_id', $projectId)
            ->whereBetween('progress_date', [$fromDate, $toDate])
            ->with(['subcontractor', 'reporter'])
            ->orderBy('progress_date', 'desc')
            ->get();

        // BUSINESS RULE: Tiến độ tổng thể dự án phải được tính từ Daily Logs
        // Single source of truth: Daily Construction Logs
        $overallPercentage = 0;
        
        // Tính tiến độ từ nhật ký thi công (single source of truth)
        // Lấy log mới nhất có completion_percentage
        $latestLog = ConstructionLog::where('project_id', $projectId)
            ->whereNotNull('completion_percentage')
            ->orderBy('log_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->first();
        
        if ($latestLog && $latestLog->completion_percentage !== null) {
            $overallPercentage = (float) $latestLog->completion_percentage;
        } else {
            // Nếu không có log với completion_percentage, tính từ tasks thông qua TaskProgressService
            // Đảm bảo tính nhất quán với logic tính toán task progress
            $taskProgressService = app(TaskProgressService::class);
            $taskProgressService->recalculateAllTasks($projectId);
            
            // Tính trung bình từ tất cả root tasks (nếu có)
            $rootTasks = $project->tasks()
                ->whereNull('deleted_at')
                ->whereNull('parent_id')
                ->get();
            
            if ($rootTasks->isNotEmpty()) {
                $totalProgress = 0;
                $count = 0;
                foreach ($rootTasks as $task) {
                    // Kiểm tra nếu task có children
                    $hasChildren = \App\Models\ProjectTask::where('parent_id', $task->id)
                        ->whereNull('deleted_at')
                        ->exists();
                    
                    if ($hasChildren) {
                        // Nếu task có children, dùng parent calculation
                        $taskProgress = $taskProgressService->calculateParentProgress($task);
                    } else {
                        // Nếu không có children, tính từ logs
                        $taskProgress = $taskProgressService->calculateProgressFromLogs($task);
                    }
                    $totalProgress += $taskProgress;
                    $count++;
                }
                if ($count > 0) {
                    $overallPercentage = round($totalProgress / $count, 2);
                }
            }
        }

        // Thống kê theo tuần
        $weeklyStats = [];
        $startDate = Carbon::parse($fromDate);
        $endDate = Carbon::parse($toDate);

        while ($startDate <= $endDate) {
            $weekStart = $startDate->copy()->startOfWeek();
            $weekEnd = $startDate->copy()->endOfWeek();

            $weekLogs = $constructionLogs->filter(function ($log) use ($weekStart, $weekEnd) {
                $logDate = Carbon::parse($log->log_date);
                return $logDate->between($weekStart, $weekEnd);
            });

            $avgProgress = $weekLogs->avg('completion_percentage') ?? 0;
            $avgPersonnel = $weekLogs->avg('personnel_count') ?? 0;

            $weeklyStats[] = [
                'week' => $weekStart->format('Y-m-d') . ' - ' . $weekEnd->format('Y-m-d'),
                'week_start' => $weekStart->toDateString(),
                'week_end' => $weekEnd->toDateString(),
                'average_progress' => round($avgProgress, 2),
                'average_personnel' => round($avgPersonnel, 0),
                'log_count' => $weekLogs->count(),
            ];

            $startDate->addWeek();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'code' => $project->code,
                ],
                'overall_progress' => round($overallPercentage, 2),
                'period' => [
                    'from_date' => $fromDate,
                    'to_date' => $toDate,
                ],
                'construction_logs' => $constructionLogs,
                'subcontractor_progress' => $subcontractorProgress,
                'weekly_statistics' => $weeklyStats,
            ],
        ]);
    }

    /**
     * Báo cáo tiến độ mua vật liệu và nhập nguyên vật liệu
     */
    public function materialProcurement(Request $request, string $projectId)
    {
        $user = auth()->user();

        if (!$user->hasPermission('reports.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem báo cáo.'
            ], 403);
        }

        $project = Project::findOrFail($projectId);
        $fromDate = $request->query('from_date', now()->subDays(30)->toDateString());
        $toDate = $request->query('to_date', now()->toDateString());

        // Giao dịch nhập (in)
        $inTransactions = MaterialTransaction::where('project_id', $projectId)
            ->where('type', 'in')
            ->whereBetween('transaction_date', [$fromDate, $toDate])
            ->with(['material', 'supplier', 'creator'])
            ->orderBy('transaction_date', 'desc')
            ->get();

        // Thống kê theo vật liệu
        $materialStats = MaterialTransaction::where('project_id', $projectId)
            ->where('type', 'in')
            ->whereBetween('transaction_date', [$fromDate, $toDate])
            ->select('material_id', DB::raw('SUM(quantity) as total_quantity'), DB::raw('SUM(total_amount) as total_amount'))
            ->groupBy('material_id')
            ->with('material')
            ->get()
            ->map(function ($item) {
                return [
                    'material' => [
                        'id' => $item->material->id,
                        'name' => $item->material->name,
                        'code' => $item->material->code,
                        'unit' => $item->material->unit,
                    ],
                    'total_quantity' => (float) $item->total_quantity,
                    'total_amount' => (float) $item->total_amount,
                ];
            });

        // Thống kê theo nhà cung cấp
        $supplierStats = MaterialTransaction::where('project_id', $projectId)
            ->where('type', 'in')
            ->whereBetween('transaction_date', [$fromDate, $toDate])
            ->whereNotNull('supplier_id')
            ->select('supplier_id', DB::raw('COUNT(*) as transaction_count'), DB::raw('SUM(total_amount) as total_amount'))
            ->groupBy('supplier_id')
            ->with('supplier')
            ->get()
            ->map(function ($item) {
                return [
                    'supplier' => [
                        'id' => $item->supplier->id,
                        'name' => $item->supplier->name,
                    ],
                    'transaction_count' => $item->transaction_count,
                    'total_amount' => (float) $item->total_amount,
                ];
            });

        // Thống kê theo ngày
        $dailyStats = MaterialTransaction::where('project_id', $projectId)
            ->where('type', 'in')
            ->whereBetween('transaction_date', [$fromDate, $toDate])
            ->select(
                'transaction_date',
                DB::raw('COUNT(*) as transaction_count'),
                DB::raw('SUM(quantity) as total_quantity'),
                DB::raw('SUM(total_amount) as total_amount')
            )
            ->groupBy('transaction_date')
            ->orderBy('transaction_date', 'desc')
            ->get();

        $totalQuantity = $inTransactions->sum('quantity');
        $totalAmount = $inTransactions->sum('total_amount');

        return response()->json([
            'success' => true,
            'data' => [
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'code' => $project->code,
                ],
                'period' => [
                    'from_date' => $fromDate,
                    'to_date' => $toDate,
                ],
                'summary' => [
                    'total_transactions' => $inTransactions->count(),
                    'total_quantity' => (float) $totalQuantity,
                    'total_amount' => (float) $totalAmount,
                ],
                'transactions' => $inTransactions,
                'material_statistics' => $materialStats,
                'supplier_statistics' => $supplierStats,
                'daily_statistics' => $dailyStats,
            ],
        ]);
    }

    /**
     * Báo cáo thu chi theo công việc (phase/task)
     */
    public function revenueExpenseByWork(Request $request, string $projectId)
    {
        $user = auth()->user();

        if (!$user->hasPermission('reports.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem báo cáo.'
            ], 403);
        }

        $project = Project::findOrFail($projectId);

        // Thu từ thanh toán dự án
        $revenue = $this->financialCalculationService->calculateRevenue($project);

        // Chi phí theo parent tasks (parent tasks act as "phases")
        $rootTasks = $project->tasks()->whereNull('parent_id')->orderBy('order')->get();
        $parentTaskStats = [];

        foreach ($rootTasks as $parentTask) {
            // Chi phí liên quan đến parent task này (có thể link qua Cost hoặc Task)
            $taskCosts = Cost::where('project_id', $projectId)
                ->where('status', 'approved')
                ->where('description', 'like', "%{$parentTask->name}%")
                ->sum('amount');

            $parentTaskStats[] = [
                'parent_task' => [
                    'id' => $parentTask->id,
                    'name' => $parentTask->name,
                    'order' => $parentTask->order,
                ],
                'revenue' => 0, // Có thể tính từ payment schedule
                'expenses' => (float) $taskCosts,
                'profit' => -$taskCosts,
            ];
        }

        // Chi phí theo nhóm công việc (CostGroup)
        $costsByGroup = Cost::where('project_id', $projectId)
            ->where('status', 'approved')
            ->with('costGroup')
            ->select('cost_group_id', DB::raw('SUM(amount) as total'))
            ->groupBy('cost_group_id')
            ->get()
            ->map(function ($item) {
                return [
                    'cost_group' => $item->costGroup ? [
                        'id' => $item->costGroup->id,
                        'name' => $item->costGroup->name,
                    ] : null,
                    'expenses' => (float) $item->total,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'code' => $project->code,
                ],
                'total_revenue' => $revenue['total_revenue'],
                'total_expenses' => $this->financialCalculationService->calculateTotalCosts($project)['total_costs'],
                'total_profit' => $this->financialCalculationService->calculateProfit($project)['profit'] ?? 0,
                'by_parent_task' => $parentTaskStats,
                'by_cost_group' => $costsByGroup,
            ],
        ]);
    }

    /**
     * Báo cáo thu chi toàn dự án
     */
    public function projectRevenueExpense(Request $request, string $projectId)
    {
        $user = auth()->user();

        if (!$user->hasPermission('reports.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem báo cáo.'
            ], 403);
        }

        $project = Project::findOrFail($projectId);
        $fromDate = $request->query('from_date');
        $toDate = $request->query('to_date');

        // Tính toán doanh thu và chi phí
        $revenue = $this->financialCalculationService->calculateRevenue($project);
        $costs = $this->financialCalculationService->calculateTotalCosts($project);
        $profit = $this->financialCalculationService->calculateProfit($project);

        // Tính chi phí theo nhóm động (CostGroup)
        $costsByGroup = Cost::where('project_id', $projectId)
            ->where('status', 'approved')
            ->with('costGroup')
            ->select('cost_group_id', DB::raw('SUM(amount) as total'))
            ->groupBy('cost_group_id')
            ->get()
            ->mapWithKeys(function ($item) {
                $groupName = $item->costGroup
                    ? $item->costGroup->name
                    : 'Chưa phân loại';
                $groupId = $item->cost_group_id ?? 'other';
                return [$groupId => [
                    'id' => $item->cost_group_id,
                    'name' => $groupName,
                    'amount' => (float) $item->total,
                ]];
            });

        // Chi phí không có cost_group_id (fallback về category cũ)
        $costsWithoutGroup = Cost::where('project_id', $projectId)
            ->where('status', 'approved')
            ->whereNull('cost_group_id')
            ->select('category', DB::raw('SUM(amount) as total'))
            ->groupBy('category')
            ->get()
            ->mapWithKeys(function ($item) {
                $categoryLabel = match ($item->category) {
                    'construction_materials' => 'Vật liệu xây dựng',
                    'concrete' => 'Bê tông',
                    'labor' => 'Nhân công',
                    'equipment' => 'Thiết bị',
                    'transportation' => 'Vận chuyển',
                    'other' => 'Chi phí khác',
                    default => 'Khác',
                };
                return ["category_{$item->category}" => [
                    'id' => null,
                    'name' => $categoryLabel,
                    'amount' => (float) $item->total,
                ]];
            });

        // Merge cả hai
        $allCostsByGroup = $costsByGroup->merge($costsWithoutGroup);

        // Chi tiết thanh toán
        $paymentsQuery = ProjectPayment::where('project_id', $projectId);
        if ($fromDate) {
            $paymentsQuery->where(function ($q) use ($fromDate) {
                $q->where('paid_date', '>=', $fromDate)
                    ->orWhere(function ($q2) use ($fromDate) {
                        $q2->whereNull('paid_date')->where('due_date', '>=', $fromDate);
                    });
            });
        }
        if ($toDate) {
            $paymentsQuery->where(function ($q) use ($toDate) {
                $q->where('paid_date', '<=', $toDate)
                    ->orWhere(function ($q2) use ($toDate) {
                        $q2->whereNull('paid_date')->where('due_date', '<=', $toDate);
                    });
            });
        }
        $payments = $paymentsQuery->orderByRaw('COALESCE(paid_date, due_date) DESC')->get();

        // Chi tiết chi phí theo thời gian
        $costsQuery = Cost::where('project_id', $projectId)
            ->where('status', 'approved');
        if ($fromDate) {
            $costsQuery->where('cost_date', '>=', $fromDate);
        }
        if ($toDate) {
            $costsQuery->where('cost_date', '<=', $toDate);
        }
        $costDetails = $costsQuery->with(['costGroup', 'creator'])
            ->orderBy('cost_date', 'desc')
            ->get();

        // Thống kê theo tháng
        $monthlyStats = [];
        $startDate = $fromDate ? Carbon::parse($fromDate) : Carbon::parse($project->start_date ?? now()->subMonths(6));
        $endDate = $toDate ? Carbon::parse($toDate) : now();

        $current = $startDate->copy()->startOfMonth();
        while ($current <= $endDate) {
            $monthStart = $current->copy()->startOfMonth();
            $monthEnd = $current->copy()->endOfMonth();

            $monthRevenue = ProjectPayment::where('project_id', $projectId)
                ->whereBetween('paid_date', [$monthStart, $monthEnd])
                ->where('status', 'paid')
                ->sum('amount');

            $monthExpenses = Cost::where('project_id', $projectId)
                ->where('status', 'approved')
                ->whereBetween('cost_date', [$monthStart, $monthEnd])
                ->sum('amount');

            $monthlyStats[] = [
                'month' => $current->format('Y-m'),
                'month_label' => $current->format('m/Y'),
                'revenue' => (float) $monthRevenue,
                'expenses' => (float) $monthExpenses,
                'profit' => (float) $monthRevenue - (float) $monthExpenses,
            ];

            $current->addMonth();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'code' => $project->code,
                ],
                'summary' => [
                    'total_revenue' => $revenue['total_revenue'] ?? 0,
                    'total_expenses' => $costs['total_costs'] ?? 0,
                    'total_profit' => $profit['profit'] ?? 0,
                    'profit_margin' => $profit['profit_margin'] ?? 0,
                ],
                'revenue_breakdown' => $revenue,
                'costs_breakdown' => [
                    'by_group' => $allCostsByGroup->values()->all(),
                    'breakdown' => [
                        'additional_costs' => (float) ($costs['additional_costs'] ?? 0),
                        'subcontractor_costs' => (float) ($costs['subcontractor_costs'] ?? 0),
                        'payroll_costs' => (float) ($costs['payroll_costs'] ?? 0),
                        'time_tracking_costs' => (float) ($costs['time_tracking_costs'] ?? 0),
                        'bonus_costs' => (float) ($costs['bonus_costs'] ?? 0),
                        'other_costs' => (float) ($costs['other_costs'] ?? 0),
                    ],
                    'total_costs' => (float) ($costs['total_costs'] ?? 0),
                ],
                'payments' => $payments,
                'cost_details' => $costDetails,
                'monthly_statistics' => $monthlyStats,
            ],
        ]);
    }

    /**
     * Báo cáo vật liệu sử dụng
     */
    public function materialUsage(Request $request, string $projectId)
    {
        $user = auth()->user();

        if (!$user->hasPermission('reports.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem báo cáo.'
            ], 403);
        }

        $project = Project::findOrFail($projectId);
        $fromDate = $request->query('from_date', now()->subDays(30)->toDateString());
        $toDate = $request->query('to_date', now()->toDateString());

        // Giao dịch xuất (out)
        $outTransactions = MaterialTransaction::where('project_id', $projectId)
            ->where('type', 'out')
            ->whereBetween('transaction_date', [$fromDate, $toDate])
            ->with(['material', 'creator'])
            ->orderBy('transaction_date', 'desc')
            ->get();

        // Thống kê theo vật liệu
        $materialStats = MaterialTransaction::where('project_id', $projectId)
            ->where('type', 'out')
            ->whereBetween('transaction_date', [$fromDate, $toDate])
            ->select('material_id', DB::raw('SUM(quantity) as total_quantity'), DB::raw('SUM(total_amount) as total_amount'))
            ->groupBy('material_id')
            ->with('material')
            ->get()
            ->map(function ($item) {
                return [
                    'material' => [
                        'id' => $item->material->id,
                        'name' => $item->material->name,
                        'code' => $item->material->code,
                        'unit' => $item->material->unit,
                    ],
                    'total_quantity' => (float) $item->total_quantity,
                    'total_amount' => (float) $item->total_amount,
                ];
            });

        // So sánh nhập vs xuất
        $inOutComparison = MaterialTransaction::where('project_id', $projectId)
            ->whereBetween('transaction_date', [$fromDate, $toDate])
            ->select('material_id', 'type', DB::raw('SUM(quantity) as total_quantity'))
            ->groupBy('material_id', 'type')
            ->with('material')
            ->get()
            ->groupBy('material_id')
            ->map(function ($transactions, $materialId) {
                $material = $transactions->first()->material;
                $inQty = $transactions->where('type', 'in')->sum('total_quantity') ?? 0;
                $outQty = $transactions->where('type', 'out')->sum('total_quantity') ?? 0;

                return [
                    'material' => [
                        'id' => $material->id,
                        'name' => $material->name,
                        'code' => $material->code,
                    ],
                    'in_quantity' => (float) $inQty,
                    'out_quantity' => (float) $outQty,
                    'remaining' => (float) ($inQty - $outQty),
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'code' => $project->code,
                ],
                'period' => [
                    'from_date' => $fromDate,
                    'to_date' => $toDate,
                ],
                'summary' => [
                    'total_transactions' => $outTransactions->count(),
                    'total_quantity' => (float) $outTransactions->sum('quantity'),
                    'total_amount' => (float) $outTransactions->sum('total_amount'),
                ],
                'transactions' => $outTransactions,
                'material_statistics' => $materialStats,
                'in_out_comparison' => $inOutComparison,
            ],
        ]);
    }

    /**
     * Báo cáo nhật ký thi công
     */
    public function constructionLogs(Request $request, string $projectId)
    {
        $user = auth()->user();

        if (!$user->hasPermission('reports.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem báo cáo.'
            ], 403);
        }

        $project = Project::findOrFail($projectId);
        $fromDate = $request->query('from_date', now()->subDays(30)->toDateString());
        $toDate = $request->query('to_date', now()->toDateString());

        $logs = ConstructionLog::where('project_id', $projectId)
            ->whereBetween('log_date', [$fromDate, $toDate])
            ->with(['creator'])
            ->orderBy('log_date', 'desc')
            ->get();

        // Thống kê
        $avgProgress = $logs->avg('completion_percentage') ?? 0;
        $avgPersonnel = $logs->avg('personnel_count') ?? 0;
        $totalLogs = $logs->count();

        // Thống kê theo thời tiết
        $weatherStats = $logs->groupBy('weather')
            ->map(function ($group, $weather) {
                return [
                    'weather' => $weather ?? 'Không xác định',
                    'count' => $group->count(),
                    'avg_progress' => round($group->avg('completion_percentage') ?? 0, 2),
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'code' => $project->code,
                ],
                'period' => [
                    'from_date' => $fromDate,
                    'to_date' => $toDate,
                ],
                'summary' => [
                    'total_logs' => $totalLogs,
                    'average_progress' => round($avgProgress, 2),
                    'average_personnel' => round($avgPersonnel, 0),
                ],
                'logs' => $logs,
                'weather_statistics' => $weatherStats,
            ],
        ]);
    }

    /**
     * Báo cáo công nợ và thanh toán
     */
    public function debtAndPayment(Request $request, string $projectId)
    {
        $user = auth()->user();

        if (!$user->hasPermission('reports.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem báo cáo.'
            ], 403);
        }

        $project = Project::findOrFail($projectId);

        // Công nợ thầu phụ
        $subcontractorDebts = [];
        $subcontractors = $project->subcontractors;
        foreach ($subcontractors as $sub) {
            $totalPaid = $sub->payments()->where('status', 'paid')->sum('amount');
            $remaining = $sub->total_quote - $totalPaid;

            $subcontractorDebts[] = [
                'subcontractor' => [
                    'id' => $sub->id,
                    'name' => $sub->name,
                    'category' => $sub->category,
                ],
                'contract_value' => (float) $sub->total_quote,
                'total_paid' => (float) $totalPaid,
                'remaining_debt' => (float) $remaining,
                'payment_percentage' => $sub->total_quote > 0 ? round(($totalPaid / $sub->total_quote) * 100, 2) : 0,
            ];
        }

        // Công nợ nhà cung cấp (từ SupplierAcceptance)
        $supplierDebts = SupplierAcceptance::whereHas('supplier.contracts', function ($q) use ($projectId) {
            $q->where('project_id', $projectId);
        })
            ->with(['supplier', 'contract'])
            ->where('status', 'approved')
            ->get()
            ->groupBy('supplier_id')
            ->map(function ($acceptances, $supplierId) {
                $supplier = $acceptances->first()->supplier;
                $totalAccepted = $acceptances->sum('accepted_amount');
                $totalPaid = $supplier->total_paid;

                return [
                    'supplier' => [
                        'id' => $supplier->id,
                        'name' => $supplier->name,
                    ],
                    'total_accepted' => (float) $totalAccepted,
                    'total_paid' => (float) $totalPaid,
                    'remaining_debt' => (float) ($totalAccepted - $totalPaid),
                ];
            })
            ->values();

        // Thanh toán dự án
        $projectPayments = ProjectPayment::where('project_id', $projectId)
            ->orderByRaw('COALESCE(paid_date, due_date) DESC')
            ->get();

        // Tổng hợp
        $totalSubcontractorDebt = collect($subcontractorDebts)->sum('remaining_debt');
        $totalSupplierDebt = collect($supplierDebts)->sum('remaining_debt');
        $totalDebt = $totalSubcontractorDebt + $totalSupplierDebt;

        return response()->json([
            'success' => true,
            'data' => [
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'code' => $project->code,
                ],
                'summary' => [
                    'total_subcontractor_debt' => (float) $totalSubcontractorDebt,
                    'total_supplier_debt' => (float) $totalSupplierDebt,
                    'total_debt' => (float) $totalDebt,
                ],
                'subcontractor_debts' => $subcontractorDebts,
                'supplier_debts' => $supplierDebts,
                'project_payments' => $projectPayments,
            ],
        ]);
    }
}
