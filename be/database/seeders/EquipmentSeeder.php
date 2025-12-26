<?php

namespace Database\Seeders;

use App\Models\Equipment;
use Illuminate\Database\Seeder;

class EquipmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $equipment = [
            [
                'name' => 'Máy xúc đào CAT 320D',
                'code' => 'MX-CAT-320D',
                'category' => 'Máy xúc',
                'type' => 'owned',
                'brand' => 'Caterpillar',
                'model' => '320D',
                'serial_number' => 'CAT320D-001',
                'purchase_date' => now()->subYears(2),
                'purchase_price' => 2500000000,
                'maintenance_interval_days' => 30,
                'last_maintenance_date' => now()->subDays(15),
                'next_maintenance_date' => now()->addDays(15),
                'status' => 'available',
                'notes' => 'Máy xúc đào đa năng, công suất lớn',
            ],
            [
                'name' => 'Cần cẩu 25 tấn',
                'code' => 'CC-25T',
                'category' => 'Cần cẩu',
                'type' => 'owned',
                'brand' => 'Liebherr',
                'model' => 'LTM 1025',
                'serial_number' => 'LTM1025-001',
                'purchase_date' => now()->subYears(1),
                'purchase_price' => 3500000000,
                'maintenance_interval_days' => 60,
                'last_maintenance_date' => now()->subDays(30),
                'next_maintenance_date' => now()->addDays(30),
                'status' => 'available',
                'notes' => 'Cần cẩu tự hành, tải trọng 25 tấn',
            ],
            [
                'name' => 'Máy trộn bê tông 350L',
                'code' => 'MTBT-350L',
                'category' => 'Máy trộn',
                'type' => 'owned',
                'brand' => 'Hòa Phát',
                'model' => 'HP-350',
                'serial_number' => 'HP350-001',
                'purchase_date' => now()->subMonths(6),
                'purchase_price' => 45000000,
                'maintenance_interval_days' => 30,
                'last_maintenance_date' => now()->subDays(10),
                'next_maintenance_date' => now()->addDays(20),
                'status' => 'in_use',
                'notes' => 'Máy trộn bê tông tự hành, dung tích 350L',
            ],
            [
                'name' => 'Máy đầm bê tông',
                'code' => 'MDBT-001',
                'category' => 'Dụng cụ',
                'type' => 'owned',
                'brand' => 'Bosch',
                'model' => 'GVC 22',
                'serial_number' => 'BOSCH-GVC22-001',
                'purchase_date' => now()->subMonths(3),
                'purchase_price' => 8000000,
                'maintenance_interval_days' => 90,
                'last_maintenance_date' => now()->subDays(20),
                'next_maintenance_date' => now()->addDays(70),
                'status' => 'available',
                'notes' => 'Máy đầm bê tông cầm tay, công suất 1.5kW',
            ],
            [
                'name' => 'Xe tải 5 tấn',
                'code' => 'XT-5T',
                'category' => 'Xe tải',
                'type' => 'owned',
                'brand' => 'Hyundai',
                'model' => 'HD270',
                'serial_number' => 'HD270-001',
                'purchase_date' => now()->subYears(3),
                'purchase_price' => 650000000,
                'maintenance_interval_days' => 30,
                'last_maintenance_date' => now()->subDays(5),
                'next_maintenance_date' => now()->addDays(25),
                'status' => 'available',
                'notes' => 'Xe tải vận chuyển vật liệu, tải trọng 5 tấn',
            ],
        ];

        foreach ($equipment as $item) {
            Equipment::create($item);
        }

        $this->command->info('Đã tạo ' . count($equipment) . ' thiết bị.');
    }
}

