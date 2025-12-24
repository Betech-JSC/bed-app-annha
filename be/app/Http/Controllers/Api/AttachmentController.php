<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AttachmentController extends Controller
{
    public function upload(Request $request)
    {
        $request->validate([
            'files'   => 'required|array',
            'files.*' => 'required|file|mimes:jpeg,png,jpg,gif,webp,mp4,mov,avi,webm,mpg,mpeg,pdf,doc,docx,xls,xlsx,txt,zip,rar|max:51200',
            'descriptions' => 'nullable|array', // Mảng descriptions tương ứng với files
            'descriptions.*' => 'nullable|string|max:1000',
        ]);

        $uploaded = [];
        $descriptions = $request->input('descriptions', []);

        foreach ($request->file('files') as $index => $file) {

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
                continue;
            }

            // Folder by date
            $folder = 'uploads/' . now()->format('Y/m/d');

            $extension = $file->getClientOriginalExtension() ?: 'jpg';
            $fileName = Str::random(20) . '_' . time() . Str::random(3) . '.' . $extension;

            // Save file
            $path = $file->storeAs($folder, $fileName, 'public');

            // 🔥 FULL DOMAIN URL
            $url = asset("storage/" . $path);

            // Save to DB
            $attachment = Attachment::create([
                'original_name' => $file->getClientOriginalName(),
                'description' => $descriptions[$index] ?? null,
                'type'         => $isImage ? 'image' : ($isVideo ? 'video' : 'document'),
                'file_name'    => $fileName,
                'file_path'    => $path,
                'file_url'     => $url,
                'file_size'    => $file->getSize(),
                'mime_type'    => $mime,
                'uploaded_by'  => auth()->id(),
                'sort_order'   => 0,
            ]);

            $uploaded[] = [
                'success'       => true,
                'file_url'      => $url,
                'file'          => $url,
                'location'      => $url,
                'attachment_id' => $attachment->id,
            ];
        }

        // Nếu upload nhiều file => trả về array
        return response()->json([
            'success' => true,
            'data'    => $uploaded
        ]);
    }
}
