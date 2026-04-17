<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Equipment;
use App\Models\Attachment;
use App\Constants\Permissions;
use App\Services\EquipmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CrmEquipmentController extends Controller
{
    protected $equipmentService;

    public function __construct(EquipmentService $equipmentService)
    {
        $this->equipmentService = $equipmentService;
    }
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

        try {
            $equipment = $this->equipmentService->upsert($request->all(), null, $user);

            // Handle legacy file uploads (standard form) — service handles attachment_ids
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

            return back()->with('success', 'Đã tạo tài sản (Nháp). Vui lòng gửi duyệt.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return back()->withErrors($e->errors())->withInput();
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function update(Request $request, $id)
    {
        $eq = Equipment::findOrFail($id);

        try {
            $this->equipmentService->upsert($request->all(), $eq, auth('admin')->user());

            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => true,
                    'message' => 'Đã cập nhật thiết bị.',
                    'data' => $eq->load('attachments')
                ]);
            }

            return back()->with('success', 'Đã cập nhật tài sản.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['success' => false, 'errors' => $e->errors()], 422);
            }
            return back()->withErrors($e->errors())->withInput();
        } catch (\Exception $e) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 403);
            }
            return back()->with('error', $e->getMessage());
        }
    }

    public function destroy(Request $request, $id)
    {
        $eq = Equipment::findOrFail($id);

        try {
            $this->equipmentService->delete($eq);
            return back()->with('success', 'Đã xóa tài sản.');
        } catch (\Exception $e) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 403);
            }
            return back()->with('error', $e->getMessage());
        }
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

        $this->equipmentService->syncCost($eq);

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

        $this->equipmentService->syncCost($eq);

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

        $this->equipmentService->syncCost($eq);

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

        $this->equipmentService->syncCost($eq);

        $msg = 'Đã từ chối phiếu mua tài sản.';
        return request()->wantsJson() 
            ? response()->json(['success' => true, 'message' => $msg, 'data' => $eq])
            : back()->with('success', $msg);
    }

    /**
     * Hoàn duyệt tài sản (confirmed/approved → draft)
     */
    public function revertToDraft($id)
    {
        $user = auth()->user() ?: auth('admin')->user();
        if (!$user || !$user->hasPermission(Permissions::COST_APPROVE_MANAGEMENT)) {
            return back()->with('error', 'Bạn không có quyền hoàn duyệt.');
        }

        $eq = Equipment::findOrFail($id);

        try {
            $this->equipmentService->revertToDraft($eq, $user);
            return back()->with('success', 'Đã hoàn duyệt hồ sơ tài sản về trạng thái nháp.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }
}
