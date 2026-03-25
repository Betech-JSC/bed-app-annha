<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Inertia\Inertia;

class CrmSystemLogController extends Controller
{
    /**
     * Log viewer page — reads Laravel log file with filtering and pagination
     */
    public function index(Request $request)
    {
        $logPath = storage_path('logs/laravel.log');
        $entries = [];
        $stats = [
            'total' => 0,
            'error' => 0,
            'warning' => 0,
            'info' => 0,
            'debug' => 0,
            'critical' => 0,
            'fileSize' => 0,
            'lastModified' => null,
        ];

        if (File::exists($logPath)) {
            $stats['fileSize'] = $this->formatBytes(File::size($logPath));
            $stats['lastModified'] = date('d/m/Y H:i:s', File::lastModified($logPath));

            // Read last N lines efficiently (tail approach)
            $maxLines = 2000; // Read last 2000 lines max for performance
            $rawLines = $this->tailFile($logPath, $maxLines);

            // Parse log entries
            $entries = $this->parseLogEntries($rawLines);

            // Count stats
            foreach ($entries as $entry) {
                $stats['total']++;
                $level = strtolower($entry['level']);
                if (isset($stats[$level])) {
                    $stats[$level]++;
                }
            }

            // Apply filters
            $levelFilter = $request->input('level');
            $searchFilter = $request->input('search');
            $dateFilter = $request->input('date');

            if ($levelFilter) {
                $entries = array_filter($entries, fn($e) => strtolower($e['level']) === strtolower($levelFilter));
            }

            if ($searchFilter) {
                $entries = array_filter($entries, fn($e) =>
                    stripos($e['message'], $searchFilter) !== false ||
                    stripos($e['context'] ?? '', $searchFilter) !== false
                );
            }

            if ($dateFilter) {
                $entries = array_filter($entries, fn($e) =>
                    str_starts_with($e['datetime'], $dateFilter)
                );
            }

            $entries = array_values($entries);

            // Sort: newest first
            $entries = array_reverse($entries);

            // Paginate
            $page = max(1, (int) $request->input('page', 1));
            $perPage = 50;
            $total = count($entries);
            $entries = array_slice($entries, ($page - 1) * $perPage, $perPage);
        }

        return Inertia::render('Crm/SystemLogs/Index', [
            'entries' => $entries,
            'stats' => $stats,
            'filters' => [
                'level' => $request->input('level', ''),
                'search' => $request->input('search', ''),
                'date' => $request->input('date', ''),
            ],
            'pagination' => [
                'current_page' => $page ?? 1,
                'per_page' => $perPage ?? 50,
                'total' => $total ?? 0,
                'last_page' => $total ? ceil($total / ($perPage ?? 50)) : 1,
            ],
        ]);
    }

    /**
     * Clear the log file
     */
    public function clear()
    {
        $logPath = storage_path('logs/laravel.log');
        if (File::exists($logPath)) {
            File::put($logPath, '');
        }

        return redirect()->back()->with('success', 'Log file đã được xóa sạch');
    }

    /**
     * Download the raw log file
     */
    public function download()
    {
        $logPath = storage_path('logs/laravel.log');
        if (!File::exists($logPath)) {
            return redirect()->back()->with('error', 'Không tìm thấy file log');
        }

        return response()->download($logPath, 'laravel-' . date('Y-m-d-His') . '.log');
    }

    // ================================
    // PRIVATE HELPERS
    // ================================

    /**
     * Read last N lines from file efficiently
     */
    private function tailFile(string $path, int $lines): array
    {
        $file = new \SplFileObject($path, 'r');
        $file->seek(PHP_INT_MAX);
        $totalLines = $file->key();

        $start = max(0, $totalLines - $lines);
        $result = [];

        $file->seek($start);
        while (!$file->eof()) {
            $line = $file->current();
            if (trim($line) !== '') {
                $result[] = rtrim($line);
            }
            $file->next();
        }

        return $result;
    }

    /**
     * Parse raw log lines into structured entries
     */
    private function parseLogEntries(array $lines): array
    {
        $entries = [];
        $current = null;

        // Pattern: [2026-03-24 22:45:31] local.ERROR: message
        $pattern = '/^\[(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\]\s+\w+\.(\w+):\s(.*)$/';

        foreach ($lines as $line) {
            if (preg_match($pattern, $line, $matches)) {
                // Save previous entry
                if ($current) {
                    $entries[] = $current;
                }

                $current = [
                    'datetime' => $matches[1],
                    'level' => strtoupper($matches[2]),
                    'message' => $matches[3],
                    'context' => '',
                ];
            } elseif ($current) {
                // Append stack trace / context to current entry
                $current['context'] .= ($current['context'] ? "\n" : '') . $line;
            }
        }

        // Don't forget the last entry
        if ($current) {
            $entries[] = $current;
        }

        // Truncate long context/message for performance
        foreach ($entries as &$entry) {
            if (strlen($entry['message']) > 500) {
                $entry['message'] = substr($entry['message'], 0, 500) . '...';
            }
            if (strlen($entry['context']) > 2000) {
                $entry['context'] = substr($entry['context'], 0, 2000) . "\n... (truncated)";
            }
        }

        return $entries;
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        }
        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        }
        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        }
        return $bytes . ' B';
    }
}
