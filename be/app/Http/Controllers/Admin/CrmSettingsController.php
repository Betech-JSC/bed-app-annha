<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Permission;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class CrmSettingsController extends Controller
{
    private function guardSuperAdmin()
    {
        $user = \Illuminate\Support\Facades\Auth::guard('admin')->user();
        if (!$user || !$user->isSuperAdmin()) {
            abort(403, 'Chỉ Super Admin mới được phép truy cập trang Cấu hình hệ thống.');
        }
    }

    public function index()
    {
        $this->guardSuperAdmin();

        // Show users that have roles (CRM users)
        $admins = \App\Models\User::has('roles')->with('roles')->get()->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'super_admin' => $user->isSuperAdmin(),
                'roles' => $user->roles->pluck('name'),
                'created_at' => $user->created_at?->format('d/m/Y'),
            ];
        });

        $roles = Role::with('permissions')->withCount('users')->get()->map(function ($role) {
            return [
                'id' => $role->id,
                'name' => $role->name,
                'description' => $role->description,
                'admins_count' => $role->users_count,
                'permission_count' => $role->permissions->count(),
            ];
        });

        $settings = Setting::all();

        // Branding
        $branding = [
            'logo' => Setting::where('key', 'app_logo')->first()?->value,
            'app_name' => Setting::where('key', 'app_name')->first()?->value ?? config('app.name'),
            'app_tagline' => Setting::where('key', 'app_tagline')->first()?->value ?? '',
        ];

        // SMTP config from settings table
        $smtp = [
            'host' => Setting::where('key', 'smtp_host')->first()?->value ?? config('mail.mailers.smtp.host', ''),
            'port' => Setting::where('key', 'smtp_port')->first()?->value ?? config('mail.mailers.smtp.port', '587'),
            'username' => Setting::where('key', 'smtp_username')->first()?->value ?? config('mail.mailers.smtp.username', ''),
            'password' => Setting::where('key', 'smtp_password')->first()?->value ?? '',
            'encryption' => Setting::where('key', 'smtp_encryption')->first()?->value ?? config('mail.mailers.smtp.encryption', 'tls'),
            'from_address' => Setting::where('key', 'smtp_from_address')->first()?->value ?? config('mail.from.address', ''),
            'from_name' => Setting::where('key', 'smtp_from_name')->first()?->value ?? config('mail.from.name', ''),
        ];

        // Basic system stats
        $dbName = config('database.connections.mysql.database') ?: 'N/A';
        $dbSize = 0;
        try {
            $dbSize = \DB::select("SELECT SUM(data_length + index_length) / 1024 / 1024 AS size FROM information_schema.TABLES WHERE table_schema = ?", [$dbName])[0]->size ?? 0;
        } catch (\Exception $e) {}

        $stats = [
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            'database' => $dbName,
            'db_size' => round($dbSize, 2) . ' MB',
            'admin_count' => $admins->count(),
            'role_count' => $roles->count(),
        ];

        return Inertia::render('Crm/Settings/Index', [
            'admins' => $admins,
            'roles' => $roles,
            'settings' => $settings,
            'stats' => $stats,
            'branding' => $branding,
            'smtp' => $smtp,
        ]);
    }

    /**
     * Update a single setting
     */
    public function updateSetting(Request $request)
    {
        $this->guardSuperAdmin();
        $request->validate([
            'key' => 'required|string',
            'value' => 'nullable|string',
        ]);

        Setting::updateOrCreate(
            ['key' => $request->key],
            ['value' => $request->value, 'type' => 'string']
        );

        return back()->with('success', 'Đã lưu cấu hình.');
    }

    /**
     * Upload logo
     */
    public function uploadLogo(Request $request)
    {
        $this->guardSuperAdmin();
        $request->validate([
            'logo' => 'required|image|mimes:png,jpg,jpeg,svg,webp|max:2048',
        ]);

        // Delete old logo
        $oldLogo = Setting::where('key', 'app_logo')->first()?->value;
        if ($oldLogo && Storage::disk('public')->exists($oldLogo)) {
            Storage::disk('public')->delete($oldLogo);
        }

        $path = $request->file('logo')->store('branding', 'public');

        Setting::updateOrCreate(
            ['key' => 'app_logo'],
            ['value' => $path, 'type' => 'string', 'description' => 'Logo hệ thống']
        );

        return back()->with('success', 'Đã cập nhật logo thành công.');
    }

    /**
     * Update SMTP configuration
     */
    public function updateSmtp(Request $request)
    {
        $this->guardSuperAdmin();
        $request->validate([
            'host' => 'required|string|max:255',
            'port' => 'required|integer|min:1|max:65535',
            'username' => 'nullable|string|max:255',
            'password' => 'nullable|string|max:255',
            'encryption' => 'nullable|string|in:tls,ssl,null',
            'from_address' => 'nullable|email|max:255',
            'from_name' => 'nullable|string|max:255',
        ]);

        $smtpFields = [
            'smtp_host' => $request->host,
            'smtp_port' => (string) $request->port,
            'smtp_username' => $request->username ?? '',
            'smtp_password' => $request->password ?? '',
            'smtp_encryption' => $request->encryption ?? 'tls',
            'smtp_from_address' => $request->from_address ?? '',
            'smtp_from_name' => $request->from_name ?? '',
        ];

        foreach ($smtpFields as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => $value, 'type' => 'string']
            );
        }

        return back()->with('success', 'Đã lưu cấu hình SMTP thành công.');
    }

    /**
     * Test SMTP by sending a test email
     */
    public function testSmtp(Request $request)
    {
        $this->guardSuperAdmin();
        $request->validate([
            'email' => 'required|email',
        ]);

        try {
            // Apply SMTP config from settings at runtime
            $host = Setting::where('key', 'smtp_host')->first()?->value;
            $port = Setting::where('key', 'smtp_port')->first()?->value;
            $username = Setting::where('key', 'smtp_username')->first()?->value;
            $password = Setting::where('key', 'smtp_password')->first()?->value;
            $encryption = Setting::where('key', 'smtp_encryption')->first()?->value;
            $fromAddress = Setting::where('key', 'smtp_from_address')->first()?->value;
            $fromName = Setting::where('key', 'smtp_from_name')->first()?->value;

            if ($host) config(['mail.mailers.smtp.host' => $host]);
            if ($port) config(['mail.mailers.smtp.port' => (int) $port]);
            if ($username) config(['mail.mailers.smtp.username' => $username]);
            if ($password) config(['mail.mailers.smtp.password' => $password]);
            if ($encryption) config(['mail.mailers.smtp.encryption' => $encryption === 'null' ? null : $encryption]);
            if ($fromAddress) config(['mail.from.address' => $fromAddress]);
            if ($fromName) config(['mail.from.name' => $fromName]);

            Mail::raw('Đây là email kiểm tra SMTP từ BED CRM. Hệ thống email hoạt động bình thường.', function ($msg) use ($request, $fromAddress, $fromName) {
                $msg->to($request->email)
                    ->subject('[BED CRM] Test SMTP - ' . now()->format('d/m/Y H:i'));
                if ($fromAddress) {
                    $msg->from($fromAddress, $fromName ?? 'BED CRM');
                }
            });

            return back()->with('success', "Đã gửi email test thành công tới {$request->email}.");
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi gửi email: ' . $e->getMessage());
        }
    }
}
