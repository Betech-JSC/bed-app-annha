<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use App\Constants\Roles;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AssignSuperAdminRoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Gán role 'super_admin' (có tất cả permissions) cho các super admin users hiện tại
     * Users có role='admin' && owner=true sẽ được gán role 'super_admin'
     */
    public function run(): void
    {
        $this->command->info('Assigning super_admin role to super admin users...');

        // Tìm role super_admin
        $superAdminRole = Role::where('name', Roles::SUPER_ADMIN)->first();

        if (!$superAdminRole) {
            $this->command->warn("⚠️  Role 'super_admin' not found. Run RoleSeeder and RolePermissionSeeder first.");
            return;
        }

        // Tìm tất cả users có role='admin' && owner=true
        $superAdminUsers = User::where('role', 'admin')
            ->where('owner', true)
            ->get();

        if ($superAdminUsers->isEmpty()) {
            $this->command->info('No super admin users found (role=admin && owner=true).');
            return;
        }

        $assignedCount = 0;
        foreach ($superAdminUsers as $user) {
            // Kiểm tra xem đã có role super_admin chưa
            $exists = DB::table('role_user')
                ->where('user_id', $user->id)
                ->where('role_id', $superAdminRole->id)
                ->exists();

            if (!$exists) {
                DB::table('role_user')->insert([
                    'user_id' => $user->id,
                    'role_id' => $superAdminRole->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $assignedCount++;
                $this->command->info("✅ Assigned super_admin role to: {$user->email}");
            } else {
                $this->command->info("ℹ️  User {$user->email} already has super_admin role");
            }
        }

        $this->command->newLine();
        $this->command->info("✅ Assigned super_admin role to {$assignedCount} user(s)");
        $this->command->newLine();
    }
}
