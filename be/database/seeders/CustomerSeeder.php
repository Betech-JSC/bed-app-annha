<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class CustomerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Tạo các users có role khách hàng để có thể chọn khi tạo dự án
     */
    public function run(): void
    {
        // Tạo hoặc lấy role "Khách hàng"
        $customerRole = Role::firstOrCreate(
            ['name' => 'Khách hàng'],
            [
                'description' => 'Vai trò khách hàng - người sử dụng dịch vụ',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // Tạo hoặc lấy role "Customer" (tiếng Anh) để đảm bảo tìm kiếm hoạt động
        $customerRoleEn = Role::firstOrCreate(
            ['name' => 'Customer'],
            [
                'description' => 'Customer role - service users',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        $this->command->info('✅ Đã tạo/cập nhật roles: Khách hàng và Customer');

        // Danh sách khách hàng mẫu
        $customers = [
            [
                'email' => 'khachhang1@example.com',
                'first_name' => 'Nguyễn',
                'last_name' => 'Văn An',
                'name' => 'Nguyễn Văn An',
                'password' => 'customer123',
                'role' => 'customer',
                'phone' => '+84901234580',
            ],
            [
                'email' => 'khachhang2@example.com',
                'first_name' => 'Trần',
                'last_name' => 'Thị Bình',
                'name' => 'Trần Thị Bình',
                'password' => 'customer123',
                'role' => 'customer',
                'phone' => '+84901234581',
            ],
            [
                'email' => 'khachhang3@example.com',
                'first_name' => 'Lê',
                'last_name' => 'Văn Cường',
                'name' => 'Lê Văn Cường',
                'password' => 'customer123',
                'role' => 'customer',
                'phone' => '+84901234582',
            ],
            [
                'email' => 'khachhang4@example.com',
                'first_name' => 'Phạm',
                'last_name' => 'Thị Dung',
                'name' => 'Phạm Thị Dung',
                'password' => 'customer123',
                'role' => 'customer',
                'phone' => '+84901234583',
            ],
            [
                'email' => 'khachhang5@example.com',
                'first_name' => 'Hoàng',
                'last_name' => 'Văn Em',
                'name' => 'Hoàng Văn Em',
                'password' => 'customer123',
                'role' => 'customer',
                'phone' => '+84901234584',
            ],
            [
                'email' => 'customer1@example.com',
                'first_name' => 'Võ',
                'last_name' => 'Thị Phương',
                'name' => 'Võ Thị Phương',
                'password' => 'customer123',
                'role' => 'customer',
                'phone' => '+84901234585',
            ],
            [
                'email' => 'customer2@example.com',
                'first_name' => 'Đặng',
                'last_name' => 'Văn Giang',
                'name' => 'Đặng Văn Giang',
                'password' => 'customer123',
                'role' => 'customer',
                'phone' => '+84901234586',
            ],
            [
                'email' => 'customer3@example.com',
                'first_name' => 'Bùi',
                'last_name' => 'Thị Hoa',
                'name' => 'Bùi Thị Hoa',
                'password' => 'customer123',
                'role' => 'customer',
                'phone' => '+84901234587',
            ],
        ];

        $this->command->info('Đang tạo users với role khách hàng...');
        $this->command->newLine();

        foreach ($customers as $customerData) {
            // Tạo hoặc cập nhật user
            $user = User::firstOrCreate(
                ['email' => $customerData['email']],
                [
                    'first_name' => $customerData['first_name'],
                    'last_name' => $customerData['last_name'],
                    'name' => $customerData['name'],
                    'email' => $customerData['email'],
                    'password' => Hash::make($customerData['password']),
                    'role' => $customerData['role'],
                    'phone' => $customerData['phone'],
                    'owner' => false,
                    'email_verified_at' => now(),
                ]
            );

            // Cập nhật lại nếu đã tồn tại
            if (!$user->wasRecentlyCreated) {
                $user->update([
                    'name' => $customerData['name'],
                    'first_name' => $customerData['first_name'],
                    'last_name' => $customerData['last_name'],
                    'password' => Hash::make($customerData['password']),
                    'role' => $customerData['role'],
                    'phone' => $customerData['phone'],
                    'email_verified_at' => now(),
                ]);
            }

            // Gán role "Khách hàng" cho user (nếu chưa có)
            if (!$user->roles()->where('roles.id', $customerRole->id)->exists()) {
                $user->roles()->attach($customerRole->id);
            }

            // Gán role "Customer" cho user (nếu chưa có)
            if (!$user->roles()->where('roles.id', $customerRoleEn->id)->exists()) {
                $user->roles()->attach($customerRoleEn->id);
            }

            $this->command->info("✅ Đã tạo/cập nhật: {$user->email} ({$user->name}) - Role: {$customerData['role']}");
        }

        $this->command->newLine();
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info('✅ Đã tạo tất cả users với role khách hàng!');
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();
        $this->command->info('📋 Danh sách tài khoản khách hàng:');
        $this->command->newLine();

        foreach ($customers as $customer) {
            $this->command->info("   📧 Email: {$customer['email']} | Password: {$customer['password']} | Tên: {$customer['name']}");
        }

        $this->command->newLine();
        $this->command->info('💡 Bạn có thể sử dụng các tài khoản này để chọn khách hàng khi tạo dự án mới.');
        $this->command->newLine();
    }
}
