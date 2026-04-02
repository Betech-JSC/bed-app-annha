<?php

use Illuminate\Support\Facades\DB;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Get admin role
$adminRole = DB::table('roles')->where('name', 'Admin')->orWhere('name', 'admin')->first();

if ($adminRole) {
    $permissions = [
        'shareholder.view' => 'Xem cổ đông',
        'shareholder.create' => 'Tạo cổ đông',
        'shareholder.update' => 'Cập nhật cổ đông',
        'shareholder.delete' => 'Xóa cổ đông',
        'company_asset.view' => 'Xem tài sản công ty',
        'company_asset.create' => 'Tạo tài sản công ty',
        'company_asset.update' => 'Cập nhật tài sản công ty',
        'company_asset.delete' => 'Xóa tài sản công ty',
        'company_asset.assign' => 'Bàn giao tài sản',
        'company_asset.depreciate' => 'Chạy khấu hao tài sản',
        'operations.dashboard.view' => 'Xem Dashboard vận hành',
    ];

    foreach ($permissions as $name => $desc) {
        $permissionId = DB::table('permissions')->where('name', $name)->value('id');
        
        if (!$permissionId) {
            $permissionId = DB::table('permissions')->insertGetId([
                'name' => $name,
                'description' => $desc,
                'created_at' => now(),
                'updated_at' => now()
            ]);
            echo "Tạo quyền: $name ✅\n";
        }

        // Check if already assigned in permission_role
        $exists = DB::table('permission_role')
            ->where('role_id', $adminRole->id)
            ->where('permission_id', $permissionId)
            ->exists();
        
        if (!$exists) {
            DB::table('permission_role')->insert([
                'role_id' => $adminRole->id,
                'permission_id' => $permissionId
            ]);
            echo "Gán quyền: $name cho Admin ✅\n";
        }
    }
} else {
    echo "Không tìm thấy role admin\n";
}
