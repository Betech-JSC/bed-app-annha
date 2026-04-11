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
}
