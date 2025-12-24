<?php

namespace Database\Seeders;

use App\Models\GlobalSubcontractor;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class GlobalSubcontractorSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $subcontractors = [
            [
                'name' => 'Công ty Xây dựng ABC',
                'code' => 'ABC001',
                'contact_person' => 'Nguyễn Văn A',
                'phone' => '0901234567',
                'email' => 'contact@abc-construction.com',
                'address' => '123 Đường ABC, Quận 1, TP.HCM',
                'tax_code' => '0123456789',
                'notes' => 'Chuyên về xây dựng dân dụng',
                'is_active' => true,
            ],
            [
                'name' => 'Công ty Điện nước XYZ',
                'code' => 'XYZ001',
                'contact_person' => 'Trần Thị B',
                'phone' => '0907654321',
                'email' => 'info@xyz-electrical.com',
                'address' => '456 Đường XYZ, Quận 2, TP.HCM',
                'tax_code' => '0987654321',
                'notes' => 'Chuyên về điện nước, điều hòa',
                'is_active' => true,
            ],
            [
                'name' => 'Công ty Sơn và Hoàn thiện DEF',
                'code' => 'DEF001',
                'contact_person' => 'Lê Văn C',
                'phone' => '0912345678',
                'email' => 'sales@def-paint.com',
                'address' => '789 Đường DEF, Quận 3, TP.HCM',
                'tax_code' => '0111222333',
                'notes' => 'Chuyên về sơn, ốp lát, hoàn thiện',
                'is_active' => true,
            ],
        ];

        $this->command->info('Đang tạo các nhà thầu phụ...');

        // Lấy admin user đầu tiên làm created_by
        $adminUser = User::where('role', 'admin')->orWhere('owner', true)->first();

        foreach ($subcontractors as $subcontractorData) {
            $subcontractor = GlobalSubcontractor::firstOrCreate(
                ['code' => $subcontractorData['code']],
                array_merge($subcontractorData, [
                    'uuid' => Str::uuid(),
                    'created_by' => $adminUser?->id,
                ])
            );

            if ($subcontractor->wasRecentlyCreated) {
                $this->command->info("✅ Đã tạo nhà thầu phụ: {$subcontractor->name}");
            } else {
                $this->command->info("⏭️  Nhà thầu phụ đã tồn tại: {$subcontractor->name}");
            }
        }

        $this->command->newLine();
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info('✅ Đã tạo ' . count($subcontractors) . ' nhà thầu phụ!');
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();
    }
}

