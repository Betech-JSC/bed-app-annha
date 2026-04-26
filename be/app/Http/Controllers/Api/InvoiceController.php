<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Invoice;
use App\Services\ExpoPushService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

use App\Constants\Permissions;
use App\Services\AuthorizationService;

class InvoiceController extends Controller
{
    protected $authService;
    protected $documentService;

    public function __construct(\App\Services\AuthorizationService $authService, \App\Services\ProjectDocumentService $documentService)
    {
        $this->authService = $authService;
        $this->documentService = $documentService;
    }
    public function index(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        if (!$this->authService->can($user, Permissions::INVOICE_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem hóa đơn của dự án này.'
            ], 403);
        }
        $invoices = $project->invoices()
            ->with(['customer', 'creator', 'costGroup', 'attachments'])
            ->orderBy('invoice_date', 'desc')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $invoices
        ]);
    }

    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        if (!$this->authService->can($user, Permissions::INVOICE_CREATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo hóa đơn cho dự án này.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'invoice_date' => 'required|date',
            'cost_group_id' => 'required|exists:cost_groups,id',
            'subtotal' => 'required|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'description' => 'nullable|string|max:2000',
            'notes' => 'nullable|string|max:2000',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'integer|exists:attachments,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $invoice = $this->documentService->createInvoice($project, $request->all(), $user);
            $invoice->load(['customer', 'creator', 'costGroup', 'attachments']);

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo hóa đơn thành công.',
                'data' => $invoice
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function show(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        if (!$this->authService->can($user, Permissions::INVOICE_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem hóa đơn của dự án này.'
            ], 403);
        }

        $invoice = Invoice::where('project_id', $projectId)
            ->with(['customer', 'project', 'creator', 'costGroup', 'attachments'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $invoice
        ]);
    }





    public function update(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        if (!$this->authService->can($user, Permissions::INVOICE_UPDATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền cập nhật hóa đơn của dự án này.'
            ], 403);
        }

        $invoice = Invoice::where('project_id', $projectId)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'invoice_date' => 'sometimes|required|date',
            'cost_group_id' => 'sometimes|required|exists:cost_groups,id',
            'subtotal' => 'sometimes|required|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'description' => 'nullable|string|max:2000',
            'notes' => 'nullable|string|max:2000',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'integer|exists:attachments,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $this->documentService->updateInvoice($invoice, $request->all(), $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật hóa đơn thành công.',
                'data' => $invoice
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function destroy(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        if (!$this->authService->can($user, Permissions::INVOICE_DELETE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xóa hóa đơn của dự án này.'
            ], 403);
        }

        $invoice = Invoice::where('project_id', $projectId)->findOrFail($id);

        $invoice->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa hóa đơn thành công.'
        ]);
    }

    public function summaryByCostGroup(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        if (!$this->authService->can($user, Permissions::INVOICE_VIEW, $project)) {
             return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem báo cáo của dự án này.'
            ], 403);
        }

        $summary = $this->documentService->getInvoiceSummaryByCostGroup($project);

        return response()->json([
            'success' => true,
            'data' => $summary
        ]);
    }
}
