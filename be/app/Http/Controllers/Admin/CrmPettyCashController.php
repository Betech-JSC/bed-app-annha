<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PettyCashTransaction;
use App\Models\Project;
use App\Models\User;
use App\Constants\Permissions;
use App\Exports\PettyCashTransactionsExport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class CrmPettyCashController extends Controller
{
    use CrmAuthorization;

    public function index(Request $request)
    {
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::OPERATIONS_DASHBOARD_VIEW);

        $query = PettyCashTransaction::with(['project:id,name,code', 'user:id,name,email', 'creator:id,name', 'approver:id,name']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhere('payer_receiver_name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('project', function ($pq) use ($search) {
                        $pq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        if ($projectId = $request->query('project_id')) {
            $query->where('project_id', $projectId);
        }

        if ($dateFrom = $request->query('date_from')) {
            $query->whereDate('transaction_date', '>=', $dateFrom);
        }

        if ($dateTo = $request->query('date_to')) {
            $query->whereDate('transaction_date', '<=', $dateTo);
        }

        $transactions = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        // Calculate Stats
        $completedInflow = (float) PettyCashTransaction::where('type', 'inflow')->where('status', 'completed')->sum('amount');
        $completedOutflow = (float) PettyCashTransaction::where('type', 'outflow')->where('status', 'completed')->sum('amount');
        $currentBalance = $completedInflow - $completedOutflow;
        $pendingCount = PettyCashTransaction::whereIn('status', ['draft', 'pending_approval'])->count();

        $stats = [
            'current_balance' => $currentBalance,
            'total_inflow'    => $completedInflow,
            'total_outflow'   => $completedOutflow,
            'pending_count'   => $pendingCount,
        ];

        $projects = Project::select('id', 'name', 'code')->orderBy('name')->get();
        $users = User::select('id', 'name', 'email')->orderBy('name')->get();

        return Inertia::render('Crm/PettyCash/Index', [
            'transactions' => $transactions,
            'stats'        => $stats,
            'projects'     => $projects,
            'users'        => $users,
            'filters'      => $request->only(['search', 'type', 'status', 'category', 'project_id', 'date_from', 'date_to']),
        ]);
    }

    public function store(Request $request)
    {
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::OPERATIONS_DASHBOARD_VIEW);

        $validated = $request->validate([
            'type'                => 'required|in:inflow,outflow',
            'category'            => 'required|string|max:100',
            'amount'              => 'required|numeric|min:1',
            'transaction_date'    => 'required|date',
            'project_id'          => 'nullable|exists:projects,id',
            'user_id'             => 'nullable|exists:users,id',
            'payer_receiver_name' => 'nullable|string|max:255',
            'description'         => 'required|string|max:1000',
        ]);

        // Generate Code: PT-2026-001 (Thu) or PC-2026-001 (Chi)
        $prefix = $validated['type'] === 'inflow' ? 'PT' : 'PC';
        $year = now()->format('Y');
        $count = PettyCashTransaction::whereYear('created_at', $year)->where('type', $validated['type'])->count() + 1;
        $code = sprintf('%s-%s-%04d', $prefix, $year, $count);

        $transaction = PettyCashTransaction::create([
            'code'                => $code,
            'type'                => $validated['type'],
            'category'            => $validated['category'],
            'amount'              => $validated['amount'],
            'transaction_date'    => $validated['transaction_date'],
            'project_id'          => $validated['project_id'] ?? null,
            'user_id'             => $validated['user_id'] ?? null,
            'payer_receiver_name' => $validated['payer_receiver_name'] ?? null,
            'description'         => $validated['description'],
            'status'              => 'pending_approval',
            'created_by'          => $user->id,
        ]);

        return redirect()->back()->with('success', 'Đã lập phiếu ' . ($transaction->type === 'inflow' ? 'thu' : 'chi') . ' tiền mặt (' . $code . ').');
    }

    public function update(Request $request, $id)
    {
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::OPERATIONS_DASHBOARD_VIEW);

        $transaction = PettyCashTransaction::findOrFail($id);

        $validated = $request->validate([
            'category'            => 'required|string|max:100',
            'amount'              => 'required|numeric|min:1',
            'transaction_date'    => 'required|date',
            'project_id'          => 'nullable|exists:projects,id',
            'user_id'             => 'nullable|exists:users,id',
            'payer_receiver_name' => 'nullable|string|max:255',
            'description'         => 'required|string|max:1000',
        ]);

        $transaction->update($validated);

        return redirect()->back()->with('success', 'Đã cập nhật phiếu ' . $transaction->code);
    }

    public function approve(Request $request, $id)
    {
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::OPERATIONS_DASHBOARD_VIEW);

        $transaction = PettyCashTransaction::findOrFail($id);

        $transaction->update([
            'status'      => 'completed',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Đã xác nhận & duyệt phiếu ' . $transaction->code . '. Quỹ tiền mặt đã được cập nhật.');
    }

    public function reject(Request $request, $id)
    {
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::OPERATIONS_DASHBOARD_VIEW);

        $transaction = PettyCashTransaction::findOrFail($id);
        $reason = $request->input('rejection_reason', 'Từ chối duyệt phiếu');

        $transaction->update([
            'status'           => 'rejected',
            'approved_by'      => $user->id,
            'rejection_reason' => $reason,
        ]);

        return redirect()->back()->with('success', 'Đã từ chối phiếu ' . $transaction->code);
    }

    public function destroy($id)
    {
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::OPERATIONS_DASHBOARD_VIEW);

        $transaction = PettyCashTransaction::findOrFail($id);
        $transaction->delete();

        return redirect()->back()->with('success', 'Đã xóa phiếu ' . $transaction->code);
    }

    public function export(Request $request)
    {
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::OPERATIONS_DASHBOARD_VIEW);

        $query = PettyCashTransaction::with(['project:id,name', 'user:id,name', 'creator:id,name', 'approver:id,name']);

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $transactions = $query->orderByDesc('created_at')->get();

        return Excel::download(new PettyCashTransactionsExport($transactions), 'So_Quy_Tien_Mat_' . now()->format('Ymd_His') . '.xlsx');
    }
}
