<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubcontractorAcceptance;
use App\Models\Subcontractor;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SubcontractorAcceptanceController extends Controller
{
    protected $subcontractorService;
    protected $authService;

    public function __construct(\App\Services\SubcontractorService $subcontractorService, \App\Services\AuthorizationService $authService)
    {
        $this->subcontractorService = $subcontractorService;
        $this->authService = $authService;
    }

    /**
     * Danh sách nghiệm thu thầu phụ
     */
    public function index(Request $request)
    {
        $user = auth()->user();

        // Check view permission if project_id is provided, otherwise generic check
        if ($projectId = $request->query('project_id')) {
            $project = Project::findOrFail($projectId);
            if (!$this->authService->can($user, 'subcontractors.view', $project)) {
                return response()->json(['success' => false, 'message' => 'Không có quyền xem nghiệm thu.'], 403);
            }
        } elseif (!$user->hasPermission('subcontractors.view')) {
            return response()->json(['success' => false, 'message' => 'Không có quyền xem nghiệm thu thầu phụ.'], 403);
        }

        $acceptances = $this->subcontractorService->getAcceptances($request->all());

        return response()->json([
            'success' => true,
            'data' => $acceptances
        ]);
    }

    /**
     * Tạo nghiệm thu mới
     */
    public function store(Request $request)
    {
        $user = auth()->user();
        $project = Project::findOrFail($request->project_id);

        if (!$this->authService->can($user, 'subcontractors.create', $project)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền tạo nghiệm thu.'], 403);
        }

        $validated = $request->validate([
            'subcontractor_id' => 'required|exists:subcontractors,id',
            'project_id' => 'required|exists:projects,id',
            'subcontractor_contract_id' => 'nullable|exists:subcontractor_contracts,id',
            'acceptance_number' => 'nullable|string|max:100|unique:subcontractor_acceptances,acceptance_number',
            'acceptance_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'acceptance_date' => 'required|date',
            'accepted_volume' => 'required|numeric|min:0',
            'volume_unit' => 'nullable|string|max:20',
            'accepted_amount' => 'required|numeric|min:0',
            'quality_score' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string',
        ]);

        try {
            $acceptance = $this->subcontractorService->upsertAcceptance($validated, null, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo nghiệm thu thành công.',
                'data' => $acceptance
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * Chi tiết nghiệm thu
     */
    public function show(string $id)
    {
        $acceptance = SubcontractorAcceptance::with([
            'subcontractor', 'project', 'contract', 'accepter', 'rejector', 'attachments'
        ])->findOrFail($id);

        if (!$this->authService->can(auth()->user(), 'subcontractors.view', $acceptance->project)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền xem nghiệm thu.'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $acceptance
        ]);
    }

    /**
     * Cập nhật nghiệm thu
     */
    public function update(Request $request, string $id)
    {
        $acceptance = SubcontractorAcceptance::findOrFail($id);

        if (!$this->authService->can(auth()->user(), 'subcontractors.update', $acceptance->project)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền cập nhật nghiệm thu.'], 403);
        }

        $validated = $request->validate([
            'acceptance_number' => 'sometimes|nullable|string|max:100|unique:subcontractor_acceptances,acceptance_number,' . $id,
            'acceptance_name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'acceptance_date' => 'sometimes|required|date',
            'accepted_volume' => 'sometimes|required|numeric|min:0',
            'volume_unit' => 'nullable|string|max:20',
            'accepted_amount' => 'sometimes|required|numeric|min:0',
            'quality_score' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string',
        ]);

        try {
            $acceptance = $this->subcontractorService->upsertAcceptance($validated, $acceptance, auth()->user());

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật nghiệm thu thành công.',
                'data' => $acceptance
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * Xóa nghiệm thu
     */
    public function destroy(string $id)
    {
        $acceptance = SubcontractorAcceptance::findOrFail($id);

        if (!$this->authService->can(auth()->user(), 'subcontractors.delete', $acceptance->project)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền xóa nghiệm thu.'], 403);
        }

        if ($acceptance->status === 'approved') {
            return response()->json(['success' => false, 'message' => 'Không thể xóa nghiệm thu đã được duyệt.'], 422);
        }

        $acceptance->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa nghiệm thu thành công.'
        ]);
    }

    /**
     * Duyệt nghiệm thu
     */
    public function approve(Request $request, string $id)
    {
        $acceptance = SubcontractorAcceptance::findOrFail($id);

        if (!$this->authService->can(auth()->user(), 'subcontractors.approve', $acceptance->project)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền duyệt nghiệm thu.'], 403);
        }

        try {
            $this->subcontractorService->approveAcceptance($acceptance, auth()->user(), $request->input('notes'));

            return response()->json([
                'success' => true,
                'message' => 'Đã duyệt nghiệm thu thành công.',
                'data' => $acceptance->fresh(['accepter'])
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * Từ chối nghiệm thu
     */
    public function reject(Request $request, string $id)
    {
        $acceptance = SubcontractorAcceptance::findOrFail($id);

        if (!$this->authService->can(auth()->user(), 'subcontractors.approve', $acceptance->project)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền từ chối nghiệm thu.'], 403);
        }

        $request->validate(['rejection_reason' => 'required|string']);

        try {
            $this->subcontractorService->rejectAcceptance($acceptance, auth()->user(), $request->rejection_reason);

            return response()->json([
                'success' => true,
                'message' => 'Đã từ chối nghiệm thu.',
                'data' => $acceptance->fresh(['rejector'])
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }
}
