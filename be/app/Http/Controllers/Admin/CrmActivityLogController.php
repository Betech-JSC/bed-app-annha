<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Project;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Response;

class CrmActivityLogController extends Controller
{
    protected ActivityLogService $logService;

    public function __construct(ActivityLogService $logService)
    {
        $this->logService = $logService;
    }

    /**
     * Index page listing audit trail & activity logs
     */
    public function index(Request $request)
    {
        $filters = [
            'search' => $request->input('search', ''),
            'action' => $request->input('action', ''),
            'subject_type' => $request->input('subject_type', ''),
            'project_id' => $request->input('project_id', ''),
            'user_id' => $request->input('user_id', ''),
            'date_from' => $request->input('date_from', ''),
            'date_to' => $request->input('date_to', ''),
        ];

        $logs = $this->logService->getFilteredLogs($filters, 20);

        // Stats cards
        $stats = [
            'total_today' => ActivityLog::whereDate('created_at', now()->today())->count(),
            'total_deletions' => ActivityLog::whereIn('action', ['deleted', 'force_deleted'])->count(),
            'total_updates' => ActivityLog::where('action', 'updated')->count(),
            'total_approvals' => ActivityLog::whereIn('action', ['approved', 'rejected'])->count(),
        ];

        // Lists for filters dropdowns
        $projects = Project::select('id', 'name', 'code')->orderBy('name')->get();
        $users = User::select('id', 'name', 'email')->orderBy('name')->get();
        $modelLabels = ActivityLogService::$modelLabels;
        $actionLabels = ActivityLogService::$actionLabels;

        return Inertia::render('Crm/ActivityLogs/Index', [
            'logs' => $logs,
            'stats' => $stats,
            'filters' => $filters,
            'projects' => $projects,
            'users' => $users,
            'modelLabels' => $modelLabels,
            'actionLabels' => $actionLabels,
        ]);
    }

    /**
     * Get details for single log item
     */
    public function show($id)
    {
        $log = ActivityLog::with(['user', 'project'])->findOrFail($id);
        return response()->json([
            'success' => true,
            'log' => $log,
        ]);
    }

    /**
     * List soft-deleted records for audit & restore
     */
    public function deletedRecords(Request $request)
    {
        $type = $request->input('type', 'Cost');

        $modelClasses = [
            'Cost' => \App\Models\Cost::class,
            'MaterialBill' => \App\Models\MaterialBill::class,
            'EquipmentRental' => \App\Models\EquipmentRental::class,
            'SubcontractorPayment' => \App\Models\SubcontractorPayment::class,
            'Contract' => \App\Models\Contract::class,
            'Project' => \App\Models\Project::class,
        ];

        $targetClass = $modelClasses[$type] ?? \App\Models\Cost::class;

        $query = $targetClass::onlyTrashed()->with(['project:id,name,code'])->latest('deleted_at');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('id', 'like', "%{$search}%");
                if (method_exists($targetClass, 'getCodeColumn')) {
                    $q->orWhere((new $targetClass)->getCodeColumn(), 'like', "%{$search}%");
                }
            });
        }

        $records = $query->paginate(15);

        return response()->json([
            'success' => true,
            'records' => $records,
            'type' => $type,
        ]);
    }

    /**
     * Restore a soft-deleted record
     */
    public function restoreRecord(Request $request)
    {
        $request->validate([
            'model_type' => 'required|string',
            'id' => 'required|integer',
        ]);

        $typeMap = [
            'Cost' => \App\Models\Cost::class,
            'MaterialBill' => \App\Models\MaterialBill::class,
            'EquipmentRental' => \App\Models\EquipmentRental::class,
            'SubcontractorPayment' => \App\Models\SubcontractorPayment::class,
            'Contract' => \App\Models\Contract::class,
            'Project' => \App\Models\Project::class,
        ];

        $modelClass = $typeMap[$request->input('model_type')] ?? null;

        if (!$modelClass) {
            return redirect()->back()->with('error', 'Loại dữ liệu không hợp lệ');
        }

        $record = $modelClass::onlyTrashed()->find($request->input('id'));

        if (!$record) {
            return redirect()->back()->with('error', 'Không tìm thấy bản ghi đã xóa');
        }

        $record->restore();

        // ActivityLog automatically fired via Auditable restored event
        return redirect()->back()->with('success', "Đã khôi phục bản ghi #{$record->id} thành công!");
    }

    /**
     * Export Activity Logs to CSV
     */
    public function export(Request $request)
    {
        $filters = $request->only(['search', 'action', 'subject_type', 'project_id', 'user_id', 'date_from', 'date_to']);
        $logs = ActivityLog::with(['user', 'project'])->latest()->get();

        $filename = "nhat_ky_thao_tac_" . date('Y-m-d_H-i-s') . ".csv";

        $headers = [
            "Content-type" => "text/csv; charset=UTF-8",
            "Content-Disposition" => "attachment; filename={$filename}",
            "Pragma" => "no-cache",
            "Cache-Control" => "must-revalidate, post-check=0, pre-check=0",
            "Expires" => "0"
        ];

        $callback = function () use ($logs) {
            $file = fopen('php://output', 'w');
            // UTF-8 BOM for Excel
            fputs($file, "\xEF\xBB\xBF");
            fputcsv($file, ['ID', 'Thời gian', 'Người thực hiện', 'Hành động', 'Đối tượng', 'Mã bản ghi', 'Dự án', 'Mô tả', 'IP']);

            foreach ($logs as $log) {
                fputcsv($file, [
                    $log->id,
                    $log->created_at->format('d/m/Y H:i:s'),
                    $log->user_name ?? ($log->user?->name ?? 'N/A'),
                    ActivityLogService::$actionLabels[$log->action] ?? $log->action,
                    ActivityLogService::$modelLabels[$log->subject_type] ?? class_basename($log->subject_type),
                    $log->subject_code ?? $log->subject_id,
                    $log->project?->name ?? 'N/A',
                    $log->description,
                    $log->ip_address,
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
