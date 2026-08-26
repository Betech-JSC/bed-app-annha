<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Constants\Permissions;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;

class CrmSupplierController extends Controller
{
    use CrmAuthorization;
    public function index(Request $request)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::SUPPLIER_VIEW);

        // Self-heal: recalculate financials for all suppliers to ensure correct stats and columns
        Supplier::all()->each(function ($supplier) {
            $supplier->recalculateFinancials();
        });

        $query = Supplier::withCount(['contracts', 'acceptances'])->orderByDesc('created_at');

        // Filters
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('category', 'like', "%{$search}%")
                  ->orWhere('contact_person', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        if ($category = $request->get('category')) {
            $query->where('category', $category);
        }

        $suppliers = $query->paginate(20)->withQueryString();

        // Stats
        $stats = [
            'totalSuppliers' => Supplier::count(),
            'totalDebt' => Supplier::sum('total_debt') ?: 0,
            'totalPaid' => Supplier::sum('total_paid') ?: 0,
            'activeSuppliers' => Supplier::where('status', 'active')->count(),
        ];

        // Categories for filter
        $categories = Supplier::whereNotNull('category')->distinct()->pluck('category');

        return Inertia::render('Crm/Suppliers/Index', [
            'suppliers' => $suppliers,
            'stats' => $stats,
            'categories' => $categories,
            'filters' => [
                'search' => $request->get('search', ''),
                'status' => $request->get('status', 'active'),
                'category' => $request->get('category', ''),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::SUPPLIER_CREATE);
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:suppliers,code',
            'category' => 'nullable|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
            'tax_code' => 'nullable|string|max:50',
            'bank_name' => 'nullable|string|max:255',
            'bank_account' => 'nullable|string|max:50',
            'bank_account_holder' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            'status' => 'required|in:active,inactive',
        ]);

        // Auto-generate code if not provided
        if (empty($validated['code'])) {
            $lastSupplier = Supplier::where('code', 'like', 'NCC-%')->orderByRaw("CAST(SUBSTRING(code, 5) AS UNSIGNED) DESC")->first();
            $nextNumber = $lastSupplier ? ((int) substr($lastSupplier->code, 4)) + 1 : 1;
            $validated['code'] = 'NCC-' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
        }

        Supplier::create([
            ...$validated,
            'uuid' => (string) Str::uuid(),
            'total_debt' => 0,
            'total_paid' => 0,
        ]);

        return redirect()->back()->with('success', 'Đã thêm nhà cung cấp.');
    }

    public function update(Request $request, $id)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::SUPPLIER_UPDATE);
        $supplier = Supplier::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:suppliers,code,' . $id,
            'category' => 'nullable|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
            'tax_code' => 'nullable|string|max:50',
            'bank_name' => 'nullable|string|max:255',
            'bank_account' => 'nullable|string|max:50',
            'bank_account_holder' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            'status' => 'required|in:active,inactive',
        ]);

        $supplier->update($validated);

        return redirect()->back()->with('success', 'Đã cập nhật nhà cung cấp.');
    }

    public function destroy($id)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::SUPPLIER_DELETE);
        $supplier = Supplier::findOrFail($id);

        // Optional: check if supplier has contracts/acceptances before deleting
        if ($supplier->contracts()->exists() || $supplier->acceptances()->exists()) {
            return redirect()->back()->with('error', 'Không thể xóa nhà cung cấp đã có hợp đồng hoặc nghiệm thu.');
        }

        $supplier->delete();

        return redirect()->back()->with('success', 'Đã xóa nhà cung cấp.');
    }

    /**
     * Get supplier payment history and project breakdown
     */
    public function history($id)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::SUPPLIER_VIEW);

        $supplier = Supplier::findOrFail($id);
        $supplier->recalculateFinancials();

        // Fetch all costs linked to this supplier
        $costs = \App\Models\Cost::where('supplier_id', $id)
            ->with(['project:id,name,code', 'creator:id,name', 'attachments'])
            ->orderByDesc('cost_date')
            ->orderByDesc('created_at')
            ->get();

        // Project summary calculation (group costs per project)
        $projectGroups = $costs->groupBy(function ($cost) {
            return $cost->project ? $cost->project->name : 'Chi phí công ty';
        });

        $projectSummaries = [];
        foreach ($projectGroups as $projectName => $groupCosts) {
            $projectSummaries[] = [
                'project_name' => $projectName,
                'project_code' => $groupCosts->first()->project->code ?? 'COMPANY',
                'is_company' => !$groupCosts->first()->project_id,
                'count' => $groupCosts->count(),
                'total_amount' => (float) $groupCosts->sum('amount'),
                'approved_amount' => (float) $groupCosts->where('status', 'approved')->sum('amount'),
                'pending_amount' => (float) $groupCosts->whereIn('status', ['pending_management_approval', 'pending_accountant_approval'])->sum('amount'),
            ];
        }

        // Sort project summaries by total_amount DESC
        usort($projectSummaries, fn($a, $b) => $b['total_amount'] <=> $a['total_amount']);

        return response()->json([
            'supplier' => [
                'id' => $supplier->id,
                'name' => $supplier->name,
                'code' => $supplier->code,
                'phone' => $supplier->phone,
                'email' => $supplier->email,
                'contact_person' => $supplier->contact_person,
                'category' => $supplier->category,
                'total_debt' => (float) $supplier->total_debt,
                'total_paid' => (float) $supplier->total_paid,
                'remaining_debt' => (float) $supplier->remaining_debt,
            ],
            'costs' => $costs->map(function ($c) {
                return [
                    'id' => $c->id,
                    'name' => $c->name,
                    'amount' => (float) $c->amount,
                    'cost_date' => $c->cost_date ? $c->cost_date->format('Y-m-d') : null,
                    'created_at' => $c->created_at ? $c->created_at->format('Y-m-d H:i:s') : null,
                    'status' => $c->status,
                    'description' => $c->description,
                    'expense_category' => $c->expense_category,
                    'project' => $c->project ? [
                        'id' => $c->project->id,
                        'name' => $c->project->name,
                        'code' => $c->project->code,
                    ] : null,
                    'creator' => $c->creator ? [
                        'id' => $c->creator->id,
                        'name' => $c->creator->name,
                    ] : null,
                    'attachments' => $c->attachments->map(fn($a) => [
                        'id' => $a->id,
                        'original_name' => $a->original_name,
                        'file_name' => $a->file_name,
                        'file_url' => $a->file_url,
                        'file_size' => $a->file_size,
                        'mime_type' => $a->mime_type,
                        'type' => $a->type,
                        'description' => $a->description,
                    ]),
                ];
            }),
            'project_summaries' => $projectSummaries,
            'grand_total' => (float) $costs->sum('amount'),
            'grand_approved' => (float) $costs->where('status', 'approved')->sum('amount'),
        ]);
    }
}
