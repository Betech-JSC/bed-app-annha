<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LaborProductivity;
use App\Constants\Permissions;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class LaborProductivityController extends Controller
{
    use ApiAuthorization;

    protected $productivityService;

    public function __construct(\App\Services\LaborProductivityService $productivityService)
    {
        $this->productivityService = $productivityService;
    }
    /** Danh sách năng suất lao động theo dự án */
    public function index(Request $request, $projectId): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::LABOR_PRODUCTIVITY_VIEW, $projectId);

        $query = LaborProductivity::with(['user:id,name', 'task:id,name', 'creator:id,name'])
            ->forProject($projectId);

        if ($request->user_id) $query->forUser($request->user_id);
        if ($request->task_id) $query->where('task_id', $request->task_id);
        if ($request->from) $query->where('record_date', '>=', $request->from);
        if ($request->to) $query->where('record_date', '<=', $request->to);

        $data = $query->orderByDesc('record_date')->paginate($request->per_page ?? 20);
        return response()->json($data);
    }

    /** Tạo ghi nhận năng suất */
    public function store(Request $request, $projectId): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::LABOR_PRODUCTIVITY_CREATE, $projectId);

        $request->validate([
            'user_id' => 'nullable|exists:users,id',
            'task_id' => 'nullable|exists:project_tasks,id',
            'record_date' => 'required|date',
            'work_item' => 'required|string|max:255',
            'unit' => 'required|string|max:20',
            'planned_quantity' => 'required|numeric|min:0',
            'actual_quantity' => 'required|numeric|min:0',
            'workers_count' => 'required|integer|min:1',
            'hours_spent' => 'required|numeric|min:0.5|max:24',
            'note' => 'nullable|string|max:500',
        ]);

        $record = $this->productivityService->upsert(
            array_merge($request->all(), ['project_id' => $projectId]),
            null,
            $request->user()
        );

        return response()->json([
            'message' => 'Ghi nhận năng suất thành công',
            'data' => $record->load(['user:id,name', 'task:id,name']),
        ], 201);
    }

    /** Cập nhật */
    public function update(Request $request, $projectId, $id): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::LABOR_PRODUCTIVITY_UPDATE, $projectId);

        $record = LaborProductivity::where('project_id', $projectId)->findOrFail($id);
        $record = $this->productivityService->upsert($request->all(), $record, $request->user());

        return response()->json([
            'message' => 'Cập nhật thành công',
            'data' => $record->fresh()->load(['user:id,name', 'task:id,name']),
        ]);
    }

    /** Xóa */
    public function destroy(Request $request, $projectId, $id): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::LABOR_PRODUCTIVITY_DELETE, $projectId);

        LaborProductivity::where('project_id', $projectId)->findOrFail($id)->delete();
        return response()->json(['message' => 'Đã xóa']);
    }

    /** Dashboard năng suất */
    public function dashboard(Request $request, $projectId): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::LABOR_PRODUCTIVITY_VIEW, $projectId);

        $data = $this->productivityService->getDashboardData((int)$projectId, $request->all());
        return response()->json($data);
    }
}
