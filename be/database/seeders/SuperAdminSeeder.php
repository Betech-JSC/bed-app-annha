<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class SuperAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Tạo Super Admin user với toàn quyền truy cập vào app
     */
    public function run(): void
    {
        // Tạo Super Admin trong bảng users
        $superAdmin = User::firstOrCreate(
            ['email' => 'superadmin@skysend.com'],
            [
                'first_name' => 'Super',
                'last_name' => 'Admin',
                'name' => 'Super Admin',
                'email' => 'superadmin@skysend.com',
                'password' => Hash::make('superadmin123'),
                'role' => 'admin', // Role admin để truy cập HR module
                'phone' => '+84901234567',
                'owner' => true,
                'email_verified_at' => now(),
            ]
        );

        // Cập nhật lại nếu đã tồn tại
        if (!$superAdmin->wasRecentlyCreated) {
            $superAdmin->update([
                'role' => 'admin',
                'password' => Hash::make('superadmin123'), // Reset password về mặc định
                'email_verified_at' => now(),
            ]);
        }

        // Gán role "Super Admin" hoặc "Admin" từ hệ thống role-permission nếu có
        $superAdminRole = Role::where('name', 'Super Admin')->orWhere('name', 'Admin')->first();
        if ($superAdminRole) {
            // Kiểm tra xem đã có trong bảng role_user chưa
            $exists = DB::table('role_user')
                ->where('user_id', $superAdmin->id)
                ->where('role_id', $superAdminRole->id)
                ->exists();

            if (!$exists) {
                DB::table('role_user')->insert([
                    'user_id' => $superAdmin->id,
                    'role_id' => $superAdminRole->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Tạo thêm HR Admin (có quyền HR nhưng không phải super admin)
        $hrAdmin = User::firstOrCreate(
            ['email' => 'hradmin@skysend.com'],
            [
                'first_name' => 'HR',
                'last_name' => 'Admin',
                'name' => 'HR Admin',
                'email' => 'hradmin@skysend.com',
                'password' => Hash::make('hradmin123'),
                'role' => 'admin', // Role admin để truy cập HR module
                'phone' => '+84901234568',
                'owner' => false,
                'email_verified_at' => now(),
            ]
        );

        if (!$hrAdmin->wasRecentlyCreated) {
            $hrAdmin->update([
                'role' => 'admin',
                'password' => Hash::make('hradmin123'),
            ]);
        }

        // Gán role "HR" nếu có
        $hrRole = Role::where('name', 'HR')->orWhere('name', 'hr')->first();
        if ($hrRole) {
            $exists = DB::table('role_user')
                ->where('user_id', $hrAdmin->id)
                ->where('role_id', $hrRole->id)
                ->exists();

            if (!$exists) {
                DB::table('role_user')->insert([
                    'user_id' => $hrAdmin->id,
                    'role_id' => $hrRole->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Output thông tin
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info('✅ Super Admin đã được tạo thành công!');
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();
        $this->command->info('📧 Email: superadmin@skysend.com');
        $this->command->info('🔑 Password: superadmin123');
        $this->command->info('👤 Role: admin (Toàn quyền truy cập)');
        $this->command->newLine();
        $this->command->warn('⚠️  VUI LÒNG ĐỔI MẬT KHẨU SAU KHI ĐĂNG NHẬP LẦN ĐẦU!');
        $this->command->newLine();
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info('✅ HR Admin đã được tạo thành công!');
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();
        $this->command->info('📧 Email: hradmin@skysend.com');
        $this->command->info('🔑 Password: hradmin123');
        $this->command->info('👤 Role: admin (Quyền HR)');
        $this->command->newLine();
    }
}
