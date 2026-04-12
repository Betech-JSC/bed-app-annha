<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Equipment;
use App\Models\Attachment;
use App\Constants\Permissions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CrmEquipmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Equipment::with(['creator:id,name', 'approver:id,name', 'confirmer:id,name', 'attachments']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('serial_number', 'like', "%{$search}%");
            });
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $equipment = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        $stats = [
            'total'       => Equipment::count(),
            'draft'       => Equipment::where('status', 'draft')->count(),
            'pending'     => Equipment::whereIn('status', ['pending_management', 'pending_accountant'])->count(),
            'available'   => Equipment::where('status', 'available')->count(),
            'in_use'      => Equipment::where('status', 'in_use')->count(),
            'maintenance' => Equipment::where('status', 'maintenance')->count(),
        ];

        return Inertia::render('Crm/Equipment/Index', [
            'equipment' => $equipment,
            'stats'     => $stats,
            'filters'   => $request->only(['search', 'status']),
        ]);
    }

    /**
     * Tạo tài sản mới (draft status)
     */
    public function store(Request $request)
    {
        $user = auth('admin')->user();

        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'code'           => 'nullable|string|max:50|unique:equipment,code',
            'category'       => 'nullable|string|max:100',
            'type'           => 'nullable|string|max:100',
            'brand'          => 'nullable|string|max:100',
            'model'          => 'nullable|string|max:100',
            'serial_number'  => 'nullable|string|max:100',
            'quantity'       => 'nullable|integer|min:1',
            'purchase_price' => 'nullable|numeric|min:0',
            'notes'          => 'nullable|string',
        ]);

        $validated['status'] = 'draft';
        $validated['created_by'] = $user->id;

        $equipment = Equipment::create($validated);

        // Handle file uploads (standard form)
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store('equipment-attachments', 'public');
                $equipment->attachments()->create([
                    'file_path'     => $path,
                    'file_name'     => $file->getClientOriginalName(),
                    'original_name' => $file->getClientOriginalName(),
                    'file_url'      => '/storage/' . $path,
                    'mime_type'     => $file->getClientMimeType(),
                    'file_size'     => $file->getSize(),
                    'type'          => $file->getClientOriginalExtension(),
                    'uploaded_by'   => $user->id ?? null,
                ]);
            }
        }

        // Handle attachment_ids from UniversalFileUploader/API
        if ($request->has('attachment_ids')) {
            $attachmentIds = is_array($request->attachment_ids) ? $request->attachment_ids : explode(',', $request->attachment_ids);
            \App\Models\Attachment::whereIn('id', $attachmentIds)->update([
                'attachable_id' => $equipment->id,
                'attachable_type' => get_class($equipment)
            ]);
        }

        return back()->with('success', 'Đã tạo tài sản (Nháp). Vui lòng gửi duyệt.');
    }

    public function update(Request $request, $id)
    {
        $eq = Equipment::findOrFail($id);

        if ($eq->status !== 'draft') {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chỉ có thể chỉnh sửa thiết bị ở trạng thái Nháp.'
                ], 403);
            }
            return back()->with('error', 'Chỉ có thể chỉnh sửa khi ở trạng thái Nháp.');
        }

        $validated = $request->validate([
            'name'           => 'sometimes|string|max:255',
            'code'           => ['sometimes', 'string', 'max:50', Rule::unique('equipment', 'code')->ignore($eq->id)],
            'category'       => 'nullable|string|max:100',
            'type'           => 'nullable|string|max:100',
            'brand'          => 'nullable|string|max:100',
            'model'          => 'nullable|string|max:100',
            'serial_number'  => 'nullable|string|max:100',
            'quantity'       => 'nullable|integer|min:1',
            'purchase_price' => 'nullable|numeric|min:0',
            'notes'          => 'nullable|string',
        ]);

        $eq->update($validated);

        // Handle attachment_ids from UniversalFileUploader
        if ($request->has('attachment_ids')) {
            $attachmentIds = is_array($request->attachment_ids) ? $request->attachment_ids : explode(',', $request->attachment_ids);
            // Link existing attachments to this equipment
            \App\Models\Attachment::whereIn('id', $attachmentIds)->update([
                'attachable_id' => $eq->id,
                'attachable_type' => get_class($eq)
            ]);
        }

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật thiết bị.',
                'data' => $eq->load('attachments')
            ]);
        }

        return back()->with('success', 'Đã cập nhật tài sản.');
    }

    public function destroy(Request $request, $id)
    {
        $eq = Equipment::findOrFail($id);

        if ($eq->status !== 'draft') {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chỉ có thể xóa thiết bị ở trạng thái Nháp.'
                ], 403);
            }
            return back()->with('error', 'Chỉ có thể xóa khi ở trạng thái Nháp.');
        }

        $eq->delete();
        return back()->with('success', 'Đã xóa tài sản.');
    }

    // ====================================================================
    // APPROVAL WORKFLOW: draft → pending_management → pending_accountant → available
    // ====================================================================

    /**
     * Gửi duyệt (draft/rejected → pending_management)
     */
    public function submit($id)
    {
        $eq = Equipment::findOrFail($id);

        if (!in_array($eq->status, ['draft', 'rejected'])) {
            $msg = 'Chỉ có thể gửi duyệt khi ở trạng thái Nháp hoặc Từ chối.';
            return request()->wantsJson() 
                ? response()->json(['success' => false, 'message' => $msg], 422)
                : back()->with('error', $msg);
        }

        $eq->update([
            'status'           => 'pending_management',
            'rejection_reason' => null,
        ]);

        $this->syncCost($eq);

        $msg = 'Đã gửi duyệt. Chờ BĐH xét duyệt.';
        return request()->wantsJson() 
            ? response()->json(['success' => true, 'message' => $msg, 'data' => $eq])
            : back()->with('success', $msg);
    }

    /**
     * BĐH duyệt (pending_management → pending_accountant)
     */
    public function approveManagement($id)
    {
        $user = auth()->user(); // Use default guard (sanctum for API, session for Web)

        // Try 'admin' guard if needed for Web context
        if (!$user && auth('admin')->check()) {
            $user = auth('admin')->user();
        }

        if (!$user || !$user->hasPermission(Permissions::COST_APPROVE_MANAGEMENT)) {
            $msg = 'Bạn không có quyền duyệt.';
            return request()->wantsJson() 
                ? response()->json(['success' => false, 'message' => $msg], 403)
                : back()->with('error', $msg);
        }

        $eq = Equipment::findOrFail($id);

        if ($eq->status !== 'pending_management') {
            $msg = 'Tài sản không ở trạng thái chờ BĐH duyệt.';
            return request()->wantsJson() 
                ? response()->json(['success' => false, 'message' => $msg], 422)
                : back()->with('error', $msg);
        }

        $eq->update([
            'status'      => 'pending_accountant',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        $this->syncCost($eq);

        $msg = 'BĐH đã duyệt. Chuyển sang Kế toán xác nhận chi và nhập kho.';
        return request()->wantsJson() 
            ? response()->json(['success' => true, 'message' => $msg, 'data' => $eq])
            : back()->with('success', $msg);
    }

    /**
     * KT xác nhận chi & nhập kho (pending_accountant → available)
     */
    public function confirmAccountant($id)
    {
        $user = auth()->user();
        if (!$user && auth('admin')->check()) {
            $user = auth('admin')->user();
        }

        if (!$user || !$user->hasPermission(Permissions::COST_APPROVE_ACCOUNTANT)) {
            $msg = 'Bạn không có quyền xác nhận.';
            return request()->wantsJson() 
                ? response()->json(['success' => false, 'message' => $msg], 403)
                : back()->with('error', $msg);
        }

        $eq = Equipment::findOrFail($id);

        if ($eq->status !== 'pending_accountant') {
            $msg = 'Tài sản không ở trạng thái chờ Kế toán.';
            return request()->wantsJson() 
                ? response()->json(['success' => false, 'message' => $msg], 422)
                : back()->with('error', $msg);
        }

        $eq->update([
            'status'       => 'available',
            'confirmed_by' => $user->id,
            'confirmed_at' => now(),
        ]);

        $this->syncCost($eq);

        $msg = 'Kế toán đã xác nhận chi. Tài sản đã nhập kho.';
        return request()->wantsJson() 
            ? response()->json(['success' => true, 'message' => $msg, 'data' => $eq])
            : back()->with('success', $msg);
    }

    /**
     * Từ chối (pending_management/pending_accountant → rejected)
     */
    public function reject(Request $request, $id)
    {
        $user = auth()->user();
        if (!$user && auth('admin')->check()) {
            $user = auth('admin')->user();
        }

        $eq = Equipment::findOrFail($id);

        if (!in_array($eq->status, ['pending_management', 'pending_accountant'])) {
            $msg = 'Tài sản không ở trạng thái chờ duyệt.';
            return request()->wantsJson() 
                ? response()->json(['success' => false, 'message' => $msg], 422)
                : back()->with('error', $msg);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $eq->update([
            'status'           => 'rejected',
            'rejection_reason' => $validated['reason'],
        ]);

        $this->syncCost($eq);

        $msg = 'Đã từ chối phiếu mua tài sản.';
        return request()->wantsJson() 
            ? response()->json(['success' => true, 'message' => $msg, 'data' => $eq])
            : back()->with('success', $msg);
    }

    /**
     * Đồng bộ trạng thái sang Cost
     */
    private function syncCost($eq)
    {
        $costStatus = match ($eq->status) {
            'pending_management' => 'pending_management_approval',
            'pending_accountant' => 'pending_accountant_approval',
            'available'          => 'approved',
            'rejected'           => 'rejected',
            default              => 'draft',
        };

        $cost = \App\Models\Cost::where('equipment_id', $eq->id)->first();

        if (!$cost && in_array($eq->status, ['pending_management', 'pending_accountant', 'available', 'rejected'])) {
            $cost = \App\Models\Cost::create([
                'equipment_id'     => $eq->id,
                'project_id'       => $eq->project_id,
                'name'             => "Mua thiết bị: " . $eq->name,
                'amount'           => ($eq->purchase_price ?: 0) * ($eq->quantity ?: 1),
                'cost_group_id'    => 3, // Thiết bị máy móc
                'cost_date'        => $eq->purchase_date ?: now(),
                'description'      => "Duyệt mua từ Hồ sơ thiết bị " . ($eq->code ? "#".$eq->code : "(ID: ".$eq->id.")"),
                'quantity'         => $eq->quantity ?: 1,
                'unit'             => $eq->unit ?: 'cái',
                'expense_category' => 'capex',
                'status'           => $costStatus,
                'created_by'       => $eq->created_by ?: 1, 
            ]);
        }

        if ($cost) {
            $updateData = ['status' => $costStatus];
            
            if (in_array($eq->status, ['pending_accountant', 'available'])) {
                $updateData['management_approved_by'] = $eq->approved_by;
                $updateData['management_approved_at'] = $eq->approved_at;
            }

            if ($eq->status === 'available') {
                $updateData['accountant_approved_by'] = $eq->confirmed_by;
                $updateData['accountant_approved_at'] = $eq->confirmed_at;
            }

            if ($eq->status === 'rejected') {
                $updateData['rejected_reason'] = $eq->rejection_reason;
            }

            $cost->update($updateData);
        }
    }
}
