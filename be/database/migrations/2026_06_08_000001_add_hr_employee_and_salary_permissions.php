<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Add HR Employee and Salary management permissions.
     * These are company-level HR permissions, separate from project-level personnel permissions.
     */
    public function up(): void
    {
        $now = now();

        $permissions = [
            ['name' => 'hr.employee.view',   'description' => 'Xem danh sách nhân sự công ty',    'created_at' => $now, 'updated_at' => $now],
            ['name' => 'hr.employee.create',  'description' => 'Thêm nhân sự mới',                'created_at' => $now, 'updated_at' => $now],
            ['name' => 'hr.employee.update',  'description' => 'Sửa thông tin nhân sự',           'created_at' => $now, 'updated_at' => $now],
            ['name' => 'hr.employee.delete',  'description' => 'Xóa nhân sự',                     'created_at' => $now, 'updated_at' => $now],
            ['name' => 'hr.salary.view',      'description' => 'Xem cấu hình lương',              'created_at' => $now, 'updated_at' => $now],
            ['name' => 'hr.salary.manage',    'description' => 'Quản lý cấu hình lương',          'created_at' => $now, 'updated_at' => $now],
        ];

        foreach ($permissions as $perm) {
            // Skip if already exists
            if (!DB::table('permissions')->where('name', $perm['name'])->exists()) {
                DB::table('permissions')->insert($perm);
            }
        }
        // NOTE: Admins must manually assign these new HR permissions
        // to the appropriate roles (e.g. Giám đốc, PM) via the
        // Phân Quyền Vai Trò page. Do NOT auto-assign to all roles
        // with personnel.view — that permission is project-level only.
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $permNames = [
            'hr.employee.view', 'hr.employee.create', 'hr.employee.update', 'hr.employee.delete',
            'hr.salary.view', 'hr.salary.manage',
        ];

        $permIds = DB::table('permissions')->whereIn('name', $permNames)->pluck('id')->toArray();

        if (!empty($permIds)) {
            DB::table('permission_role')->whereIn('permission_id', $permIds)->delete();
            DB::table('permission_user')->whereIn('permission_id', $permIds)->delete();
            DB::table('permissions')->whereIn('id', $permIds)->delete();
        }
    }
};
