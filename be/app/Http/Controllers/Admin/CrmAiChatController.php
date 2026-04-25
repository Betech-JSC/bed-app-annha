<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Cost;
use App\Models\User;
use App\Models\Subcontractor;
use App\Models\Contract;
use App\Models\ProjectPayment;
use App\Services\AiChatService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CrmAiChatController extends Controller
{
    protected AiChatService $chatService;

    public function __construct(AiChatService $chatService)
    {
        $this->chatService = $chatService;
    }

    /**
     * Handle AI chat message.
     */
    public function send(Request $request)
    {
        $request->validate([
            'message' => 'required|string|max:2000',
            'history' => 'array|max:20',
            'history.*.role' => 'required|in:user,assistant',
            'history.*.content' => 'required|string',
        ]);

        $user = Auth::guard('admin')->user();
        $context = $this->buildCrmContext($user);

        $result = $this->chatService->chat(
            $request->input('message'),
            $request->input('history', []),
            $context
        );

        return response()->json($result);
    }

    /**
     * Build CRM context data for the AI to use.
     */
    private function buildCrmContext($user): array
    {
        $context = [];

        try {
            // Project stats
            $context['projects'] = [
                'total' => Project::count(),
                'active' => Project::where('status', 'in_progress')->count(),
                'completed' => Project::where('status', 'completed')->count(),
                'planning' => Project::where('status', 'planning')->count(),
            ];

            // Finance stats
            $totalRevenue = (float) Contract::where('status', 'approved')->sum('contract_value');
            $totalCosts = (float) Cost::where('status', 'approved')->sum('amount');
            $profit = $totalRevenue - $totalCosts;

            $context['finance'] = [
                'revenue' => $totalRevenue,
                'costs' => $totalCosts,
                'profit' => $profit,
                'margin' => $totalRevenue > 0 ? round($profit / $totalRevenue * 100, 1) : 0,
                'paid_payments' => (float) ProjectPayment::where('status', 'paid')->sum('amount'),
            ];

            // HR
            $context['hr'] = [
                'total' => User::count(),
            ];

            // Pending approvals
            $context['pending'] = [
                'costs' => Cost::whereIn('status', ['pending_management_approval', 'pending_accountant_approval'])->count(),
                'costs_amount' => (float) Cost::whereIn('status', ['pending_management_approval', 'pending_accountant_approval'])->sum('amount'),
            ];

            // Subcontractor debt
            $totalDebt = 0;
            $subs = Subcontractor::select('total_quote')
                ->withSum(['payments' => fn($q) => $q->whereIn('status', ['paid', 'accountant_confirmed'])], 'amount')
                ->get();

            foreach ($subs as $sub) {
                $debt = $sub->total_quote - ($sub->payments_sum_amount ?? 0);
                if ($debt > 0) $totalDebt += $debt;
            }

            $context['debt'] = [
                'subcontractor' => $totalDebt,
            ];

        } catch (\Exception $e) {
            // Context is optional — if queries fail, AI still works without data
        }

        return $context;
    }
}
