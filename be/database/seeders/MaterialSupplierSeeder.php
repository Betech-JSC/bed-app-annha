<?php

namespace Database\Seeders;

use App\Models\MaterialSupplier;
use Illuminate\Database\Seeder;

class MaterialSupplierSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $suppliers = [
            [
                'name' => 'Công ty Vật liệu Xây dựng ABC',
                'code' => 'NCC-ABC',
                'contact_person' => 'Nguyễn Văn A',
                'phone' => '0901234567',
                'email' => 'contact@abc-construction.com',
                'address' => '123 Đường ABC, Quận 1, TP.HCM',
                'tax_code' => '1234567890',
                'status' => 'active',
            ],
            [
                'name' => 'Công ty Xi măng XYZ',
                'code' => 'NCC-XYZ',
                'contact_person' => 'Trần Thị B',
                'phone' => '0907654321',
                'email' => 'info@xyz-cement.com',
                'address' => '456 Đường XYZ, Quận 2, TP.HCM',
                'tax_code' => '0987654321',
                'status' => 'active',
            ],
            [
                'name' => 'Công ty Thép DEF',
                'code' => 'NCC-DEF',
                'contact_person' => 'Lê Văn C',
                'phone' => '0909876543',
                'email' => 'sales@def-steel.com',
                'address' => '789 Đường DEF, Quận 3, TP.HCM',
                'tax_code' => '1122334455',
                'status' => 'active',
            ],
            [
                'name' => 'Công ty Gạch GHI',
                'code' => 'NCC-GHI',
                'contact_person' => 'Phạm Thị D',
                'phone' => '0905556667',
                'email' => 'contact@ghi-brick.com',
                'address' => '321 Đường GHI, Quận 4, TP.HCM',
                'tax_code' => '5566778899',
                'status' => 'active',
            ],
        ];

        foreach ($suppliers as $supplier) {
            MaterialSupplier::create($supplier);
        }

        $this->command->info('Đã tạo ' . count($suppliers) . ' nhà cung cấp vật liệu.');
    }
}

