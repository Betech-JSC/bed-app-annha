<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Subcontractor;
use App\Models\SubcontractorItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubcontractorItemController extends Controller
{
    /**
     * Danh sách hạng mục của nhà thầu phụ
     */
    public function index(string $projectId, string $subcontractorId)
    {
        $project = Project::findOrFail($projectId);
        $subcontractor = Subcontractor::where('project_id', $project->id)
            ->findOrFail($subcontractorId);

        $items = $subcontractor->items()->orderBy('order')->get();

        return response()->json([
            'success' => true,
            'data' => $items
        ]);
    }

    /**
     * Tạo hạng mục mới
     */
    public function store(Request $request, string $projectId, string $subcontractorId)
    {
        $project = Project::findOrFail($projectId);
        $subcontractor = Subcontractor::where('project_id', $project->id)
            ->findOrFail($subcontractorId);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'unit_price' => 'required|numeric|min:0',
            'quantity' => 'required|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'order' => 'nullable|integer|min:0',
        ]);

        try {
            DB::beginTransaction();

            if (!isset($validated['order'])) {
                $maxOrder = $subcontractor->items()->max('order') ?? -1;
                $validated['order'] = $maxOrder + 1;
            }

            $item = SubcontractorItem::create([
                'subcontractor_id' => $subcontractor->id,
                ...$validated,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Hạng mục đã được thêm.',
                'data' => $item
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cập nhật hạng mục
     */
    public function update(Request $request, string $projectId, string $subcontractorId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $subcontractor = Subcontractor::where('project_id', $project->id)
            ->findOrFail($subcontractorId);
        $item = SubcontractorItem::where('subcontractor_id', $subcontractor->id)
            ->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'unit_price' => 'sometimes|numeric|min:0',
            'quantity' => 'sometimes|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'order' => 'sometimes|integer|min:0',
        ]);

        $item->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Hạng mục đã được cập nhật.',
            'data' => $item->fresh()
        ]);
    }

    /**
     * Xóa hạng mục
     */
    public function destroy(string $projectId, string $subcontractorId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $subcontractor = Subcontractor::where('project_id', $project->id)
            ->findOrFail($subcontractorId);
        $item = SubcontractorItem::where('subcontractor_id', $subcontractor->id)
            ->findOrFail($id);

        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Hạng mục đã được xóa.'
        ]);
    }

    /**
     * Sắp xếp lại thứ tự hạng mục
     */
    public function reorder(Request $request, string $projectId, string $subcontractorId)
    {
        $project = Project::findOrFail($projectId);
        $subcontractor = Subcontractor::where('project_id', $project->id)
            ->findOrFail($subcontractorId);

        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:subcontractor_items,id',
            'items.*.order' => 'required|integer|min:0',
        ]);

        try {
            DB::beginTransaction();

            foreach ($validated['items'] as $itemData) {
                SubcontractorItem::where('id', $itemData['id'])
                    ->where('subcontractor_id', $subcontractor->id)
                    ->update(['order' => $itemData['order']]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Thứ tự hạng mục đã được cập nhật.',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

