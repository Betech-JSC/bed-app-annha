<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attachment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Pagination\LengthAwarePaginator;

class FileController extends Controller
{
    /**
     * Danh sách files
     */
    public function index(): Response
    {
        $query = Attachment::with(['uploader', 'attachable']);

        // Filter theo type
        if (Request::has('type') && Request::get('type')) {
            $query->where('type', Request::get('type'));
        }

        // Filter theo attachable type
        if (Request::has('attachable_type') && Request::get('attachable_type')) {
            $query->where('attachable_type', Request::get('attachable_type'));
        }

        // Search
        if (Request::has('search')) {
            $search = Request::get('search');
            $query->where(function ($q) use ($search) {
                $q->where('original_name', 'like', "%{$search}%")
                    ->orWhere('file_name', 'like', "%{$search}%")
                    ->orWhereHas('uploader', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%");
                    });
            });
        }

        // Sort
        $sortBy = Request::get('sort_by', 'created_at');
        $sortOrder = Request::get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = Request::get('per_page', 20);
        $filesPaginated = $query->paginate($perPage)->appends(Request::all());

        // Transform
        $transformedFiles = $filesPaginated->items();
        foreach ($transformedFiles as $key => $file) {
            $transformedFiles[$key] = [
                'id' => $file->id,
                'original_name' => $file->original_name,
                'file_name' => $file->file_name,
                'file_url' => $file->file_url,
                'file_size' => $file->file_size,
                'mime_type' => $file->mime_type,
                'type' => $file->type,
                'uploader' => $file->uploader ? [
                    'id' => $file->uploader->id,
                    'name' => $file->uploader->name,
                ] : null,
                'attachable_type' => $file->attachable_type,
                'attachable_id' => $file->attachable_id,
                'created_at' => $file->created_at->format('Y-m-d H:i:s'),
            ];
        }

        $files = new LengthAwarePaginator(
            $transformedFiles,
            $filesPaginated->total(),
            $filesPaginated->perPage(),
            $filesPaginated->currentPage(),
            ['path' => $filesPaginated->path()]
        );
        $files->appends(Request::all());

        // Thống kê
        $stats = [
            'total' => Attachment::count(),
            'images' => Attachment::where('type', 'image')->count(),
            'videos' => Attachment::where('type', 'video')->count(),
            'documents' => Attachment::where('type', 'document')->count(),
            'total_size' => Attachment::sum('file_size'),
        ];

        return Inertia::render('Admin/Files/Index', [
            'filters' => Request::only('search', 'type', 'attachable_type', 'sort_by', 'sort_order'),
            'files' => $files,
            'stats' => $stats,
        ]);
    }

    /**
     * Upload file (for CRM web - session-based auth)
     * Returns JSON for Ant Design Upload component
     */
    public function upload(\Illuminate\Http\Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:51200', // 50MB max
        ]);

        $file = $request->file('file');
        $mime = $file->getMimeType();
        $isImage = str_starts_with($mime, 'image/');
        $isVideo = str_starts_with($mime, 'video/');

        $folder = 'uploads/' . now()->format('Y/m/d');
        $extension = $file->getClientOriginalExtension() ?: 'jpg';
        $fileName = \Illuminate\Support\Str::random(20) . '_' . time() . '.' . $extension;

        $path = $file->storeAs($folder, $fileName, 'public');
        $url = asset("storage/" . $path);

        $user = \Illuminate\Support\Facades\Auth::guard('admin')->user();

        $attachment = Attachment::create([
            'original_name' => $file->getClientOriginalName(),
            'type'         => $isImage ? 'image' : ($isVideo ? 'video' : 'document'),
            'file_name'    => $fileName,
            'file_path'    => $path,
            'file_url'     => $url,
            'file_size'    => $file->getSize(),
            'mime_type'    => $mime,
            'uploaded_by'  => $user?->id,
            'sort_order'   => 0,
        ]);

        // Return flat JSON with 'id' at root — Ant Design Upload expects this in response
        return response()->json([
            'id'            => $attachment->id,
            'file_url'      => $url,
            'original_name' => $file->getClientOriginalName(),
            'type'          => $attachment->type,
        ]);
    }

    /**
     * Xóa file
     */
    public function destroy($id): RedirectResponse
    {
        $file = Attachment::findOrFail($id);

        // Xóa file từ storage
        if ($file->file_path && Storage::disk('public')->exists($file->file_path)) {
            Storage::disk('public')->delete($file->file_path);
        }

        // Xóa record
        $file->delete();

        return redirect()->back()->with('success', 'Đã xóa file thành công');
    }

    /**
     * Download file
     */
    public function download($id)
    {
        $file = Attachment::findOrFail($id);

        if (!Storage::disk('public')->exists($file->file_path)) {
            abort(404, 'File not found');
        }

        return Storage::disk('public')->download($file->file_path, $file->original_name);
    }
}
