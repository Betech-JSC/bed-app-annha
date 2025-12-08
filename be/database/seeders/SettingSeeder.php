<?php

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('settings')->insert([
            [
                'key' => 'base_rate_per_km',
                'value' => '5000',
                'type' => 'decimal',
                'group' => 'fee',
                'description' => 'Phí cơ bản trên mỗi km',
            ],
            [
                'key' => 'rate_per_kg',
                'value' => '2000',
                'type' => 'decimal',
                'group' => 'fee',
                'description' => 'Phí vận chuyển theo mỗi kg hàng hóa',
            ],
            [
                'key' => 'minimum_fee',
                'value' => '20000',
                'type' => 'decimal',
                'group' => 'fee',
                'description' => 'Phí vận chuyển tối thiểu',
            ],
            [
                'key' => 'currency',
                'value' => 'VND',
                'type' => 'string',
                'group' => 'system',
                'description' => 'Đơn vị tiền tệ mặc định',
            ],
        ]);
    }
}
