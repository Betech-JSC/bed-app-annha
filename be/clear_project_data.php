<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Starting data clearing process...\n";

// Các bảng cần giữ lại dữ liệu (User, Phân quyền, Hệ thống)
$keepTables = [
    // System
    'migrations',
    'cache',
    'cache_locks',
    'jobs',
    'job_batches',
    'failed_jobs',
    'sessions',
    'personal_access_tokens',
    'password_resets',
    'password_reset_tokens',
    'settings',
    
    // User & Account
    'users',
    'admins',
    'accounts',
    
    // Roles & Permissions
    'roles',
    'permissions',
    'role_user',
    'permission_role',
    'permission_user',
    'admin_role',
    'model_has_permissions',
    'model_has_roles',
    'role_has_permissions'
];

$dbName = env('DB_DATABASE');

// Lấy danh sách tất cả các bảng
$tables = DB::select('SHOW TABLES');
$tableKey = "Tables_in_{$dbName}";

DB::statement('SET FOREIGN_KEY_CHECKS=0;');

$clearedTables = 0;

foreach ($tables as $table) {
    // Tùy thuộc vào phiên bản MySQL/MariaDB, key có thể khác nhau
    // Thường là Tables_in_databaseName
    $tableName = (array) $table;
    $tableName = array_values($tableName)[0];

    if (!in_array($tableName, $keepTables)) {
        echo "Truncating table: {$tableName}...\n";
        DB::table($tableName)->truncate();
        $clearedTables++;
    } else {
        echo "Skipping table: {$tableName} (Keep data)\n";
    }
}

DB::statement('SET FOREIGN_KEY_CHECKS=1;');

echo "\nDone! Cleared {$clearedTables} tables.\n";
