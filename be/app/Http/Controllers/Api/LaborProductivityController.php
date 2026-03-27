<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LaborProductivity;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class LaborProductivityController extends Controller
{
    /** Danh sách năng suất lao động theo dự án */
    public function index(Request $request, $projectId): JsonResponse
    {
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

        $record = LaborProductivity::create(array_merge(
            $request->all(),
            [
                'project_id' => $projectId,
                'created_by' => $request->user()->id,
            ]
        ));

        return response()->json([
            'message' => 'Ghi nhận năng suất thành công',
            'data' => $record->load(['user:id,name', 'task:id,name']),
        ], 201);
    }

    /** Cập nhật */
    public function update(Request $request, $projectId, $id): JsonResponse
    {
        $record = LaborProductivity::where('project_id', $projectId)->findOrFail($id);
        $record->update($request->all());

        return response()->json([
            'message' => 'Cập nhật thành công',
            'data' => $record->fresh()->load(['user:id,name', 'task:id,name']),
        ]);
    }

    /** Xóa */
    public function destroy($projectId, $id): JsonResponse
    {
        LaborProductivity::where('project_id', $projectId)->findOrFail($id)->delete();
        return response()->json(['message' => 'Đã xóa']);
    }

    /** Dashboard năng suất */
    public function dashboard(Request $request, $projectId): JsonResponse
    {
        $query = LaborProductivity::forProject($projectId);

        if ($request->from) $query->where('record_date', '>=', $request->from);
        if ($request->to) $query->where('record_date', '<=', $request->to);

        $records = $query->get();

        // Tổng quan
        $summary = [
            'total_records' => $records->count(),
            'total_workers' => $records->unique('user_id')->count(),
            'avg_efficiency' => round($records->avg('efficiency_percent') ?? 0, 1),
            'avg_productivity_rate' => round($records->avg('productivity_rate') ?? 0, 2),
            'total_planned' => $records->sum('planned_quantity'),
            'total_actual' => $records->sum('actual_quantity'),
            'total_hours' => $records->sum(fn($r) => $r->workers_count * $r->hours_spent),
        ];

        // Theo nhân viên
        $byUser = $records->groupBy('user_id')->map(function ($userRecords) {
            $user = $userRecords->first()->user;
            return [
                'user_id' => $user?->id,
                'user_name' => $user?->name ?? '—',
                'records_count' => $userRecords->count(),
                'avg_efficiency' => round($userRecords->avg('efficiency_percent'), 1),
                'avg_productivity' => round($userRecords->avg('productivity_rate'), 2),
                'total_actual' => $userRecords->sum('actual_quantity'),
                'total_hours' => $userRecords->sum(fn($r) => $r->workers_count * $r->hours_spent),
            ];
        })->sortByDesc('avg_efficiency')->values();

        // Theo work_item
        $byItem = $records->groupBy('work_item')->map(function ($itemRecords, $item) {
            return [
                'work_item' => $item,
                'unit' => $itemRecords->first()->unit,
                'records_count' => $itemRecords->count(),
                'avg_efficiency' => round($itemRecords->avg('efficiency_percent'), 1),
                'total_planned' => $itemRecords->sum('planned_quantity'),
                'total_actual' => $itemRecords->sum('actual_quantity'),
            ];
        })->values();

        // Xu hướng theo ngày
        $trend = $records->groupBy(fn($r) => $r->record_date->format('Y-m-d'))
            ->map(function ($dayRecords, $date) {
                return [
                    'date' => $date,
                    'avg_efficiency' => round($dayRecords->avg('efficiency_percent'), 1),
                    'records_count' => $dayRecords->count(),
                    'total_actual' => $dayRecords->sum('actual_quantity'),
                ];
            })->sortKeys()->values();

        return response()->json([
            'summary' => $summary,
            'by_user' => $byUser,
            'by_item' => $byItem,
            'trend' => $trend,
        ]);
    }
}
