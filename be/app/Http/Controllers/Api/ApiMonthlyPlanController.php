<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MonthlyPlan;
use App\Models\MonthlyTask;
use App\Constants\Permissions;
use App\Services\AuthorizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ApiMonthlyPlanController extends Controller
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
            return response()->json(['message' => 'Unauthorized'], 403);
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
        ->paginate(15);

        return response()->json($plans);
    }

    public function show(string $id)
    {
        $user = Auth::user();
        if (!$this->authService->can($user, Permissions::MONTHLY_PLAN_VIEW)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $plan = MonthlyPlan::with([
            'tasks.assignee:id,name,image as avatar',
            'tasks.creator:id,name',
        ])->findOrFail($id);

        return response()->json($plan);
    }

    public function updateTaskStatus(Request $request, string $planId, string $taskId)
    {
        $user = Auth::user();
        $task = MonthlyTask::where('monthly_plan_id', $planId)->findOrFail($taskId);

        $canUpdate = $this->authService->can($user, Permissions::MONTHLY_PLAN_MANAGE) 
            || $task->assigned_to === $user->id;

        if (!$canUpdate) {
            return response()->json(['message' => 'Unauthorized to update status of this task'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|string|in:todo,in_progress,under_review,done',
        ]);

        $task->update(['status' => $validated['status']]);

        return response()->json([
            'message' => 'Task status updated successfully',
            'task' => $task->load('assignee:id,name,image as avatar')
        ]);
    }
}
