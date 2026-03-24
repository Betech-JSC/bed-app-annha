<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attachment;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class CrmFilesController extends Controller
{
    /**
     * Centralized file management — aggregates all attachments across the system
     */
    public function index(Request $request)
    {
        $query = Attachment::with('uploader:id,name,email')
            ->orderByDesc('created_at');

        // Filter by type (image, document, video, other)
        if ($fileType = $request->get('file_type')) {
            $mimeMap = [
                'image' => 'image/%',
                'document' => ['application/pdf', 'application/msword', 'application/vnd.openxmlformats%', 'text/%', 'application/vnd.ms-excel%'],
                'video' => 'video/%',
                'audio' => 'audio/%',
            ];

            if ($fileType === 'document') {
                $query->where(function ($q) {
                    $q->where('mime_type', 'like', 'application/pdf')
                      ->orWhere('mime_type', 'like', 'application/msword')
                      ->orWhere('mime_type', 'like', 'application/vnd.openxmlformats%')
                      ->orWhere('mime_type', 'like', 'text/%')
                      ->orWhere('mime_type', 'like', 'application/vnd.ms-excel%')
                      ->orWhere('mime_type', 'like', 'application/vnd.ms-powerpoint%');
                });
            } elseif (isset($mimeMap[$fileType])) {
                $query->where('mime_type', 'like', $mimeMap[$fileType]);
            }
        }

        // Filter by source model
        if ($source = $request->get('source')) {
            $modelMap = [
                'project' => 'App\\Models\\Project',
                'cost' => 'App\\Models\\Cost',
                'contract' => 'App\\Models\\Contract',
                'invoice' => 'App\\Models\\Invoice',
                'subcontractor' => 'App\\Models\\Subcontractor',
                'defect' => 'App\\Models\\Defect',
                'log' => 'App\\Models\\ConstructionLog',
                'payment' => 'App\\Models\\ProjectPayment',
                'acceptance' => 'App\\Models\\AcceptanceStage',
                'additional_cost' => 'App\\Models\\AdditionalCost',
            ];
            if (isset($modelMap[$source])) {
                $query->where('attachable_type', $modelMap[$source]);
            }
        }

        // Search by filename
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('original_name', 'like', "%{$search}%")
                  ->orWhere('file_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Filter by uploader
        if ($uploaderId = $request->get('uploaded_by')) {
            $query->where('uploaded_by', $uploaderId);
        }

        $files = $query->paginate(24)->withQueryString();

        // Enrich files with source info
        $files->getCollection()->transform(function ($file) {
            $file->source_label = $this->getSourceLabel($file->attachable_type);
            $file->source_name = $this->getSourceName($file);
            $file->file_type_icon = $this->getFileTypeIcon($file->mime_type);
            $file->human_size = $this->humanFileSize($file->file_size);
            return $file;
        });

        // Stats
        $totalFiles = Attachment::count();
        $totalSize = Attachment::sum('file_size') ?: 0;
        $imageCount = Attachment::where('mime_type', 'like', 'image/%')->count();
        $docCount = Attachment::where(function ($q) {
            $q->where('mime_type', 'like', 'application/pdf')
              ->orWhere('mime_type', 'like', 'application/msword')
              ->orWhere('mime_type', 'like', 'application/vnd.openxmlformats%')
              ->orWhere('mime_type', 'like', 'text/%');
        })->count();

        // Chart: Files by source
        $filesBySource = Attachment::selectRaw('attachable_type, COUNT(*) as cnt')
            ->groupBy('attachable_type')
            ->orderByDesc('cnt')
            ->get()
            ->map(fn($r) => [
                'label' => $this->getSourceLabel($r->attachable_type),
                'count' => $r->cnt,
            ]);

        // Chart: Files by type (mime category)
        $filesByType = Attachment::selectRaw("
            CASE 
                WHEN mime_type LIKE 'image/%' THEN 'Hình ảnh'
                WHEN mime_type LIKE 'video/%' THEN 'Video'
                WHEN mime_type LIKE 'audio/%' THEN 'Âm thanh'
                WHEN mime_type LIKE 'application/pdf' THEN 'PDF'
                WHEN mime_type LIKE 'application/vnd.openxmlformats%' THEN 'Office'
                WHEN mime_type LIKE 'application/msword' THEN 'Office'
                WHEN mime_type LIKE 'application/vnd.ms-excel%' THEN 'Excel'
                ELSE 'Khác'
            END as type_label,
            COUNT(*) as cnt,
            SUM(file_size) as total_size
        ")
        ->groupBy('type_label')
        ->orderByDesc('cnt')
        ->get();

        // Chart: Upload trend (6 months)
        $uploadTrend = [];
        $uploadLabels = [];
        $now = now();
        for ($i = 5; $i >= 0; $i--) {
            $month = $now->copy()->subMonths($i);
            $uploadLabels[] = 'T' . $month->format('m');
            $uploadTrend[] = Attachment::whereBetween('created_at', [
                $month->copy()->startOfMonth(),
                $month->copy()->endOfMonth(),
            ])->count();
        }

        // Users for filter
        $uploaders = User::select('id', 'name')
            ->whereIn('id', Attachment::select('uploaded_by')->distinct())
            ->orderBy('name')
            ->get();

        return Inertia::render('Crm/Files/Index', [
            'files' => $files,
            'stats' => [
                'totalFiles' => $totalFiles,
                'totalSize' => $this->humanFileSize($totalSize),
                'totalSizeRaw' => $totalSize,
                'imageCount' => $imageCount,
                'docCount' => $docCount,
            ],
            'charts' => [
                'bySource' => [
                    'labels' => $filesBySource->pluck('label')->toArray(),
                    'data' => $filesBySource->pluck('count')->toArray(),
                ],
                'byType' => [
                    'labels' => $filesByType->pluck('type_label')->toArray(),
                    'data' => $filesByType->pluck('cnt')->toArray(),
                    'sizes' => $filesByType->pluck('total_size')->map(fn($s) => $this->humanFileSize($s))->toArray(),
                ],
                'uploadTrend' => [
                    'labels' => $uploadLabels,
                    'data' => $uploadTrend,
                ],
            ],
            'uploaders' => $uploaders,
            'filters' => [
                'search' => $request->get('search', ''),
                'file_type' => $request->get('file_type', ''),
                'source' => $request->get('source', ''),
                'uploaded_by' => $request->get('uploaded_by', ''),
            ],
        ]);
    }

    /**
     * Delete a file
     */
    public function destroy($id)
    {
        $file = Attachment::findOrFail($id);

        // Delete from storage
        if ($file->file_path && Storage::exists($file->file_path)) {
            Storage::delete($file->file_path);
        }

        $file->delete();

        return redirect()->back()->with('success', 'Đã xóa file thành công.');
    }

    /**
     * Bulk delete
     */
    public function bulkDestroy(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:attachments,id',
        ]);

        $files = Attachment::whereIn('id', $validated['ids'])->get();
        foreach ($files as $file) {
            if ($file->file_path && Storage::exists($file->file_path)) {
                Storage::delete($file->file_path);
            }
            $file->delete();
        }

        return redirect()->back()->with('success', 'Đã xóa ' . count($validated['ids']) . ' file.');
    }

    /**
     * Download file
     */
    public function download($id)
    {
        $file = Attachment::findOrFail($id);

        if ($file->file_path && Storage::exists($file->file_path)) {
            return Storage::download($file->file_path, $file->original_name);
        }

        if ($file->file_url) {
            return redirect($file->file_url);
        }

        return back()->with('error', 'File không tồn tại.');
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private function getSourceLabel(?string $type): string
    {
        $map = [
            'App\\Models\\Project' => 'Dự án',
            'App\\Models\\Cost' => 'Chi phí',
            'App\\Models\\Contract' => 'Hợp đồng',
            'App\\Models\\Invoice' => 'Hóa đơn',
            'App\\Models\\Subcontractor' => 'Nhà thầu phụ',
            'App\\Models\\Defect' => 'Lỗi/Sửa chữa',
            'App\\Models\\ConstructionLog' => 'Nhật ký',
            'App\\Models\\ProjectPayment' => 'Thanh toán',
            'App\\Models\\AcceptanceStage' => 'Nghiệm thu',
            'App\\Models\\AcceptanceItem' => 'Nghiệm thu',
            'App\\Models\\AdditionalCost' => 'Chi phí PS',
            'App\\Models\\SubcontractorContract' => 'HĐ NTP',
            'App\\Models\\SupplierContract' => 'HĐ NCC',
            'App\\Models\\InputInvoice' => 'HĐ đầu vào',
            'App\\Models\\Supplier' => 'Nhà cung cấp',
        ];
        return $map[$type] ?? 'Khác';
    }

    private function getSourceName(Attachment $file): string
    {
        if (!$file->attachable_type || !$file->attachable_id) return '—';

        try {
            $model = $file->attachable;
            if (!$model) return '—';
            return $model->name ?? $model->title ?? $model->description ?? "#{$file->attachable_id}";
        } catch (\Exception $e) {
            return "#{$file->attachable_id}";
        }
    }

    private function getFileTypeIcon(?string $mimeType): string
    {
        if (!$mimeType) return 'file';
        if (str_starts_with($mimeType, 'image/')) return 'image';
        if (str_starts_with($mimeType, 'video/')) return 'video';
        if (str_starts_with($mimeType, 'audio/')) return 'audio';
        if (str_contains($mimeType, 'pdf')) return 'pdf';
        if (str_contains($mimeType, 'spreadsheet') || str_contains($mimeType, 'excel')) return 'excel';
        if (str_contains($mimeType, 'word') || str_contains($mimeType, 'document')) return 'word';
        if (str_contains($mimeType, 'presentation') || str_contains($mimeType, 'powerpoint')) return 'ppt';
        return 'file';
    }

    private function humanFileSize(?int $bytes): string
    {
        if (!$bytes) return '0 B';
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $i = floor(log($bytes, 1024));
        return round($bytes / pow(1024, $i), 1) . ' ' . $units[$i];
    }
}
