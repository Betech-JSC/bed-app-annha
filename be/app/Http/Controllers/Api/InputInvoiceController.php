<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InputInvoice;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class InputInvoiceController extends Controller
{
    /**
     * Danh sách hóa đơn đầu vào
     * Có thể lọc theo project hoặc lấy tất cả
     */
    public function index(Request $request, ?string $projectId = null)
    {
        $user = auth()->user();

        // Chỉ kế toán mới có quyền xem
        if (!$user->hasPermission('accounting.manage') && $user->role !== 'accountant' && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ kế toán mới có quyền xem hóa đơn đầu vào.'
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

        // Chỉ kế toán mới có quyền tạo
        if (!$user->hasPermission('accounting.manage') && $user->role !== 'accountant' && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ kế toán mới có quyền tạo hóa đơn đầu vào.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
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

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Ưu tiên project_id từ route, nếu không có thì lấy từ request
            $finalProjectId = $projectId ?: $request->project_id;

            // Tính VAT amount và total amount
            $vatPercentage = $request->vat_percentage ?? 0;
            $amountBeforeVat = $request->amount_before_vat;
            $vatAmount = $vatPercentage > 0 ? ($amountBeforeVat * $vatPercentage / 100) : 0;
            $totalAmount = $amountBeforeVat + $vatAmount;

            $invoice = InputInvoice::create([
                'project_id' => $finalProjectId,
                'invoice_type' => $request->invoice_type,
                'issue_date' => $request->issue_date,
                'invoice_number' => $request->invoice_number,
                'supplier_name' => $request->supplier_name,
                'amount_before_vat' => $amountBeforeVat,
                'vat_percentage' => $vatPercentage,
                'vat_amount' => $vatAmount,
                'total_amount' => $totalAmount,
                'description' => $request->description,
                'notes' => $request->notes,
                'created_by' => $user->id,
            ]);

            // Đính kèm files nếu có
            if (!empty($request->attachment_ids)) {
                foreach ($request->attachment_ids as $attachmentId) {
                    $attachment = \App\Models\Attachment::find($attachmentId);
                    if ($attachment && ($attachment->uploaded_by === $user->id || $user->role === 'admin' || $user->owner === true)) {
                        $attachment->update([
                            'attachable_type' => InputInvoice::class,
                            'attachable_id' => $invoice->id,
                        ]);
                    }
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo hóa đơn đầu vào thành công.',
                'data' => $invoice->load(['project', 'creator', 'attachments'])
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
     * Chi tiết hóa đơn đầu vào
     */
    public function show(?string $projectId, string $id)
    {
        $user = auth()->user();

        // Chỉ kế toán mới có quyền xem
        if (!$user->hasPermission('accounting.manage') && $user->role !== 'accountant' && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ kế toán mới có quyền xem hóa đơn đầu vào.'
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

        // Chỉ kế toán mới có quyền cập nhật
        if (!$user->hasPermission('accounting.manage') && $user->role !== 'accountant' && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ kế toán mới có quyền cập nhật hóa đơn đầu vào.'
            ], 403);
        }

        $query = InputInvoice::query();
        if ($projectId) {
            $query->where('project_id', $projectId);
        }
        $invoice = $query->findOrFail($id);

        $validator = Validator::make($request->all(), [
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

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $updateData = $request->only([
                'project_id', 'invoice_type', 'issue_date', 'invoice_number',
                'supplier_name', 'amount_before_vat', 'vat_percentage',
                'description', 'notes'
            ]);

            // Tính lại VAT amount và total amount nếu có thay đổi
            if ($request->has('amount_before_vat') || $request->has('vat_percentage')) {
                $amountBeforeVat = $updateData['amount_before_vat'] ?? $invoice->amount_before_vat;
                $vatPercentage = $updateData['vat_percentage'] ?? $invoice->vat_percentage;
                $vatAmount = $vatPercentage > 0 ? ($amountBeforeVat * $vatPercentage / 100) : 0;
                $updateData['vat_amount'] = $vatAmount;
                $updateData['total_amount'] = $amountBeforeVat + $vatAmount;
            }

            $invoice->update($updateData);

            // Cập nhật attachments nếu có
            if ($request->has('attachment_ids')) {
                // Xóa các attachments cũ không còn trong danh sách mới
                $existingAttachmentIds = $invoice->attachments()->pluck('id')->toArray();
                $newAttachmentIds = $request->attachment_ids;
                $toRemove = array_diff($existingAttachmentIds, $newAttachmentIds);
                
                foreach ($toRemove as $attachmentId) {
                    $attachment = \App\Models\Attachment::find($attachmentId);
                    if ($attachment) {
                        $attachment->update([
                            'attachable_type' => null,
                            'attachable_id' => null,
                        ]);
                    }
                }

                // Thêm các attachments mới
                foreach ($newAttachmentIds as $attachmentId) {
                    $attachment = \App\Models\Attachment::find($attachmentId);
                    if ($attachment && ($attachment->uploaded_by === $user->id || $user->role === 'admin' || $user->owner === true)) {
                        $attachment->update([
                            'attachable_type' => InputInvoice::class,
                            'attachable_id' => $invoice->id,
                        ]);
                    }
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật hóa đơn đầu vào thành công.',
                'data' => $invoice->fresh(['project', 'creator', 'attachments'])
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

    /**
     * Xóa hóa đơn đầu vào
     */
    public function destroy(?string $projectId, string $id)
    {
        $user = auth()->user();

        // Chỉ kế toán mới có quyền xóa
        if (!$user->hasPermission('accounting.manage') && $user->role !== 'accountant' && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ kế toán mới có quyền xóa hóa đơn đầu vào.'
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
