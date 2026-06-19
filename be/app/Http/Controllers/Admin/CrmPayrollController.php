<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Constants\Permissions;
use App\Models\User;
use App\Models\Project;
use App\Models\Payroll;
use App\Services\PayrollService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Carbon\Carbon;

class CrmPayrollController extends Controller
{
    use CrmAuthorization;

    protected PayrollService $payrollService;

    public function __construct(PayrollService $payrollService)
    {
        $this->payrollService = $payrollService;
    }

    /**
     * Display list of payroll sheets (payslips)
     */
    public function index(Request $request)
    {
        $admin = Auth::guard('admin')->user();
        $this->crmRequire($admin, Permissions::HR_SALARY_VIEW);

        $query = Payroll::with(['user:id,name,email', 'project:id,name,code', 'managementApprover:id,name', 'accountantApprover:id,name']);

        // Filter by search (employee name)
        if ($search = $request->query('search')) {
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
            });
        }

        // Filter by project
        if ($projectId = $request->query('project_id')) {
            $query->where('project_id', $projectId);
        }

        // Filter by status
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        // Filter by month (YYYY-MM)
        if ($month = $request->query('month')) {
            $start = Carbon::parse($month . '-01')->startOfMonth()->toDateString();
            $end = Carbon::parse($month . '-01')->endOfMonth()->toDateString();
            $query->where('period_start', '>=', $start)
                  ->where('period_end', '<=', $end);
        }

        $payrolls = $query->orderByDesc('period_start')->orderByDesc('created_at')->paginate(20)->withQueryString();

        // Calculate statistics for filter match
        $statsQuery = Payroll::query();
        if ($projectId) $statsQuery->where('project_id', $projectId);
        if ($month) {
            $start = Carbon::parse($month . '-01')->startOfMonth()->toDateString();
            $end = Carbon::parse($month . '-01')->endOfMonth()->toDateString();
            $statsQuery->where('period_start', '>=', $start)->where('period_end', '<=', $end);
        }
        
        $statsAll = $statsQuery->get();
        $stats = [
            'total_count'      => $statsAll->count(),
            'total_net_salary' => $statsAll->sum('net_salary'),
            'total_allowance'  => $statsAll->sum('allowance_amount'),
            'pending_count'    => $statsAll->whereIn('status', ['pending_management', 'pending_accountant'])->count(),
        ];

        $employees = User::employees()->select('id', 'name', 'email')->orderBy('name')->get()->map(function ($emp) {
            $currentConfig = \App\Models\EmployeeSalaryConfig::forUser($emp->id)->current()->first();
            $emp->current_salary = $currentConfig ? (float) $currentConfig->monthly_salary : 0.0;
            $emp->salary_type = $currentConfig ? $currentConfig->salary_type : 'monthly';
            $emp->hourly_rate = $currentConfig ? (float) $currentConfig->hourly_rate : 0.0;
            $emp->daily_rate = $currentConfig ? (float) $currentConfig->daily_rate : 0.0;
            return $emp;
        });
        $projects = Project::select('id', 'name', 'code')->orderBy('name')->get();

        return Inertia::render('Crm/Hr/Payroll/Index', [
            'payrolls'  => $payrolls,
            'stats'     => $stats,
            'employees' => $employees,
            'projects'  => $projects,
            'filters'   => $request->only(['search', 'project_id', 'status', 'month']),
        ]);
    }

    /**
     * Store a new payroll sheet
     */
    public function store(Request $request)
    {
        $admin = Auth::guard('admin')->user();
        $this->crmRequire($admin, Permissions::HR_SALARY_MANAGE);

        try {
            $payroll = $this->payrollService->upsert($request->all(), null, $admin);
            return back()->with('success', 'Tạo phiếu lương thành công.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    /**
     * Update an existing payroll sheet
     */
    public function update(Request $request, $id)
    {
        $admin = Auth::guard('admin')->user();
        $this->crmRequire($admin, Permissions::HR_SALARY_MANAGE);

        $payroll = Payroll::findOrFail($id);

        try {
            $this->payrollService->upsert($request->all(), $payroll, $admin);
            return back()->with('success', 'Cập nhật phiếu lương thành công.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    /**
     * Delete a payroll sheet (draft only)
     */
    public function destroy($id)
    {
        $admin = Auth::guard('admin')->user();
        $this->crmRequire($admin, Permissions::HR_SALARY_MANAGE);

        $payroll = Payroll::findOrFail($id);

        try {
            $this->payrollService->delete($payroll);
            return back()->with('success', 'Xóa phiếu lương thành công.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    /**
     * Submit a payroll sheet for BHD approval
     */
    public function submit($id)
    {
        $admin = Auth::guard('admin')->user();
        $this->crmRequire($admin, Permissions::HR_SALARY_MANAGE);

        $payroll = Payroll::findOrFail($id);

        try {
            $this->payrollService->submit($payroll, $admin);
            return back()->with('success', 'Gửi duyệt phiếu lương thành công.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    /**
     * Revert a payroll sheet to draft
     */
    public function revert($id)
    {
        $admin = Auth::guard('admin')->user();
        // Allow BHD, Accountant, or super_admin to revert
        if (!$admin->isSuperAdmin() && !$admin->hasPermission(Permissions::HR_SALARY_MANAGE) && !$admin->hasPermission(Permissions::COST_APPROVE_ACCOUNTANT)) {
            abort(403, 'Unauthorized');
        }

        $payroll = Payroll::findOrFail($id);

        try {
            $this->payrollService->revertToDraft($payroll, $admin);
            return back()->with('success', 'Hoàn duyệt phiếu lương thành công.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }
}
