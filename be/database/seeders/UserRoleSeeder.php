<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use App\Constants\Roles;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserRoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Tạo các users với các roles khác nhau trong hệ thống
     * Tạo 30-40 users với đầy đủ các role để test
     */
    public function run(): void
    {
        $users = [
            // Super Admin (đã có trong SuperAdminSeeder, nhưng đảm bảo tồn tại)
            [
                'email' => 'superadmin@test.com',
                'first_name' => 'Super',
                'last_name' => 'Admin',
                'name' => 'Super Admin',
                'password' => 'admin123456',
                'role' => 'admin',
                'phone' => '+84901234567',
                'owner' => true,
                'role_names' => ['Admin'], // Role names to assign via role_user
            ],
            // HR Admin
            [
                'email' => 'hradmin@test.com',
                'first_name' => 'HR',
                'last_name' => 'Admin',
                'name' => 'HR Admin',
                'password' => 'hradmin123456',
                'role' => 'admin',
                'phone' => '+84901234568',
                'owner' => false,
                'role_names' => ['Admin'],
            ],
            // Project Managers (3-5 users)
            [
                'email' => 'pm1@test.com',
                'first_name' => 'Nguyễn',
                'last_name' => 'Văn A',
                'name' => 'Nguyễn Văn A',
                'password' => 'projectmanager123456',
                'role' => 'admin',
                'phone' => '+84901234569',
                'owner' => false,
                'role_names' => ['Quản lý dự án'],
            ],
            [
                'email' => 'pm2@test.com',
                'first_name' => 'Trần',
                'last_name' => 'Thị B',
                'name' => 'Trần Thị B',
                'password' => 'projectmanager123456',
                'role' => 'admin',
                'phone' => '+84901234570',
                'owner' => false,
                'role_names' => ['Quản lý dự án'],
            ],
            [
                'email' => 'pm3@test.com',
                'first_name' => 'Lê',
                'last_name' => 'Văn C',
                'name' => 'Lê Văn C',
                'password' => 'projectmanager123456',
                'role' => 'admin',
                'phone' => '+84901234571',
                'owner' => false,
                'role_names' => ['Quản lý dự án'],
            ],
            [
                'email' => 'pm4@test.com',
                'first_name' => 'Phạm',
                'last_name' => 'Thị D',
                'name' => 'Phạm Thị D',
                'password' => 'projectmanager123456',
                'role' => 'admin',
                'phone' => '+84901234572',
                'owner' => false,
                'role_names' => ['Quản lý dự án'],
            ],
            [
                'email' => 'pm5@test.com',
                'first_name' => 'Hoàng',
                'last_name' => 'Văn E',
                'name' => 'Hoàng Văn E',
                'password' => 'projectmanager123456',
                'role' => 'admin',
                'phone' => '+84901234573',
                'owner' => false,
                'role_names' => ['Quản lý dự án'],
            ],
            // Supervisors (3-5 users)
            [
                'email' => 'supervisor1@test.com',
                'first_name' => 'Võ',
                'last_name' => 'Thị F',
                'name' => 'Võ Thị F',
                'password' => 'supervisor123456',
                'role' => 'admin',
                'phone' => '+84901234574',
                'owner' => false,
                'role_names' => ['Giám sát'],
            ],
            [
                'email' => 'supervisor2@test.com',
                'first_name' => 'Đặng',
                'last_name' => 'Văn G',
                'name' => 'Đặng Văn G',
                'password' => 'supervisor123456',
                'role' => 'admin',
                'phone' => '+84901234575',
                'owner' => false,
                'role_names' => ['Giám sát'],
            ],
            [
                'email' => 'supervisor3@test.com',
                'first_name' => 'Bùi',
                'last_name' => 'Thị H',
                'name' => 'Bùi Thị H',
                'password' => 'supervisor123456',
                'role' => 'admin',
                'phone' => '+84901234576',
                'owner' => false,
                'role_names' => ['Giám sát'],
            ],
            [
                'email' => 'supervisor4@test.com',
                'first_name' => 'Ngô',
                'last_name' => 'Văn I',
                'name' => 'Ngô Văn I',
                'password' => 'supervisor123456',
                'role' => 'admin',
                'phone' => '+84901234577',
                'owner' => false,
                'role_names' => ['Giám sát'],
            ],
            [
                'email' => 'supervisor5@test.com',
                'first_name' => 'Trương',
                'last_name' => 'Thị K',
                'name' => 'Trương Thị K',
                'password' => 'supervisor123456',
                'role' => 'admin',
                'phone' => '+84901234578',
                'owner' => false,
                'role_names' => ['Giám sát'],
            ],
            // Customers (5 users)
            [
                'email' => 'customer1@test.com',
                'first_name' => 'Lý',
                'last_name' => 'Văn L',
                'name' => 'Lý Văn L',
                'password' => 'customer123456',
                'role' => 'admin',
                'phone' => '+84901234579',
                'owner' => false,
                'role_names' => ['Khách'],
            ],
            [
                'email' => 'customer2@test.com',
                'first_name' => 'Đỗ',
                'last_name' => 'Thị M',
                'name' => 'Đỗ Thị M',
                'password' => 'customer123456',
                'role' => 'admin',
                'phone' => '+84901234580',
                'owner' => false,
                'role_names' => ['Khách'],
            ],
            [
                'email' => 'customer3@test.com',
                'first_name' => 'Phan',
                'last_name' => 'Văn N',
                'name' => 'Phan Văn N',
                'password' => 'customer123456',
                'role' => 'admin',
                'phone' => '+84901234581',
                'owner' => false,
                'role_names' => ['Khách'],
            ],
            [
                'email' => 'customer4@test.com',
                'first_name' => 'Vũ',
                'last_name' => 'Thị O',
                'name' => 'Vũ Thị O',
                'password' => 'customer123456',
                'role' => 'admin',
                'phone' => '+84901234582',
                'owner' => false,
                'role_names' => ['Khách'],
            ],
            [
                'email' => 'customer5@test.com',
                'first_name' => 'Đinh',
                'last_name' => 'Văn P',
                'name' => 'Đinh Văn P',
                'password' => 'customer123456',
                'role' => 'admin',
                'phone' => '+84901234583',
                'owner' => false,
                'role_names' => ['Khách'],
            ],
            // Accountants (2-3 users)
            [
                'email' => 'accountant1@test.com',
                'first_name' => 'Lê',
                'last_name' => 'Văn Q',
                'name' => 'Lê Văn Q',
                'password' => 'accountant123456',
                'role' => 'admin',
                'phone' => '+84901234584',
                'owner' => false,
                'role_names' => ['Kế toán'],
            ],
            [
                'email' => 'accountant2@test.com',
                'first_name' => 'Nguyễn',
                'last_name' => 'Thị R',
                'name' => 'Nguyễn Thị R',
                'password' => 'accountant123456',
                'role' => 'admin',
                'phone' => '+84901234585',
                'owner' => false,
                'role_names' => ['Kế toán'],
            ],
            [
                'email' => 'accountant3@test.com',
                'first_name' => 'Trần',
                'last_name' => 'Văn S',
                'name' => 'Trần Văn S',
                'password' => 'accountant123456',
                'role' => 'admin',
                'phone' => '+84901234586',
                'owner' => false,
                'role_names' => ['Kế toán'],
            ],
            // Management (Ban điều hành) (2 users)
            [
                'email' => 'management1@test.com',
                'first_name' => 'Phạm',
                'last_name' => 'Thị T',
                'name' => 'Phạm Thị T',
                'password' => 'management123456',
                'role' => 'admin',
                'phone' => '+84901234587',
                'owner' => false,
                'role_names' => ['Ban điều hành'],
            ],
            [
                'email' => 'management2@test.com',
                'first_name' => 'Hoàng',
                'last_name' => 'Văn U',
                'name' => 'Hoàng Văn U',
                'password' => 'management123456',
                'role' => 'admin',
                'phone' => '+84901234588',
                'owner' => false,
                'role_names' => ['Ban điều hành'],
            ],
            // Designers (2-3 users)
            [
                'email' => 'designer1@test.com',
                'first_name' => 'Võ',
                'last_name' => 'Thị V',
                'name' => 'Võ Thị V',
                'password' => 'designer123456',
                'role' => 'admin',
                'phone' => '+84901234589',
                'owner' => false,
                'role_names' => ['Bên Thiết Kế'],
            ],
            [
                'email' => 'designer2@test.com',
                'first_name' => 'Đặng',
                'last_name' => 'Văn X',
                'name' => 'Đặng Văn X',
                'password' => 'designer123456',
                'role' => 'admin',
                'phone' => '+84901234590',
                'owner' => false,
                'role_names' => ['Bên Thiết Kế'],
            ],
            [
                'email' => 'designer3@test.com',
                'first_name' => 'Bùi',
                'last_name' => 'Thị Y',
                'name' => 'Bùi Thị Y',
                'password' => 'designer123456',
                'role' => 'admin',
                'phone' => '+84901234591',
                'owner' => false,
                'role_names' => ['Bên Thiết Kế'],
            ],
            // Team Leaders (3-5 users)
            [
                'email' => 'teamleader1@test.com',
                'first_name' => 'Ngô',
                'last_name' => 'Văn Z',
                'name' => 'Ngô Văn Z',
                'password' => 'teamleader123456',
                'role' => 'admin',
                'phone' => '+84901234592',
                'owner' => false,
                'role_names' => ['Tổ trưởng'],
            ],
            [
                'email' => 'teamleader2@test.com',
                'first_name' => 'Trương',
                'last_name' => 'Thị AA',
                'name' => 'Trương Thị AA',
                'password' => 'teamleader123456',
                'role' => 'admin',
                'phone' => '+84901234593',
                'owner' => false,
                'role_names' => ['Tổ trưởng'],
            ],
            [
                'email' => 'teamleader3@test.com',
                'first_name' => 'Lý',
                'last_name' => 'Văn BB',
                'name' => 'Lý Văn BB',
                'password' => 'teamleader123456',
                'role' => 'admin',
                'phone' => '+84901234594',
                'owner' => false,
                'role_names' => ['Tổ trưởng'],
            ],
            [
                'email' => 'teamleader4@test.com',
                'first_name' => 'Đỗ',
                'last_name' => 'Thị CC',
                'name' => 'Đỗ Thị CC',
                'password' => 'teamleader123456',
                'role' => 'admin',
                'phone' => '+84901234595',
                'owner' => false,
                'role_names' => ['Tổ trưởng'],
            ],
            [
                'email' => 'teamleader5@test.com',
                'first_name' => 'Phan',
                'last_name' => 'Văn DD',
                'name' => 'Phan Văn DD',
                'password' => 'teamleader123456',
                'role' => 'admin',
                'phone' => '+84901234596',
                'owner' => false,
                'role_names' => ['Tổ trưởng'],
            ],
            // Workers (5-10 users)
            [
                'email' => 'worker1@test.com',
                'first_name' => 'Vũ',
                'last_name' => 'Thị EE',
                'name' => 'Vũ Thị EE',
                'password' => 'worker123456',
                'role' => 'admin',
                'phone' => '+84901234597',
                'owner' => false,
                'role_names' => ['Thợ'],
            ],
            [
                'email' => 'worker2@test.com',
                'first_name' => 'Đinh',
                'last_name' => 'Văn FF',
                'name' => 'Đinh Văn FF',
                'password' => 'worker123456',
                'role' => 'admin',
                'phone' => '+84901234598',
                'owner' => false,
                'role_names' => ['Thợ'],
            ],
            [
                'email' => 'worker3@test.com',
                'first_name' => 'Lê',
                'last_name' => 'Thị GG',
                'name' => 'Lê Thị GG',
                'password' => 'worker123456',
                'role' => 'admin',
                'phone' => '+84901234599',
                'owner' => false,
                'role_names' => ['Thợ'],
            ],
            [
                'email' => 'worker4@test.com',
                'first_name' => 'Nguyễn',
                'last_name' => 'Văn HH',
                'name' => 'Nguyễn Văn HH',
                'password' => 'worker123456',
                'role' => 'admin',
                'phone' => '+84901234600',
                'owner' => false,
                'role_names' => ['Thợ'],
            ],
            [
                'email' => 'worker5@test.com',
                'first_name' => 'Trần',
                'last_name' => 'Thị II',
                'name' => 'Trần Thị II',
                'password' => 'worker123456',
                'role' => 'admin',
                'phone' => '+84901234601',
                'owner' => false,
                'role_names' => ['Thợ'],
            ],
            [
                'email' => 'worker6@test.com',
                'first_name' => 'Phạm',
                'last_name' => 'Văn JJ',
                'name' => 'Phạm Văn JJ',
                'password' => 'worker123456',
                'role' => 'admin',
                'phone' => '+84901234602',
                'owner' => false,
                'role_names' => ['Thợ'],
            ],
            [
                'email' => 'worker7@test.com',
                'first_name' => 'Hoàng',
                'last_name' => 'Thị KK',
                'name' => 'Hoàng Thị KK',
                'password' => 'worker123456',
                'role' => 'admin',
                'phone' => '+84901234603',
                'owner' => false,
                'role_names' => ['Thợ'],
            ],
            [
                'email' => 'worker8@test.com',
                'first_name' => 'Võ',
                'last_name' => 'Văn LL',
                'name' => 'Võ Văn LL',
                'password' => 'worker123456',
                'role' => 'admin',
                'phone' => '+84901234604',
                'owner' => false,
                'role_names' => ['Thợ'],
            ],
            [
                'email' => 'worker9@test.com',
                'first_name' => 'Đặng',
                'last_name' => 'Thị MM',
                'name' => 'Đặng Thị MM',
                'password' => 'worker123456',
                'role' => 'admin',
                'phone' => '+84901234605',
                'owner' => false,
                'role_names' => ['Thợ'],
            ],
            [
                'email' => 'worker10@test.com',
                'first_name' => 'Bùi',
                'last_name' => 'Văn NN',
                'name' => 'Bùi Văn NN',
                'password' => 'worker123456',
                'role' => 'admin',
                'phone' => '+84901234606',
                'owner' => false,
                'role_names' => ['Thợ'],
            ],
            // Supervisor Guests (2-3 users)
            [
                'email' => 'supervisorguest1@test.com',
                'first_name' => 'Ngô',
                'last_name' => 'Thị OO',
                'name' => 'Ngô Thị OO',
                'password' => 'supervisorguest123456',
                'role' => 'admin',
                'phone' => '+84901234607',
                'owner' => false,
                'role_names' => ['Giám sát khách'],
            ],
            [
                'email' => 'supervisorguest2@test.com',
                'first_name' => 'Trương',
                'last_name' => 'Văn PP',
                'name' => 'Trương Văn PP',
                'password' => 'supervisorguest123456',
                'role' => 'admin',
                'phone' => '+84901234608',
                'owner' => false,
                'role_names' => ['Giám sát khách'],
            ],
            [
                'email' => 'supervisorguest3@test.com',
                'first_name' => 'Lý',
                'last_name' => 'Thị QQ',
                'name' => 'Lý Thị QQ',
                'password' => 'supervisorguest123456',
                'role' => 'admin',
                'phone' => '+84901234609',
                'owner' => false,
                'role_names' => ['Giám sát khách'],
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

            // Gán roles cho user qua role_user table
            // Map old role names to new RBAC roles
            $roleMapping = [
                'Admin' => Roles::SUPER_ADMIN,
                'Quản lý dự án' => Roles::PROJECT_MANAGER,
                'Giám sát' => Roles::SITE_SUPERVISOR,
                'Khách' => Roles::PROJECT_OWNER,
                'Kế toán' => Roles::ACCOUNTANT,
                'Ban điều hành' => Roles::ADMIN,
                'Bên Thiết Kế' => Roles::CLIENT,
                'Tổ trưởng' => Roles::SITE_SUPERVISOR,
                'Thợ' => Roles::SITE_SUPERVISOR,
                'Giám sát khách' => Roles::SITE_SUPERVISOR,
            ];

            if (isset($userData['role_names']) && is_array($userData['role_names'])) {
                $roleIds = [];
                foreach ($userData['role_names'] as $oldRoleName) {
                    // Map to new RBAC role
                    $newRoleName = $roleMapping[$oldRoleName] ?? $oldRoleName;
                    $role = Role::where('name', $newRoleName)->first();
                    if ($role) {
                        $roleIds[] = $role->id;
                    } else {
                        // Fallback: try old role name
                        $role = Role::where('name', $oldRoleName)->first();
                        if ($role) {
                            $roleIds[] = $role->id;
                        }
                    }
                }
                if (!empty($roleIds)) {
                    $user->roles()->syncWithoutDetaching($roleIds);
                }
            }

            $this->command->info("✅ Đã tạo/cập nhật: {$user->email} ({$user->name})");
        }

        $this->command->newLine();
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info('✅ Đã tạo ' . count($users) . ' users với các roles!');
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();
        $this->command->info('📋 Danh sách tài khoản test:');
        $this->command->newLine();
        
        // Group by role for better display
        $roleGroups = [
            'Super Admin' => ['superadmin@test.com'],
            'HR Admin' => ['hradmin@test.com'],
            'Project Managers' => ['pm1@test.com', 'pm2@test.com', 'pm3@test.com', 'pm4@test.com', 'pm5@test.com'],
            'Supervisors' => ['supervisor1@test.com', 'supervisor2@test.com', 'supervisor3@test.com', 'supervisor4@test.com', 'supervisor5@test.com'],
            'Customers' => ['customer1@test.com', 'customer2@test.com', 'customer3@test.com', 'customer4@test.com', 'customer5@test.com'],
            'Accountants' => ['accountant1@test.com', 'accountant2@test.com', 'accountant3@test.com'],
            'Management' => ['management1@test.com', 'management2@test.com'],
            'Designers' => ['designer1@test.com', 'designer2@test.com', 'designer3@test.com'],
            'Team Leaders' => ['teamleader1@test.com', 'teamleader2@test.com', 'teamleader3@test.com', 'teamleader4@test.com', 'teamleader5@test.com'],
            'Workers' => ['worker1@test.com', 'worker2@test.com', 'worker3@test.com', 'worker4@test.com', 'worker5@test.com', 'worker6@test.com', 'worker7@test.com', 'worker8@test.com', 'worker9@test.com', 'worker10@test.com'],
            'Supervisor Guests' => ['supervisorguest1@test.com', 'supervisorguest2@test.com', 'supervisorguest3@test.com'],
        ];

        $passwords = [
            'Super Admin' => 'admin123456',
            'HR Admin' => 'hradmin123456',
            'Project Managers' => 'projectmanager123456',
            'Supervisors' => 'supervisor123456',
            'Customers' => 'customer123456',
            'Accountants' => 'accountant123456',
            'Management' => 'management123456',
            'Designers' => 'designer123456',
            'Team Leaders' => 'teamleader123456',
            'Workers' => 'worker123456',
            'Supervisor Guests' => 'supervisorguest123456',
        ];

        foreach ($roleGroups as $roleName => $emails) {
            $this->command->info("👤 {$roleName} (Password: {$passwords[$roleName]}):");
            foreach ($emails as $email) {
                $this->command->info("   - {$email}");
            }
            $this->command->newLine();
        }
    }
}
