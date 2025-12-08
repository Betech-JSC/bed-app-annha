<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Tạo Super Admin
        $superAdmin = Admin::firstOrCreate(
            ['email' => 'admin@skysend.com'],
            [
                'first_name' => 'Super',
                'last_name' => 'Admin',
                'email' => 'admin@skysend.com',
                'password' => Hash::make('admin123'),
                'super_admin' => true,
            ]
        );

        // Cập nhật lại super_admin nếu đã tồn tại
        if ($superAdmin->wasRecentlyCreated === false) {
            $superAdmin->update([
                'super_admin' => true,
                'password' => Hash::make('admin123'), // Reset password về mặc định
            ]);
        }

        // Gán role "Super Admin" nếu có
        $superAdminRole = Role::where('name', 'Super Admin')->first();
        if ($superAdminRole) {
            $superAdmin->roles()->syncWithoutDetaching([$superAdminRole->id]);
        }

        $this->command->info('Super Admin created:');
        $this->command->info('Email: admin@skysend.com');
        $this->command->info('Password: admin123');
        $this->command->warn('⚠️  Please change the password after first login!');

        // Tạo thêm một số admin thường (optional)
        $manager = Admin::firstOrCreate(
            ['email' => 'manager@skysend.com'],
            [
                'first_name' => 'Manager',
                'last_name' => 'User',
                'email' => 'manager@skysend.com',
                'password' => Hash::make('manager123'),
                'super_admin' => false,
            ]
        );

        // Gán role "Manager" nếu có
        $managerRole = Role::where('name', 'Manager')->first();
        if ($managerRole) {
            $manager->roles()->syncWithoutDetaching([$managerRole->id]);
        }

        $this->command->info('Manager Admin created:');
        $this->command->info('Email: manager@skysend.com');
        $this->command->info('Password: manager123');

        // Tạo Support Admin
        $support = Admin::firstOrCreate(
            ['email' => 'support@skysend.com'],
            [
                'first_name' => 'Support',
                'last_name' => 'Staff',
                'email' => 'support@skysend.com',
                'password' => Hash::make('support123'),
                'super_admin' => false,
            ]
        );

        // Gán role "Support" nếu có
        $supportRole = Role::where('name', 'Support')->first();
        if ($supportRole) {
            $support->roles()->syncWithoutDetaching([$supportRole->id]);
        }

        $this->command->info('Support Admin created:');
        $this->command->info('Email: support@skysend.com');
        $this->command->info('Password: support123');
    }
}
