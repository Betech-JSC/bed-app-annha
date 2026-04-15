<?php

namespace App\Http\Controllers\Api;

use App\Constants\Permissions;
use App\Http\Controllers\Controller;
use App\Models\Cost;
use App\Models\InputInvoice;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class InputInvoiceController extends Controller
{
    protected $invoiceService;

    public function __construct(\App\Services\InputInvoiceService $invoiceService)
    {
        $this->invoiceService = $invoiceService;
    }

    /**
     * Danh sách hóa đơn đầu vào
     * Có thể lọc theo project hoặc lấy tất cả
     */
    public function index(Request $request, ?string $projectId = null)
    {
        $user = auth()->user();

        // Check RBAC permission
        if (!$user->owner && !$user->hasPermission(Permissions::INPUT_INVOICE_VIEW)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem hóa đơn đầu vào.'
            ], 403);
        }

        $query = InputInvoice::with(['project', 'creator', 'attachments']);

        // Nếu có projectId, lọc theo project
        if ($projectId) {
            $project = Project::findOrFail($projectId);
            $query->where('project_id', $project->id);
        }

        // Lọc theo invoice_type nếu có
        if ($request->has('invoice_type') && $request->invoice_type) {
            $query->where('invoice_type', $request->invoice_type);
        }

        // Lọc theo khoảng thời gian
        if ($request->has('from_date')) {
            $query->where('issue_date', '>=', $request->from_date);
        }
        if ($request->has('to_date')) {
            $query->where('issue_date', '<=', $request->to_date);
        }

        $invoices = $query->orderBy('issue_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $invoices
        ]);
    }

    /**
     * Tạo hóa đơn đầu vào
     */
    public function store(Request $request, ?string $projectId = null)
    {
        $user = auth()->user();

        // Check RBAC permission
        if (!$user->owner && !$user->hasPermission(Permissions::INPUT_INVOICE_CREATE)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo hóa đơn đầu vào.'
            ], 403);
        }

        $validated = $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'invoice_type' => 'nullable|string|max:100',
            'issue_date' => 'required|date',
            'invoice_number' => 'nullable|string|max:255',
            'supplier_name' => 'nullable|string|max:255',
            'amount_before_vat' => 'required|numeric|min:0',
            'vat_percentage' => 'nullable|numeric|min:0|max:100',
            'description' => 'nullable|string|max:2000',
            'notes' => 'nullable|string|max:2000',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'required|integer|exists:attachments,id',
        ]);

        try {
            // Prioritize project_id from route
            if ($projectId) {
                $validated['project_id'] = $projectId;
            }

            $invoice = $this->invoiceService->createInvoice($validated, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo hóa đơn đầu vào thành công.',
                'data' => $invoice
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Chi tiết hóa đơn đầu vào
     */
    public function show(?string $projectId, string $id)
    {
        $user = auth()->user();

        // Check RBAC permission
        if (!$user->owner && !$user->hasPermission(Permissions::INPUT_INVOICE_VIEW)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem hóa đơn đầu vào.'
            ], 403);
        }

        $query = InputInvoice::with(['project', 'creator', 'attachments']);

        // Nếu có projectId, đảm bảo invoice thuộc project đó
        if ($projectId) {
            $query->where('project_id', $projectId);
        }

        $invoice = $query->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $invoice
        ]);
    }

    /**
     * Cập nhật hóa đơn đầu vào
     */
    public function update(Request $request, ?string $projectId, string $id)
    {
        $user = auth()->user();

        // Check RBAC permission
        if (!$user->owner && !$user->hasPermission(Permissions::INPUT_INVOICE_UPDATE)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền cập nhật hóa đơn đầu vào.'
            ], 403);
        }

        $query = InputInvoice::query();
        if ($projectId) {
            $query->where('project_id', $projectId);
        }
        $invoice = $query->findOrFail($id);

        $validated = $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'invoice_type' => 'nullable|string|max:100',
            'issue_date' => 'sometimes|required|date',
            'invoice_number' => 'nullable|string|max:255',
            'supplier_name' => 'nullable|string|max:255',
            'amount_before_vat' => 'sometimes|required|numeric|min:0',
            'vat_percentage' => 'nullable|numeric|min:0|max:100',
            'description' => 'nullable|string|max:2000',
            'notes' => 'nullable|string|max:2000',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'required|integer|exists:attachments,id',
        ]);

        try {
            $invoice = $this->invoiceService->updateInvoice($invoice, $validated, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật hóa đơn đầu vào thành công.',
                'data' => $invoice
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Xóa hóa đơn đầu vào
     */
    public function destroy(?string $projectId, string $id)
    {
        $user = auth()->user();

        // Check RBAC permission
        if (!$user->owner && !$user->hasPermission(Permissions::INPUT_INVOICE_DELETE)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xóa hóa đơn đầu vào.'
            ], 403);
        }

        $query = InputInvoice::query();
        if ($projectId) {
            $query->where('project_id', $projectId);
        }
        $invoice = $query->findOrFail($id);

        $invoice->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa hóa đơn đầu vào thành công.'
        ]);
    }
}
