<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Equipment;
use App\Models\GlobalEquipment;
use App\Models\Attachment;
use App\Models\Project;
use App\Models\Supplier;
use App\Models\EquipmentPurchase;
use App\Models\EquipmentPurchaseItem;
use App\Constants\Permissions;
use App\Services\EquipmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CrmEquipmentController extends Controller
{
    use CrmAuthorization;

    protected $equipmentService;
    protected $attachmentService;

    public function __construct(EquipmentService $equipmentService, \App\Services\AttachmentService $attachmentService)
    {
        $this->equipmentService = $equipmentService;
        $this->attachmentService = $attachmentService;
    }
    public function index(Request $request)
    {
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::EQUIPMENT_VIEW);

        $tab = $request->query('tab', 'approvals');
        $search = $request->query('search');

        if ($tab === 'catalog') {
            $query = GlobalEquipment::query();
            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('brand', 'like', "%{$search}%")
                        ->orWhere('model', 'like', "%{$search}%");
                });
            }
            $equipment = $query->orderByDesc('created_at')->paginate(20)->withQueryString();
        } else {
            if ($tab === 'approvals') {
                $query = EquipmentPurchase::with(['creator:id,name', 'approver:id,name', 'confirmer:id,name', 'project:id,name', 'supplier:id,name', 'items', 'attachments']);
                if ($search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('notes', 'like', "%{$search}%")
                            ->orWhereHas('project', function ($pq) use ($search) {
                                $pq->where('name', 'like', "%{$search}%");
                            })
                            ->orWhereHas('items', function ($iq) use ($search) {
                                $iq->where('name', 'like', "%{$search}%")
                                    ->orWhere('code', 'like', "%{$search}%");
                            });
                    });
                }
                if ($status = $request->query('status')) {
                    $query->where('status', $status);
                } else {
                    $query->whereIn('status', ['draft', 'pending_management', 'pending_accountant', 'rejected']);
                }
                $equipment = $query->orderByDesc('created_at')->paginate(20)->withQueryString();
            } else { // tab === 'assets'
                $query = Equipment::with(['creator:id,name', 'approver:id,name', 'confirmer:id,name', 'supplier:id,name', 'attachments']);
                if ($search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('code', 'like', "%{$search}%")
                            ->orWhere('serial_number', 'like', "%{$search}%");
                    });
                }
                if ($status = $request->query('status')) {
                    $query->where('status', $status);
                } else {
                    $query->whereIn('status', ['available', 'in_use', 'maintenance', 'retired']);
                }
                $equipment = $query->orderByDesc('created_at')->paginate(20)->withQueryString();
            }
        }

        $stats = [
            'total'       => Equipment::count() + EquipmentPurchase::count(),
            'draft'       => EquipmentPurchase::where('status', 'draft')->count(),
            'pending'     => EquipmentPurchase::whereIn('status', ['pending_management', 'pending_accountant'])->count(),
            'available'   => Equipment::where('status', 'available')->count(),
            'in_use'      => Equipment::where('status', 'in_use')->count(),
            'maintenance' => Equipment::where('status', 'maintenance')->count(),
        ];

        // Retrieve all global equipments to show in the dropdown for creating new equipment purchases
        $globalEquipments = GlobalEquipment::orderBy('name')->get(['id', 'name', 'code', 'category', 'brand', 'model', 'unit', 'unit_price']);

        $projects = Project::orderBy('name')->get(['id', 'name', 'code']);
        $suppliers = Supplier::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Crm/Equipment/Index', [
            'equipment' => $equipment,
            'stats'     => $stats,
            'globalEquipments' => $globalEquipments,
            'projects'  => $projects,
            'suppliers' => $suppliers,
            'filters'   => $request->only(['search', 'status', 'tab']),
        ]);
    }

    /**
     * Tạo phiếu mua thiết bị mới (draft status)
     */
    public function store(Request $request)
    {
        $user = auth('admin')->user();

        $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'supplier_id' => 'required|exists:suppliers,id',
            'purchase_date' => 'required|date',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.name' => 'required|string|max:255',
            'items.*.code' => 'nullable|string|max:50',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        $project = $request->project_id ? Project::find($request->project_id) : null;
        $this->crmRequire($user, Permissions::EQUIPMENT_CREATE, $project);

        try {
            $purchase = $this->equipmentService->upsertPurchase($request->all(), null, $user);

            // Handle file uploads
            if ($request->hasFile('attachments')) {
                foreach ($request->file('attachments') as $file) {
                    $path = $file->store('equipment-purchase-attachments', 'public');
                    $purchase->attachments()->create([
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

            return back()->with('success', 'Đã tạo phiếu mua thiết bị (Nháp). Vui lòng gửi duyệt.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return back()->withErrors($e->errors())->withInput();
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function update(Request $request, $id)
    {
        $user = auth('admin')->user();
        $tab = $request->query('tab', 'approvals');

        try {
            if ($tab === 'approvals') {
                $request->validate([
                    'project_id' => 'nullable|exists:projects,id',
                    'supplier_id' => 'required|exists:suppliers,id',
                    'purchase_date' => 'required|date',
                    'notes' => 'nullable|string',
                    'items' => 'required|array|min:1',
                    'items.*.name' => 'required|string|max:255',
                    'items.*.code' => 'nullable|string|max:50',
                    'items.*.quantity' => 'required|integer|min:1',
                    'items.*.unit_price' => 'required|numeric|min:0',
                ]);

                $purchase = EquipmentPurchase::findOrFail($id);
                $this->crmRequire($user, Permissions::EQUIPMENT_UPDATE, $purchase->project);
                $this->equipmentService->upsertPurchase($request->all(), $purchase, $user);

                // Handle file uploads (append)
                if ($request->hasFile('attachments')) {
                    foreach ($request->file('attachments') as $file) {
                        $path = $file->store('equipment-purchase-attachments', 'public');
                        $purchase->attachments()->create([
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
            } else {
                $eq = Equipment::findOrFail($id);
                $this->crmRequire($user, Permissions::EQUIPMENT_UPDATE, $eq->project);
                $this->equipmentService->upsert($request->all(), $eq, $user);

                // Handle file uploads
                if ($request->hasFile('attachments')) {
                    foreach ($request->file('attachments') as $file) {
                        $path = $file->store('equipment-attachments', 'public');
                        $eq->attachments()->create([
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
            }

            return back()->with('success', 'Đã cập nhật thành công.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return back()->withErrors($e->errors())->withInput();
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function destroy(Request $request, $id)
    {
        $user = auth('admin')->user();
        $tab = $request->query('tab', 'approvals');

        try {
            if ($tab === 'approvals') {
                $purchase = EquipmentPurchase::findOrFail($id);
                $this->crmRequire($user, Permissions::EQUIPMENT_DELETE, $purchase->project);
                if ($purchase->status !== 'draft') {
                    throw new \Exception('Chỉ có thể xóa phiếu mua ở trạng thái Nháp.');
                }
                $purchase->items()->delete();
                $purchase->delete();
            } else {
                $eq = Equipment::findOrFail($id);
                $this->crmRequire($user, Permissions::EQUIPMENT_DELETE, $eq->project);
                $this->equipmentService->delete($eq);
            }
            return back()->with('success', 'Đã xóa thành công.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    // ====================================================================
    // APPROVAL WORKFLOW: draft → pending_management → pending_accountant → completed
    // ====================================================================

    /**
     * Gửi duyệt (draft/rejected → pending_management)
     */
    public function submit($id)
    {
        $user = auth('admin')->user();
        $purchase = EquipmentPurchase::findOrFail($id);
        $this->crmRequire($user, Permissions::EQUIPMENT_CREATE, $purchase->project);

        if (!in_array($purchase->status, ['draft', 'rejected'])) {
            $msg = 'Chỉ có thể gửi duyệt khi ở trạng thái Nháp hoặc Từ chối.';
            return back()->with('error', $msg);
        }

        $purchase->update([
            'status'           => 'pending_management',
            'rejection_reason' => null,
        ]);

        return back()->with('success', 'Đã gửi duyệt phiếu mua thiết bị.');
    }

    public function approveManagement($id)
    {
        $user = auth('admin')->user();
        $purchase = EquipmentPurchase::findOrFail($id);

        $this->crmRequire($user, Permissions::COST_APPROVE_MANAGEMENT, $purchase->project);

        if ($purchase->status !== 'pending_management') {
            return back()->with('error', 'Phiếu mua thiết bị không ở trạng thái chờ Ban điều hành duyệt.');
        }

        $this->equipmentService->approvePurchaseByManagement($purchase, $user);

        return back()->with('success', 'Ban điều hành đã duyệt phiếu mua thiết bị.');
    }

    public function confirmAccountant(Request $request, $id)
    {
        $user = auth('admin')->user();
        $purchase = EquipmentPurchase::findOrFail($id);
        
        $this->crmRequire($user, Permissions::COST_APPROVE_ACCOUNTANT, $purchase->project);

        if ($purchase->status !== 'pending_accountant') {
            return back()->with('error', 'Phiếu mua thiết bị không ở trạng thái chờ Kế toán xác nhận.');
        }

        try {
            // Handle file uploads (must have files)
            if (!$request->hasFile('files') && $purchase->attachments()->count() === 0) {
                return back()->with('error', 'Bắt buộc phải có ít nhất một chứng từ trước khi Kế toán duyệt.');
            }

            if ($request->hasFile('files')) {
                foreach ($request->file('files') as $file) {
                    $path = $file->store('equipment-purchase-attachments', 'public');
                    $purchase->attachments()->create([
                        'file_path'     => $path,
                        'file_name'     => $file->getClientOriginalName(),
                        'original_name' => $file->getClientOriginalName(),
                        'file_url'      => '/storage/' . $path,
                        'mime_type'     => $file->getClientMimeType(),
                        'file_size'     => $file->getSize(),
                        'description'   => 'after', // accountant proof
                        'type'          => $file->getClientOriginalExtension(),
                        'uploaded_by'   => $user->id ?? null,
                    ]);
                }
            }

            $this->equipmentService->confirmPurchaseByAccountant($purchase, $user);

            return back()->with('success', 'Kế toán xác nhận và nhập kho thiết bị thành công.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function reject(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $user = auth('admin')->user();
        $purchase = EquipmentPurchase::findOrFail($id);

        // Can reject if they can approve at current stage
        if ($purchase->status === 'pending_management') {
            $this->crmRequire($user, Permissions::COST_APPROVE_MANAGEMENT, $purchase->project);
        } else {
            $this->crmRequire($user, Permissions::COST_APPROVE_ACCOUNTANT, $purchase->project);
        }

        $this->equipmentService->rejectPurchase($purchase, $request->reason, $user);

        return back()->with('success', 'Đã từ chối phiếu mua thiết bị.');
    }

    public function revertToDraft($id)
    {
        $user = auth('admin')->user();
        $purchase = EquipmentPurchase::findOrFail($id);

        $this->crmRequire($user, Permissions::EQUIPMENT_REVERT, $purchase->project);

        $purchase->update([
            'status' => 'draft',
            'rejection_reason' => null,
        ]);

        return back()->with('success', 'Đã hoàn duyệt phiếu mua thiết bị về Nháp.');
    }
}
