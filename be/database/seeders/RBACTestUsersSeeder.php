<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use App\Constants\Roles;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * RBAC Test Users Seeder
 * 
 * Tạo các tài khoản test với các roles khác nhau để kiểm tra RBAC
 * Mỗi role có 2-3 users để test đầy đủ các chức năng
 */
class RBACTestUsersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info('🚀 Creating RBAC test users...');
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();

        $testUsers = [
            // ============================================================
            // SUPER ADMIN (đã có superadmin@skysend.com, tạo thêm 1 user test)
            // ============================================================
            [
                'email' => 'superadmin.test@test.com',
                'first_name' => 'Super',
                'last_name' => 'Admin Test',
                'name' => 'Super Admin Test',
                'password' => 'superadmin123',
                'phone' => '+84901111111',
                'role_name' => Roles::SUPER_ADMIN,
            ],

            // ============================================================
            // ADMIN (2 users)
            // ============================================================
            [
                'email' => 'admin1@test.com',
                'first_name' => 'Admin',
                'last_name' => 'One',
                'name' => 'Admin One',
                'password' => 'admin123',
                'phone' => '+84902222221',
                'role_name' => Roles::ADMIN,
            ],
            [
                'email' => 'admin2@test.com',
                'first_name' => 'Admin',
                'last_name' => 'Two',
                'name' => 'Admin Two',
                'password' => 'admin123',
                'phone' => '+84902222222',
                'role_name' => Roles::ADMIN,
            ],

            // ============================================================
            // PROJECT OWNER (2 users)
            // ============================================================
            [
                'email' => 'projectowner1@test.com',
                'first_name' => 'Project',
                'last_name' => 'Owner One',
                'name' => 'Project Owner One',
                'password' => 'owner123',
                'phone' => '+84903333331',
                'role_name' => Roles::PROJECT_OWNER,
            ],
            [
                'email' => 'projectowner2@test.com',
                'first_name' => 'Project',
                'last_name' => 'Owner Two',
                'name' => 'Project Owner Two',
                'password' => 'owner123',
                'phone' => '+84903333332',
                'role_name' => Roles::PROJECT_OWNER,
            ],

            // ============================================================
            // PROJECT MANAGER (3 users)
            // ============================================================
            [
                'email' => 'pm1@test.com',
                'first_name' => 'Project',
                'last_name' => 'Manager One',
                'name' => 'PM One',
                'password' => 'pm123',
                'phone' => '+84904444441',
                'role_name' => Roles::PROJECT_MANAGER,
            ],
            [
                'email' => 'pm2@test.com',
                'first_name' => 'Project',
                'last_name' => 'Manager Two',
                'name' => 'PM Two',
                'password' => 'pm123',
                'phone' => '+84904444442',
                'role_name' => Roles::PROJECT_MANAGER,
            ],
            [
                'email' => 'pm3@test.com',
                'first_name' => 'Project',
                'last_name' => 'Manager Three',
                'name' => 'PM Three',
                'password' => 'pm123',
                'phone' => '+84904444443',
                'role_name' => Roles::PROJECT_MANAGER,
            ],

            // ============================================================
            // SITE SUPERVISOR (3 users)
            // ============================================================
            [
                'email' => 'supervisor1@test.com',
                'first_name' => 'Site',
                'last_name' => 'Supervisor One',
                'name' => 'Supervisor One',
                'password' => 'supervisor123',
                'phone' => '+84905555551',
                'role_name' => Roles::SITE_SUPERVISOR,
            ],
            [
                'email' => 'supervisor2@test.com',
                'first_name' => 'Site',
                'last_name' => 'Supervisor Two',
                'name' => 'Supervisor Two',
                'password' => 'supervisor123',
                'phone' => '+84905555552',
                'role_name' => Roles::SITE_SUPERVISOR,
            ],
            [
                'email' => 'supervisor3@test.com',
                'first_name' => 'Site',
                'last_name' => 'Supervisor Three',
                'name' => 'Supervisor Three',
                'password' => 'supervisor123',
                'phone' => '+84905555553',
                'role_name' => Roles::SITE_SUPERVISOR,
            ],

            // ============================================================
            // ACCOUNTANT (2 users)
            // ============================================================
            [
                'email' => 'accountant1@test.com',
                'first_name' => 'Accountant',
                'last_name' => 'One',
                'name' => 'Accountant One',
                'password' => 'accountant123',
                'phone' => '+84906666661',
                'role_name' => Roles::ACCOUNTANT,
            ],
            [
                'email' => 'accountant2@test.com',
                'first_name' => 'Accountant',
                'last_name' => 'Two',
                'name' => 'Accountant Two',
                'password' => 'accountant123',
                'phone' => '+84906666662',
                'role_name' => Roles::ACCOUNTANT,
            ],

            // ============================================================
            // CLIENT (2 users)
            // ============================================================
            [
                'email' => 'client1@test.com',
                'first_name' => 'Client',
                'last_name' => 'One',
                'name' => 'Client One',
                'password' => 'client123',
                'phone' => '+84907777771',
                'role_name' => Roles::CLIENT,
            ],
            [
                'email' => 'client2@test.com',
                'first_name' => 'Client',
                'last_name' => 'Two',
                'name' => 'Client Two',
                'password' => 'client123',
                'phone' => '+84907777772',
                'role_name' => Roles::CLIENT,
            ],
        ];

        $createdCount = 0;
        $skippedCount = 0;

        foreach ($testUsers as $userData) {
            // Check if user already exists
            $existingUser = User::where('email', $userData['email'])->first();
            
            if ($existingUser) {
                $this->command->warn("⚠️  User {$userData['email']} already exists. Skipping...");
                $skippedCount++;
                continue;
            }

            // Get role
            $role = Role::where('name', $userData['role_name'])->first();
            if (!$role) {
                $this->command->error("❌ Role '{$userData['role_name']}' not found for user {$userData['email']}. Skipping...");
                $skippedCount++;
                continue;
            }

            // Create user
            $user = User::create([
                'email' => $userData['email'],
                'first_name' => $userData['first_name'],
                'last_name' => $userData['last_name'],
                'name' => $userData['name'],
                'password' => Hash::make($userData['password']),
                'phone' => $userData['phone'],
                'role' => 'user', // Default role field
                'owner' => false,
            ]);

            // Assign role
            $user->roles()->attach($role->id);

            $this->command->info("✅ Created user: {$userData['email']} ({$role->name})");
            $createdCount++;
        }

        $this->command->newLine();
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info("✅ Created: {$createdCount} users");
        if ($skippedCount > 0) {
            $this->command->info("⚠️  Skipped: {$skippedCount} users (already exist)");
        }
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();
        $this->command->info('📋 Test Accounts Summary:');
        $this->command->info('   Super Admin: superadmin.test@test.com / superadmin123');
        $this->command->info('   Admin: admin1@test.com / admin123');
        $this->command->info('   Project Owner: projectowner1@test.com / owner123');
        $this->command->info('   Project Manager: pm1@test.com / pm123');
        $this->command->info('   Site Supervisor: supervisor1@test.com / supervisor123');
        $this->command->info('   Accountant: accountant1@test.com / accountant123');
        $this->command->info('   Client: client1@test.com / client123');
        $this->command->newLine();
    }
}
