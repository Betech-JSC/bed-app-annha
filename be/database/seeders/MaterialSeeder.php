<?php

namespace Database\Seeders;

use App\Models\Material;
use Illuminate\Database\Seeder;

class MaterialSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $materials = [
            [
                'name' => 'Xi măng PC40',
                'code' => 'XM-PC40',
                'unit' => 'bao',
                'category' => 'Vật liệu xây dựng',
                'unit_price' => 85000,
                'min_stock' => 100,
                'max_stock' => 1000,
                'description' => 'Xi măng Portland PC40, chất lượng cao',
                'status' => 'active',
            ],
            [
                'name' => 'Thép D10',
                'code' => 'TEP-D10',
                'unit' => 'kg',
                'category' => 'Vật liệu xây dựng',
                'unit_price' => 18000,
                'min_stock' => 500,
                'max_stock' => 5000,
                'description' => 'Thép cốt bê tông D10, đường kính 10mm',
                'status' => 'active',
            ],
            [
                'name' => 'Gạch ống 8x8x19',
                'code' => 'GACH-8x8x19',
                'unit' => 'viên',
                'category' => 'Vật liệu xây dựng',
                'unit_price' => 1200,
                'min_stock' => 1000,
                'max_stock' => 50000,
                'description' => 'Gạch ống đất nung, kích thước 8x8x19cm',
                'status' => 'active',
            ],
            [
                'name' => 'Cát vàng',
                'code' => 'CAT-VANG',
                'unit' => 'm3',
                'category' => 'Vật liệu xây dựng',
                'unit_price' => 250000,
                'min_stock' => 10,
                'max_stock' => 100,
                'description' => 'Cát vàng xây dựng, sạch, không lẫn tạp chất',
                'status' => 'active',
            ],
            [
                'name' => 'Đá 1x2',
                'code' => 'DA-1x2',
                'unit' => 'm3',
                'category' => 'Vật liệu xây dựng',
                'unit_price' => 280000,
                'min_stock' => 10,
                'max_stock' => 100,
                'description' => 'Đá dăm 1x2, dùng cho bê tông',
                'status' => 'active',
            ],
            [
                'name' => 'Ống nước PVC D21',
                'code' => 'ONG-PVC-D21',
                'unit' => 'm',
                'category' => 'Phụ kiện',
                'unit_price' => 15000,
                'min_stock' => 50,
                'max_stock' => 500,
                'description' => 'Ống nước PVC đường kính 21mm',
                'status' => 'active',
            ],
            [
                'name' => 'Dây điện 2.5mm2',
                'code' => 'DAY-DIEN-2.5',
                'unit' => 'm',
                'category' => 'Phụ kiện',
                'unit_price' => 12000,
                'min_stock' => 100,
                'max_stock' => 1000,
                'description' => 'Dây điện đồng 2.5mm2, cách điện PVC',
                'status' => 'active',
            ],
        ];

        foreach ($materials as $material) {
            Material::create($material);
        }

        $this->command->info('Đã tạo ' . count($materials) . ' vật liệu.');
    }
}

