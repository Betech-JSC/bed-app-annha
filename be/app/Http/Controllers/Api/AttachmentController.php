<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AttachmentController extends Controller
{
    public function upload(Request $request)
    {
        try {
            // Log request info
            Log::info('File upload request received', [
                'has_files' => $request->hasFile('files'),
                'files_count' => $request->hasFile('files') ? count($request->file('files')) : 0,
                'all_input_keys' => array_keys($request->all()),
            ]);

            // Check if files are present
            if (!$request->hasFile('files')) {
                Log::error('No files in request', [
                    'request_keys' => array_keys($request->all()),
                    'request_data' => $request->except(['files']),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Không có file nào được gửi lên.',
                    'errors' => ['files' => ['Vui lòng chọn ít nhất một file.']]
                ], 422);
            }

            $files = $request->file('files');

            // Ensure files is an array
            if (!is_array($files)) {
                $files = [$files];
            }

            Log::info('Files array prepared', [
                'count' => count($files),
                'file_names' => array_map(function ($file) {
                    return $file ? $file->getClientOriginalName() : 'null';
                }, $files),
            ]);

            // Validate each file
            $validatedFiles = [];
            $errors = [];

            foreach ($files as $index => $file) {
                if (!$file || !$file->isValid()) {
                    $errorMsg = $file ? 'File không hợp lệ.' : 'File không tồn tại.';
                    Log::error("File validation failed at index {$index}", [
                        'file_exists' => $file !== null,
                        'is_valid' => $file ? $file->isValid() : false,
                        'error' => $file ? $file->getError() : 'null',
                    ]);
                    $errors["files.{$index}"] = [$errorMsg];
                    continue;
                }

                // Check file size (50MB = 51200 KB)
                $maxSize = 51200 * 1024; // 50MB in bytes
                if ($file->getSize() > $maxSize) {
                    $errorMsg = 'File quá lớn. Kích thước tối đa là 50MB.';
                    Log::error("File too large at index {$index}", [
                        'file_size' => $file->getSize(),
                        'max_size' => $maxSize,
                        'file_name' => $file->getClientOriginalName(),
                    ]);
                    $errors["files.{$index}"] = [$errorMsg];
                    continue;
                }

                // Check MIME type
                $mime = $file->getMimeType();
                $allowedMimes = [
                    'image/jpeg',
                    'image/png',
                    'image/jpg',
                    'image/gif',
                    'image/webp',
                    'video/mp4',
                    'video/quicktime',
                    'video/x-msvideo',
                    'video/webm',
                    'video/mpeg',
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'text/plain',
                    'application/zip',
                    'application/x-rar-compressed',
                ];

                if (!in_array($mime, $allowedMimes)) {
                    $errorMsg = "Loại file không được hỗ trợ. Loại file: {$mime}";
                    Log::error("Invalid MIME type at index {$index}", [
                        'mime_type' => $mime,
                        'file_name' => $file->getClientOriginalName(),
                    ]);
                    $errors["files.{$index}"] = [$errorMsg];
                    continue;
                }

                $validatedFiles[$index] = $file;
            }

            if (!empty($errors)) {
                Log::error('File validation errors', ['errors' => $errors]);
                return response()->json([
                    'success' => false,
                    'message' => 'Một số file không hợp lệ.',
                    'errors' => $errors
                ], 422);
            }

            if (empty($validatedFiles)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không có file hợp lệ nào được gửi lên.',
                ], 422);
            }

            $uploaded = [];

            foreach ($validatedFiles as $index => $file) {

                try {
                    $mime = $file->getMimeType();
                    $isImage = str_starts_with($mime, 'image/');
                    $isVideo = str_starts_with($mime, 'video/');
                    $isDocument = in_array($mime, [
                        'application/pdf',
                        'application/msword',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'application/vnd.ms-excel',
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        'text/plain',
                        'application/zip',
                        'application/x-rar-compressed',
                    ]);

                    if (!$isImage && !$isVideo && !$isDocument) {
                        Log::warning("Skipping file with unsupported type", [
                            'mime' => $mime,
                            'file_name' => $file->getClientOriginalName(),
                        ]);
                        continue;
                    }

                    // Folder by date
                    $folder = 'uploads/' . now()->format('Y/m/d');

                    $extension = $file->getClientOriginalExtension() ?: 'jpg';
                    $fileName = Str::random(20) . '_' . time() . Str::random(3) . '.' . $extension;

                    Log::info("Saving file", [
                        'original_name' => $file->getClientOriginalName(),
                        'file_name' => $fileName,
                        'folder' => $folder,
                        'size' => $file->getSize(),
                        'mime' => $mime,
                    ]);

                    // Save file
                    $path = $file->storeAs($folder, $fileName, 'public');

                    if (!$path) {
                        Log::error("Failed to store file", [
                            'file_name' => $fileName,
                            'folder' => $folder,
                        ]);
                        continue;
                    }

                    // 🔥 FULL DOMAIN URL
                    $url = asset("storage/" . $path);

                    // Save to DB
                    $userId = $request->user() ? $request->user()->id : null;
                    $attachment = Attachment::create([
                        'original_name' => $file->getClientOriginalName(),
                        'type'         => $isImage ? 'image' : ($isVideo ? 'video' : 'document'),
                        'file_name'    => $fileName,
                        'file_path'    => $path,
                        'file_url'     => $url,
                        'file_size'    => $file->getSize(),
                        'mime_type'    => $mime,
                        'uploaded_by'  => $userId,
                        'sort_order'   => 0,
                    ]);

                    Log::info("File uploaded successfully", [
                        'attachment_id' => $attachment->id,
                        'file_url' => $url,
                    ]);

                    $uploaded[] = [
                        'success'       => true,
                        'file_url'      => $url,
                        'file'          => $url,
                        'location'      => $url,
                        'attachment_id' => $attachment->id,
                        'original_name' => $file->getClientOriginalName(),
                        'type' => $isImage ? 'image' : ($isVideo ? 'video' : 'document'),
                    ];
                } catch (\Exception $e) {
                    Log::error("Error processing file at index {$index}", [
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                        'file_name' => $file->getClientOriginalName(),
                    ]);
                    $errors["files.{$index}"] = ['Lỗi khi xử lý file: ' . $e->getMessage()];
                }
            }

            if (!empty($errors) && empty($uploaded)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không thể upload file.',
                    'errors' => $errors
                ], 500);
            }

            // Nếu upload nhiều file => trả về array
            Log::info('Upload completed', [
                'uploaded_count' => count($uploaded),
                'errors_count' => count($errors),
            ]);

            return response()->json([
                'success' => true,
                'data'    => $uploaded,
                'message' => count($uploaded) > 0
                    ? 'Đã upload thành công ' . count($uploaded) . ' file(s).'
                    : 'Không có file nào được upload.',
            ]);
        } catch (\Exception $e) {
            Log::error('Upload exception', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Lỗi hệ thống khi upload file: ' . $e->getMessage(),
            ], 500);
        }
    }
}
