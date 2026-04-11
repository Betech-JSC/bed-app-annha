<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashFlow;
use App\Models\WarrantyRetention;
use App\Services\FinanceService;
use App\Constants\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinanceController extends Controller
{
    use ApiAuthorization;

    public function __construct(private FinanceService $finance) {}

    /**
     * GET /api/projects/{projectId}/cash-flow
     */
    public function cashFlow(Request $request, int $projectId): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::FINANCE_VIEW, $projectId);

        $data = $this->finance->getCashFlow(
            $projectId,
            $request->query('from'),
            $request->query('to')
        );

        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * POST /api/projects/{projectId}/cash-flow
     */
    public function storeCashFlow(Request $request, int $projectId): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::FINANCE_MANAGE, $projectId);

        $validated = $request->validate([
            'type'           => 'required|in:inflow,outflow',
            'category'       => 'required|string',
            'amount'         => 'required|numeric|min:0',
            'planned_date'   => 'nullable|date',
            'actual_date'    => 'nullable|date',
            'reference_type' => 'nullable|string',
            'reference_id'   => 'nullable|integer',
            'notes'          => 'nullable|string',
        ]);

        $flow = CashFlow::create([
            ...$validated,
            'project_id' => $projectId,
            'created_by' => auth()->id(),
        ]);

        return response()->json(['success' => true, 'data' => $flow], 201);
    }

    /**
     * GET /api/projects/{projectId}/profit-loss
     */
    public function profitLoss(Request $request, int $projectId): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::FINANCE_VIEW, $projectId);

        $data = $this->finance->getProfitLoss($projectId);
        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * GET /api/projects/{projectId}/budget-vs-actual
     */
    public function budgetVsActual(Request $request, int $projectId): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::FINANCE_VIEW, $projectId);

        $data = $this->finance->getBudgetVsActual($projectId);
        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * GET /api/projects/{projectId}/subcontractor-debt
     */
    public function subcontractorDebt(Request $request, int $projectId): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::FINANCE_VIEW, $projectId);

        $data = $this->finance->getSubcontractorDebt($projectId);
        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * GET /api/projects/{projectId}/tax-summary
     */
    public function taxSummary(Request $request, int $projectId): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::FINANCE_VIEW, $projectId);

        $data = $this->finance->getTaxSummary($projectId);
        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * GET /api/projects/{projectId}/warranty-retentions
     */
    public function warrantyRetentions(Request $request, int $projectId): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::FINANCE_VIEW, $projectId);

        $data = $this->finance->getWarrantyRetentions($projectId);
        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * POST /api/projects/{projectId}/warranty-retentions
     */
    public function storeWarrantyRetention(Request $request, int $projectId): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::FINANCE_MANAGE, $projectId);

        $validated = $request->validate([
            'subcontractor_id'     => 'nullable|exists:subcontractors,id',
            'retention_amount'     => 'required|numeric|min:0',
            'retention_percentage' => 'nullable|numeric|min:0|max:100',
            'warranty_start_date'  => 'nullable|date',
            'warranty_end_date'    => 'nullable|date|after_or_equal:warranty_start_date',
            'notes'                => 'nullable|string',
        ]);

        $retention = WarrantyRetention::create([
            ...$validated,
            'project_id' => $projectId,
            'created_by' => auth()->id(),
        ]);

        return response()->json(['success' => true, 'data' => $retention], 201);
    }

    /**
     * POST /api/projects/{projectId}/warranty-retentions/{id}/release
     */
    public function releaseWarranty(Request $request, int $projectId, int $id): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::FINANCE_MANAGE, $projectId);

        $retention = WarrantyRetention::where('project_id', $projectId)->findOrFail($id);

        $validated = $request->validate([
            'amount' => 'nullable|numeric|min:0',
        ]);

        $amount = $validated['amount'] ?? $retention->remaining_amount;

        if (!$retention->partialRelease($amount, auth()->user())) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể giải phóng bảo hành. Số tiền không hợp lệ.',
            ], 422);
        }

        return response()->json(['success' => true, 'data' => $retention->fresh()]);
    }
}
