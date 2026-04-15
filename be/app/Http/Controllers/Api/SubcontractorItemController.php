<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Subcontractor;
use App\Models\SubcontractorItem;
use App\Constants\Permissions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubcontractorItemController extends Controller
{
    protected $subcontractorService;
    protected $authService;

    public function __construct(\App\Services\SubcontractorService $subcontractorService, \App\Services\AuthorizationService $authService)
    {
        $this->subcontractorService = $subcontractorService;
        $this->authService = $authService;
    }

    /**
     * Danh sách hạng mục của nhà thầu phụ
     */
    public function index(string $projectId, string $subcontractorId)
    {
        $project = Project::findOrFail($projectId);
        $this->apiRequire(auth()->user(), Permissions::SUBCONTRACTOR_VIEW, $project);

        $subcontractor = Subcontractor::where('project_id', $project->id)
            ->findOrFail($subcontractorId);

        $items = $this->subcontractorService->getItems($subcontractor);

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
        $this->apiRequire($request->user(), Permissions::SUBCONTRACTOR_UPDATE, $project);

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
            $item = $this->subcontractorService->upsertItem($validated, $subcontractor);

            return response()->json([
                'success' => true,
                'message' => 'Hạng mục đã được thêm.',
                'data' => $item
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cập nhật hạng mục
     */
    public function update(Request $request, string $projectId, string $subcontractorId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $this->apiRequire($request->user(), Permissions::SUBCONTRACTOR_UPDATE, $project);

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

        try {
            $item = $this->subcontractorService->upsertItem($validated, $subcontractor, $item);

            return response()->json([
                'success' => true,
                'message' => 'Hạng mục đã được cập nhật.',
                'data' => $item
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Xóa hạng mục
     */
    public function destroy(string $projectId, string $subcontractorId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $this->apiRequire(auth()->user(), Permissions::SUBCONTRACTOR_DELETE, $project);

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
        $this->apiRequire($request->user(), Permissions::SUBCONTRACTOR_UPDATE, $project);

        $subcontractor = Subcontractor::where('project_id', $project->id)
            ->findOrFail($subcontractorId);

        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:subcontractor_items,id',
            'items.*.order' => 'required|integer|min:0',
        ]);

        try {
            $this->subcontractorService->reorderItems($subcontractor, $validated['items']);

            return response()->json([
                'success' => true,
                'message' => 'Thứ tự hạng mục đã được cập nhật.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }
}

