<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserRoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Tạo các users với các roles khác nhau trong hệ thống
     */
    public function run(): void
    {
        $users = [
            // Super Admin (đã có trong SuperAdminSeeder, nhưng đảm bảo tồn tại)
            [
                'email' => 'superadmin@skysend.com',
                'first_name' => 'Super',
                'last_name' => 'Admin',
                'name' => 'Super Admin',
                'password' => 'superadmin123',
                'role' => 'admin',
                'phone' => '+84901234567',
                'owner' => true,
            ],
            // HR Admin
            [
                'email' => 'hradmin@skysend.com',
                'first_name' => 'HR',
                'last_name' => 'Admin',
                'name' => 'HR Admin',
                'password' => 'hradmin123',
                'role' => 'admin',
                'phone' => '+84901234568',
                'owner' => false,
            ],
            // Project Manager
            [
                'email' => 'pm1@skysend.com',
                'first_name' => 'Nguyễn',
                'last_name' => 'Văn A',
                'name' => 'Nguyễn Văn A',
                'password' => 'pm123456',
                'role' => 'admin',
                'phone' => '+84901234569',
                'owner' => false,
            ],
            [
                'email' => 'pm2@skysend.com',
                'first_name' => 'Trần',
                'last_name' => 'Thị B',
                'name' => 'Trần Thị B',
                'password' => 'pm123456',
                'role' => 'admin',
                'phone' => '+84901234570',
                'owner' => false,
            ],
            // Accountant (Kế toán)
            [
                'email' => 'accountant@skysend.com',
                'first_name' => 'Lê',
                'last_name' => 'Văn C',
                'name' => 'Lê Văn C',
                'password' => 'accountant123',
                'role' => 'admin',
                'phone' => '+84901234571',
                'owner' => false,
            ],
            // Management (Ban điều hành)
            [
                'email' => 'management@skysend.com',
                'first_name' => 'Phạm',
                'last_name' => 'Thị D',
                'name' => 'Phạm Thị D',
                'password' => 'management123',
                'role' => 'admin',
                'phone' => '+84901234572',
                'owner' => false,
            ],
            // Customer (Khách hàng)
            [
                'email' => 'customer1@skysend.com',
                'first_name' => 'Hoàng',
                'last_name' => 'Văn E',
                'name' => 'Hoàng Văn E',
                'password' => 'customer123',
                'role' => 'admin',
                'phone' => '+84901234573',
                'owner' => false,
            ],
            [
                'email' => 'customer2@skysend.com',
                'first_name' => 'Võ',
                'last_name' => 'Thị F',
                'name' => 'Võ Thị F',
                'password' => 'customer123',
                'role' => 'admin',
                'phone' => '+84901234574',
                'owner' => false,
            ],
            // Employee (Nhân viên)
            [
                'email' => 'employee1@skysend.com',
                'first_name' => 'Đặng',
                'last_name' => 'Văn G',
                'name' => 'Đặng Văn G',
                'password' => 'employee123',
                'role' => 'admin',
                'phone' => '+84901234575',
                'owner' => false,
            ],
            [
                'email' => 'employee2@skysend.com',
                'first_name' => 'Bùi',
                'last_name' => 'Thị H',
                'name' => 'Bùi Thị H',
                'password' => 'employee123',
                'role' => 'admin',
                'phone' => '+84901234576',
                'owner' => false,
            ],
        ];

        $this->command->info('Đang tạo users với các roles...');

        foreach ($users as $userData) {
            $user = User::firstOrCreate(
                ['email' => $userData['email']],
                [
                    'first_name' => $userData['first_name'],
                    'last_name' => $userData['last_name'],
                    'name' => $userData['name'],
                    'email' => $userData['email'],
                    'password' => Hash::make($userData['password']),
                    'role' => $userData['role'],
                    'phone' => $userData['phone'],
                    'owner' => $userData['owner'],
                    'email_verified_at' => now(),
                ]
            );

            // Cập nhật lại nếu đã tồn tại
            if (!$user->wasRecentlyCreated) {
                $user->update([
                    'password' => Hash::make($userData['password']),
                    'role' => $userData['role'],
                    'email_verified_at' => now(),
                ]);
            }

            $this->command->info("✅ Đã tạo/cập nhật: {$user->email} ({$user->name})");
        }

        $this->command->newLine();
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info('✅ Đã tạo tất cả users với các roles!');
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();
        $this->command->info('📋 Danh sách tài khoản:');
        $this->command->newLine();
        $this->command->info('🔐 Super Admin:');
        $this->command->info('   Email: superadmin@skysend.com | Password: superadmin123');
        $this->command->newLine();
        $this->command->info('👥 HR Admin:');
        $this->command->info('   Email: hradmin@skysend.com | Password: hradmin123');
        $this->command->newLine();
        $this->command->info('📊 Project Managers:');
        $this->command->info('   Email: pm1@skysend.com | Password: pm123456');
        $this->command->info('   Email: pm2@skysend.com | Password: pm123456');
        $this->command->newLine();
        $this->command->info('💰 Accountant:');
        $this->command->info('   Email: accountant@skysend.com | Password: accountant123');
        $this->command->newLine();
        $this->command->info('👔 Management:');
        $this->command->info('   Email: management@skysend.com | Password: management123');
        $this->command->newLine();
        $this->command->info('🏢 Customers:');
        $this->command->info('   Email: customer1@skysend.com | Password: customer123');
        $this->command->info('   Email: customer2@skysend.com | Password: customer123');
        $this->command->newLine();
        $this->command->info('👷 Employees:');
        $this->command->info('   Email: employee1@skysend.com | Password: employee123');
        $this->command->info('   Email: employee2@skysend.com | Password: employee123');
        $this->command->newLine();
    }
}
