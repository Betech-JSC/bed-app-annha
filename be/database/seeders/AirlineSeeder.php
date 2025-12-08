<?php

namespace Database\Seeders;

use App\Models\Airline;
use Illuminate\Database\Seeder;

class AirlineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Danh sách hãng bay nội địa Việt Nam
        $airlines = [
            [
                'iata_code'       => 'VN',
                'icao_code'       => 'HVN',
                'name_vi'         => 'Vietnam Airlines',
                'name_en'         => 'Vietnam Airlines',
                'call_sign'       => 'VIET NAM AIRLINES',
                'headquarter_city'=> 'Hà Nội',
                'country'         => 'Vietnam',
                'website'         => 'https://www.vietnamairlines.com',
                'logo_url'        => null,
                'status'          => 'active',
            ],
            [
                'iata_code'       => 'VJ',
                'icao_code'       => 'VJC',
                'name_vi'         => 'VietJet Air',
                'name_en'         => 'VietJet Air',
                'call_sign'       => 'VIETJETAIR',
                'headquarter_city'=> 'TP. Hồ Chí Minh',
                'country'         => 'Vietnam',
                'website'         => 'https://www.vietjetair.com',
                'logo_url'        => null,
                'status'          => 'active',
            ],
            [
                'iata_code'       => 'QH',
                'icao_code'       => 'BAV',
                'name_vi'         => 'Bamboo Airways',
                'name_en'         => 'Bamboo Airways',
                'call_sign'       => 'BAMBOO',
                'headquarter_city'=> 'Hà Nội',
                'country'         => 'Vietnam',
                'website'         => 'https://www.bambooairways.com',
                'logo_url'        => null,
                'status'          => 'active',
            ],
            [
                'iata_code'       => 'BL',
                'icao_code'       => 'PIC',
                'name_vi'         => 'Pacific Airlines',
                'name_en'         => 'Pacific Airlines',
                'call_sign'       => 'PACIFIC AIRLINES',
                'headquarter_city'=> 'TP. Hồ Chí Minh',
                'country'         => 'Vietnam',
                'website'         => 'https://www.pacificairlines.com',
                'logo_url'        => null,
                'status'          => 'active',
            ],
            [
                'iata_code'       => 'VU',
                'icao_code'       => 'VUA',
                'name_vi'         => 'Vietravel Airlines',
                'name_en'         => 'Vietravel Airlines',
                'call_sign'       => 'VIETRAVEL AIR',
                'headquarter_city'=> 'TP. Hồ Chí Minh',
                'country'         => 'Vietnam',
                'website'         => 'https://vietravelairlines.vn',
                'logo_url'        => null,
                'status'          => 'active',
            ],
            [
                'iata_code'       => '0V',
                'icao_code'       => 'VFC',
                'name_vi'         => 'Vasco',
                'name_en'         => 'Vietnam Air Services Company',
                'call_sign'       => 'VASCO AIR',
                'headquarter_city'=> 'TP. Hồ Chí Minh',
                'country'         => 'Vietnam',
                'website'         => 'https://www.vietnamairlines.com/vn/en/vasco',
                'logo_url'        => null,
                'status'          => 'active',
            ],
        ];

        Airline::truncate();

        foreach ($airlines as $airline) {
            Airline::create($airline);
        }

        \Cache::forget('airlines');

        $this->command->info('Đã import dữ liệu các hãng bay nội địa!');
    }
}

