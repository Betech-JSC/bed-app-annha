<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WbsTemplate;
use App\Models\WbsTemplateItem;
use App\Models\ProjectTask;
use App\Models\ProjectPhase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class WbsTemplateController extends Controller
{
    /**
     * Danh sách WBS templates
     */
    public function index(Request $request)
    {
        $query = WbsTemplate::with(['creator'])
            ->withCount('items');

        if ($request->has('project_type')) {
            $query->byType($request->project_type);
        }

        if ($request->boolean('active_only', true)) {
            $query->active();
        }

        $templates = $query->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data'    => $templates,
        ]);
    }

    /**
     * Chi tiết template với tree structure
     */
    public function show($id)
    {
        $template = WbsTemplate::with(['items.costGroup', 'creator'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => [
                'template' => $template,
                'tree'     => $template->getTree(),
            ],
        ]);
    }

    /**
     * Tạo template mới
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name'         => 'required|string|max:255',
            'project_type' => 'required|in:residential,industrial,infrastructure,interior',
            'description'  => 'nullable|string',
            'items'        => 'nullable|array',
            'items.*.name' => 'required|string',
            'items.*.default_duration' => 'nullable|integer|min:1',
            'items.*.children'         => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $template = DB::transaction(function () use ($request) {
            $template = WbsTemplate::create([
                'name'         => $request->name,
                'project_type' => $request->project_type,
                'description'  => $request->description,
                'created_by'   => Auth::id(),
            ]);

            if ($request->has('items')) {
                $this->createItemsRecursive($template->id, $request->items, null, 0);
            }

            return $template;
        });

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo template WBS',
            'data'    => $template->load('items'),
        ], 201);
    }

    /**
     * Import template vào project → tạo tasks
     */
    public function importToProject(Request $request, $projectId)
    {
        $validator = Validator::make($request->all(), [
            'template_id' => 'required|exists:wbs_templates,id',
            'start_date'  => 'required|date',
            'phase_id'    => 'nullable|exists:project_phases,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $template = WbsTemplate::with('items')->findOrFail($request->template_id);
        $startDate = \Carbon\Carbon::parse($request->start_date);

        $result = DB::transaction(function () use ($template, $projectId, $startDate, $request) {
            $items = $template->items()->whereNull('parent_id')->orderBy('order')->get();
            $taskIds = [];
            $currentDate = $startDate->copy();

            foreach ($items as $item) {
                $taskId = $this->createTaskFromTemplate(
                    $item, $projectId, $request->phase_id, null, $currentDate, $taskIds
                );
                $taskIds[] = $taskId;
            }

            return $taskIds;
        });

        $tasks = ProjectTask::where('project_id', $projectId)
            ->with(['children', 'dependencies'])
            ->whereNull('parent_id')
            ->orderBy('order')
            ->get();

        return response()->json([
            'success' => true,
            'message' => "Đã import {$template->name} ({$template->items->count()} hạng mục)",
            'data'    => [
                'tasks_created' => count($result),
                'tasks'         => $tasks,
            ],
        ]);
    }

    // ==================================================================
    // PRIVATE
    // ==================================================================

    private function createItemsRecursive(int $templateId, array $items, ?int $parentId, int $startOrder): void
    {
        foreach ($items as $index => $itemData) {
            $item = WbsTemplateItem::create([
                'template_id'      => $templateId,
                'parent_id'        => $parentId,
                'name'             => $itemData['name'],
                'description'      => $itemData['description'] ?? null,
                'order'            => $startOrder + $index,
                'default_duration' => $itemData['default_duration'] ?? null,
                'unit'             => $itemData['unit'] ?? 'day',
                'cost_group_id'    => $itemData['cost_group_id'] ?? null,
                'level'            => $itemData['level'] ?? 'task',
                'default_resources' => $itemData['default_resources'] ?? null,
            ]);

            if (!empty($itemData['children'])) {
                $this->createItemsRecursive($templateId, $itemData['children'], $item->id, 0);
            }
        }
    }

    private function createTaskFromTemplate(
        WbsTemplateItem $item,
        int $projectId,
        ?int $phaseId,
        ?int $parentId,
        \Carbon\Carbon &$currentDate,
        array &$createdIds
    ): int {
        $duration = $item->default_duration ?? 1;
        $startDate = $currentDate->copy();
        $endDate = $startDate->copy()->addDays($duration - 1);

        $task = ProjectTask::create([
            'project_id'  => $projectId,
            'phase_id'    => $phaseId,
            'parent_id'   => $parentId,
            'name'        => $item->name,
            'description' => $item->description,
            'start_date'  => $startDate,
            'end_date'    => $endDate,
            'duration'    => $duration,
            'priority'    => 'medium',
            'order'       => $item->order,
            'created_by'  => Auth::id(),
        ]);

        // Process children
        $children = $item->children()->orderBy('order')->get();
        if ($children->isNotEmpty()) {
            $childDate = $startDate->copy();
            foreach ($children as $child) {
                $this->createTaskFromTemplate($child, $projectId, $phaseId, $task->id, $childDate, $createdIds);
                $childDate->addDays($child->default_duration ?? 1);
            }
            // Update parent end date to cover all children
            $lastChild = $children->last();
            $task->end_date = $childDate->copy()->subDay();
            $task->duration = $task->start_date->diffInDays($task->end_date) + 1;
            $task->saveQuietly();
        }

        // Advance the current date for sequential scheduling
        $currentDate = $endDate->copy()->addDay();

        return $task->id;
    }
}
