<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupplierAcceptance;
use App\Models\Supplier;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SupplierAcceptanceController extends Controller
{
    protected $supplierService;
    protected $authService;

    public function __construct(
        \App\Services\SupplierService $supplierService,
        \App\Services\AuthorizationService $authService
    ) {
        $this->supplierService = $supplierService;
        $this->authService = $authService;
    }

    /**
     * Danh sách nghiệm thu NCC
     */
    public function index(Request $request)
    {
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.view')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem nghiệm thu NCC.'
            ], 403);
        }

        $acceptances = $this->supplierService->getAcceptances($request->all());

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

        if (!$user->hasPermission('suppliers.create')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo nghiệm thu.'
            ], 403);
        }

        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'project_id' => 'nullable|exists:projects,id',
            'supplier_contract_id' => 'nullable|exists:supplier_contracts,id',
            'acceptance_number' => 'nullable|string|max:100|unique:supplier_acceptances,acceptance_number',
            'acceptance_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'acceptance_date' => 'required|date',
            'accepted_quantity' => 'required|numeric|min:0',
            'quantity_unit' => 'nullable|string|max:20',
            'accepted_amount' => 'required|numeric|min:0',
            'quality_score' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string',
        ]);

        try {
            $acceptance = $this->supplierService->upsertAcceptance($validated, null, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo nghiệm thu thành công.',
                'data' => $acceptance
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Chi tiết nghiệm thu
     */
    public function show(string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.view')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem nghiệm thu.'
            ], 403);
        }

        $acceptance = \App\Models\SupplierAcceptance::with([
            'supplier', 'project', 'contract', 'accepter', 'rejector', 'attachments'
        ])->findOrFail($id);

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
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.update')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền cập nhật nghiệm thu.'
            ], 403);
        }

        $acceptance = \App\Models\SupplierAcceptance::findOrFail($id);

        $validated = $request->validate([
            'acceptance_number' => 'sometimes|nullable|string|max:100|unique:supplier_acceptances,acceptance_number,' . $id,
            'acceptance_name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'acceptance_date' => 'sometimes|required|date',
            'accepted_quantity' => 'sometimes|required|numeric|min:0',
            'quantity_unit' => 'nullable|string|max:20',
            'accepted_amount' => 'sometimes|required|numeric|min:0',
            'quality_score' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string',
        ]);

        try {
            $acceptance = $this->supplierService->upsertAcceptance($validated, $acceptance, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật nghiệm thu thành công.',
                'data' => $acceptance
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 400);
        }
    }

    /**
     * Xóa nghiệm thu
     */
    public function destroy(string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.delete')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xóa nghiệm thu.'
            ], 403);
        }

        $acceptance = \App\Models\SupplierAcceptance::findOrFail($id);

        if ($acceptance->status === 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa nghiệm thu đã được duyệt.'
            ], 422);
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
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.approve')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền duyệt nghiệm thu.'
            ], 403);
        }

        $acceptance = \App\Models\SupplierAcceptance::findOrFail($id);

        try {
            $this->supplierService->approveAcceptance($acceptance, $user, $request->input('notes'));

            return response()->json([
                'success' => true,
                'message' => 'Đã duyệt nghiệm thu thành công.',
                'data' => $acceptance->fresh(['accepter'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 422);
        }
    }

    /**
     * Từ chối nghiệm thu
     */
    public function reject(Request $request, string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.approve')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền từ chối nghiệm thu.'
            ], 403);
        }

        $acceptance = \App\Models\SupplierAcceptance::findOrFail($id);
        $request->validate(['rejection_reason' => 'required|string']);

        try {
            $this->supplierService->rejectAcceptance($acceptance, $user, $request->rejection_reason);

            return response()->json([
                'success' => true,
                'message' => 'Đã từ chối nghiệm thu.',
                'data' => $acceptance->fresh(['rejector'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 422);
        }
    }
}
