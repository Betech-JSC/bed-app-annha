<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payroll;
use App\Models\User;
use App\Services\PayrollCalculationService;
use App\Services\ExportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PayrollController extends Controller
{
    public function __construct(
        private PayrollCalculationService $payrollService,
        private ExportService $exportService
    ) {}

    /**
     * Danh sách bảng lương (HR only)
     */
    public function index(Request $request)
    {
        $query = Payroll::with(['user', 'approver', 'project']);

        // Filter by project
        if ($request->has('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        // Filter by user
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by period type
        if ($request->has('period_type')) {
            $query->where('period_type', $request->period_type);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by date range
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->byPeriod(
                Carbon::parse($request->start_date),
                Carbon::parse($request->end_date)
            );
        }

        $payrolls = $query->orderByDesc('period_start')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $payrolls
        ]);
    }

    /**
     * Tính lương cho user trong kỳ (HR/admin only)
     */
    public function calculate(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'period_type' => 'required|in:daily,weekly,monthly',
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
        ]);

        try {
            $user = User::findOrFail($validated['user_id']);
            $periodStart = Carbon::parse($validated['period_start']);
            $periodEnd = Carbon::parse($validated['period_end']);

            $payroll = $this->payrollService->calculatePayroll(
                $user,
                $periodStart,
                $periodEnd,
                $validated['period_type'],
                $validated['project_id'] ?? null
            );

            return response()->json([
                'success' => true,
                'message' => 'Tính lương thành công.',
                'data' => $payroll->load(['user', 'project'])
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Tính lương cho tất cả users (HR/admin only)
     */
    public function calculateAll(Request $request)
    {
        $validated = $request->validate([
            'period_type' => 'required|in:daily,weekly,monthly',
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
        ]);

        try {
            DB::beginTransaction();

            $users = User::all();
            $periodStart = Carbon::parse($validated['period_start']);
            $periodEnd = Carbon::parse($validated['period_end']);
            $calculated = [];

            foreach ($users as $user) {
                try {
            $payroll = $this->payrollService->calculatePayroll(
                $user,
                $periodStart,
                $periodEnd,
                $validated['period_type'],
                $validated['project_id'] ?? null
            );
                    $calculated[] = $payroll;
                } catch (\Exception $e) {
                    // Log error but continue
                    \Log::error("Error calculating payroll for user {$user->id}: " . $e->getMessage());
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Đã tính lương cho " . count($calculated) . " nhân viên.",
                'data' => $calculated
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
     * Chi tiết bảng lương
     */
    public function show($id)
    {
        $payroll = Payroll::with(['user', 'approver', 'project'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $payroll
        ]);
    }

    /**
     * Duyệt bảng lương (HR/admin only)
     */
    public function approve(Request $request, $id)
    {
        $user = auth()->user();
        $payroll = Payroll::findOrFail($id);

        try {
            $payroll->approve($user);

            return response()->json([
                'success' => true,
                'message' => 'Bảng lương đã được duyệt.',
                'data' => $payroll->load(['user', 'approver', 'project'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Đánh dấu đã thanh toán (HR/admin only)
     */
    public function markAsPaid($id)
    {
        $payroll = Payroll::findOrFail($id);

        if ($payroll->status !== 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Bảng lương phải được duyệt trước khi đánh dấu đã thanh toán.'
            ], 400);
        }

        try {
            $payroll->markAsPaid();

            return response()->json([
                'success' => true,
                'message' => 'Đã đánh dấu thanh toán.',
                'data' => $payroll->load(['user'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export Excel/PDF (HR/admin only)
     */
    public function export(Request $request)
    {
        $validated = $request->validate([
            'format' => 'required|in:excel,pdf',
            'user_id' => 'nullable|exists:users,id',
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date',
        ]);

        $query = Payroll::with(['user']);

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('period_start') && $request->has('period_end')) {
            $query->byPeriod(
                Carbon::parse($request->period_start),
                Carbon::parse($request->period_end)
            );
        }

        $payrolls = $query->get();
        $period = $request->period_start && $request->period_end
            ? $request->period_start . '_to_' . $request->period_end
            : 'all';

        try {
            if ($validated['format'] === 'excel') {
                $filename = $this->exportService->exportPayrollToExcel($payrolls, $period);
            } else {
                $filename = $this->exportService->exportPayrollToPDF($payrolls, $period);
            }

            return response()->json([
                'success' => true,
                'message' => 'Export thành công.',
                'filename' => $filename
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bảng lương của user hiện tại
     */
    public function myPayroll(Request $request)
    {
        $user = auth()->user();

        $query = Payroll::forUser($user->id)
            ->with(['approver']);

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $payrolls = $query->orderByDesc('period_start')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $payrolls
        ]);
    }
}
