<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MonthlyPlan;
use App\Models\MonthlyTask;
use App\Models\User;
use App\Constants\Permissions;
use App\Services\AuthorizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CrmMonthlyPlanController extends Controller
{
    protected $authService;

    public function __construct(AuthorizationService $authService)
    {
        $this->authService = $authService;
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        if (!$this->authService->can($user, Permissions::MONTHLY_PLAN_VIEW)) {
            abort(403);
        }

        $plans = MonthlyPlan::withCount([
            'tasks',
            'tasks as completed_tasks_count' => function ($query) {
                $query->where('status', 'done');
            },
            'tasks as top_tasks_count' => function ($query) {
                $query->where('evaluation', 'top');
            },
            'tasks as flop_tasks_count' => function ($query) {
                $query->where('evaluation', 'flop');
            }
        ])
        ->orderByDesc('year')
        ->orderByDesc('month')
        ->paginate(12);

        return Inertia::render('Crm/MonthlyPlans/Index', [
            'plans' => $plans,
            'canManage' => $this->authService->can($user, Permissions::MONTHLY_PLAN_MANAGE),
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$this->authService->can($user, Permissions::MONTHLY_PLAN_MANAGE)) {
            abort(403);
        }

        $validated = $request->validate([
            'month' => 'required|integer|between:1,12',
            'year' => 'required|integer|min:2020',
            'general_goal' => 'nullable|string',
        ]);

        // Check unique constraint manually to provide a nice validation message
        $exists = MonthlyPlan::where('month', $validated['month'])
            ->where('year', $validated['year'])
            ->exists();

        if ($exists) {
            return redirect()->back()->withErrors([
                'month' => 'Kế hoạch cho tháng này đã tồn tại.'
            ]);
        }

        $validated['title'] = "Kế hoạch tháng " . str_pad($validated['month'], 2, '0', STR_PAD_LEFT) . "/" . $validated['year'];
        $validated['created_by'] = $user->id;

        MonthlyPlan::create($validated);

        return redirect()->back()->with('success', 'Đã tạo kế hoạch tháng thành công.');
    }

    public function show(string $id)
    {
        $user = Auth::user();
        if (!$this->authService->can($user, Permissions::MONTHLY_PLAN_VIEW)) {
            abort(403);
        }

        $plan = MonthlyPlan::with([
            'tasks.assignee:id,name,image as avatar',
            'tasks.creator:id,name',
        ])->findOrFail($id);

        $employees = User::employees()->select('id', 'name')->get();

        return Inertia::render('Crm/MonthlyPlans/Show', [
            'plan' => $plan,
            'employees' => $employees,
            'canManage' => $this->authService->can($user, Permissions::MONTHLY_PLAN_MANAGE),
            'currentUserId' => $user->id,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $user = Auth::user();
        if (!$this->authService->can($user, Permissions::MONTHLY_PLAN_MANAGE)) {
            abort(403);
        }

        $plan = MonthlyPlan::findOrFail($id);
        $validated = $request->validate([
            'general_goal' => 'nullable|string',
            'meeting_notes' => 'nullable|string',
            'status' => 'required|string|in:draft,active,reviewed',
        ]);

        $plan->update($validated);

        return redirect()->back()->with('success', 'Cập nhật kế hoạch thành công.');
    }

    public function storeTask(Request $request, string $planId)
    {
        $user = Auth::user();
        if (!$this->authService->can($user, Permissions::MONTHLY_PLAN_MANAGE)) {
            abort(403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'assigned_to' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date',
        ]);

        $validated['monthly_plan_id'] = $planId;
        $validated['created_by'] = $user->id;

        MonthlyTask::create($validated);

        return redirect()->back()->with('success', 'Đã thêm công việc.');
    }

    public function updateTask(Request $request, string $planId, string $taskId)
    {
        $user = Auth::user();
        if (!$this->authService->can($user, Permissions::MONTHLY_PLAN_MANAGE)) {
            abort(403);
        }

        $task = MonthlyTask::where('monthly_plan_id', $planId)->findOrFail($taskId);
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'assigned_to' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date',
        ]);

        $task->update($validated);

        return redirect()->back()->with('success', 'Cập nhật công việc thành công.');
    }

    public function updateTaskStatus(Request $request, string $planId, string $taskId)
    {
        $user = Auth::user();
        $task = MonthlyTask::where('monthly_plan_id', $planId)->findOrFail($taskId);

        $canUpdate = $this->authService->can($user, Permissions::MONTHLY_PLAN_MANAGE) 
            || $task->assigned_to === $user->id;

        if (!$canUpdate) {
            abort(403, 'Bạn không có quyền chuyển trạng thái công việc này.');
        }

        $validated = $request->validate([
            'status' => 'required|string|in:todo,in_progress,under_review,done',
        ]);

        $task->update(['status' => $validated['status']]);

        return redirect()->back()->with('success', 'Đã cập nhật trạng thái công việc.');
    }

    public function evaluateTask(Request $request, string $planId, string $taskId)
    {
        $user = Auth::user();
        if (!$this->authService->can($user, Permissions::MONTHLY_PLAN_MANAGE)) {
            abort(403);
        }

        $task = MonthlyTask::where('monthly_plan_id', $planId)->findOrFail($taskId);
        $validated = $request->validate([
            'evaluation' => 'required|string|in:none,top,flop',
            'evaluation_reason' => 'nullable|string',
        ]);

        $task->update($validated);

        return redirect()->back()->with('success', 'Đã đánh giá công việc.');
    }

    public function destroyTask(string $planId, string $taskId)
    {
        $user = Auth::user();
        if (!$this->authService->can($user, Permissions::MONTHLY_PLAN_MANAGE)) {
            abort(403);
        }

        $task = MonthlyTask::where('monthly_plan_id', $planId)->findOrFail($taskId);
        $task->delete();

        return redirect()->back()->with('success', 'Đã xóa công việc.');
    }

    public function destroy(string $id)
    {
        $user = Auth::user();
        if (!$this->authService->can($user, Permissions::MONTHLY_PLAN_MANAGE)) {
            abort(403);
        }

        $plan = MonthlyPlan::findOrFail($id);
        $plan->delete();

        return redirect()->route('crm.monthly-plans.index')->with('success', 'Đã xóa kế hoạch.');
    }
}
