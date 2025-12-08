<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Airport;

class AirportSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Dữ liệu sân bay Việt Nam (chỉ lấy những trường cần thiết)
        $airports = [
            ["code" => "BMV", "city_code" => "BMV", "name_vi" => "Sân bay Ban Mê Thuột", "name_en" => "Ban Me Thuot Airport", "timezone" => "Asia/Ho_Chi_Minh", "country" => "Vietnam"],
            ["code" => "CAH", "city_code" => "CAH", "name_vi" => "Sân bay Cà Mau", "name_en" => "Ca Mau Airport", "timezone" => "Asia/Ho_Chi_Minh", "country" => "Vietnam"],
            ["code" => "CXR", "city_code" => "NHA", "name_vi" => "Sân bay Cam Ranh", "name_en" => "Cam Ranh Airport", "timezone" => "Asia/Ho_Chi_Minh", "country" => "Vietnam"],
            ["code" => "DAD", "city_code" => "DAD", "name_vi" => "Sân bay Đà Nẵng", "name_en" => "Da Nang International Airport", "timezone" => "Asia/Ho_Chi_Minh", "country" => "Vietnam"],
            ["code" => "DIN", "city_code" => "DIN", "name_vi" => "Sân bay Điện Biên Phủ", "name_en" => "Dien Bien Phu Airport", "timezone" => "Asia/Ho_Chi_Minh", "country" => "Vietnam"],
            ["code" => "DLI", "city_code" => "DLI", "name_vi" => "Sân bay Liên Khương", "name_en" => "Lien Khuong Airport", "timezone" => "Asia/Ho_Chi_Minh", "country" => "Vietnam"],
            ["code" => "HAN", "city_code" => "HAN", "name_vi" => "Sân bay Nội Bài", "name_en" => "Noi Bai International Airport", "timezone" => "Asia/Ho_Chi_Minh", "country" => "Vietnam"],
            ["code" => "HPH", "city_code" => "HPH", "name_vi" => "Sân bay Cát Bi", "name_en" => "Cat Bi International Airport", "timezone" => "Asia/Ho_Chi_Minh", "country" => "Vietnam"],
            ["code" => "HUI", "city_code" => "HUI", "name_vi" => "Sân bay Phú Bài", "name_en" => "Phu Bai International Airport", "timezone" => "Asia/Ho_Chi_Minh", "country" => "Vietnam"],
            ["code" => "PQC", "city_code" => "PQC", "name_vi" => "Sân bay Phú Quốc", "name_en" => "Phu Quoc Airport", "timezone" => "Asia/Ho_Chi_Minh", "country" => "Vietnam"],
            ["code" => "PXU", "city_code" => "PXU", "name_vi" => "Sân bay Pleiku", "name_en" => "Pleiku Airport", "timezone" => "Asia/Ho_Chi_Minh", "country" => "Vietnam"],
            ["code" => "SGN", "city_code" => "SGN", "name_vi" => "Sân bay Tân Sơn Nhất", "name_en" => "Tan Son Nhat International Airport", "timezone" => "Asia/Ho_Chi_Minh", "country" => "Vietnam"],
            ["code" => "TBB", "city_code" => "TBB", "name_vi" => "Sân bay Tuy Hòa", "name_en" => "Tuy Hoa Airport", "timezone" => "Asia/Ho_Chi_Minh", "country" => "Vietnam"],
            ["code" => "THD", "city_code" => "THD", "name_vi" => "Sân bay Thọ Xuân", "name_en" => "Tho Xuan Airport", "timezone" => "Asia/Ho_Chi_Minh", "country" => "Vietnam"],
            ["code" => "UIH", "city_code" => "UIH", "name_vi" => "Sân bay Phù Cát", "name_en" => "Phu Cat Airport", "timezone" => "Asia/Ho_Chi_Minh", "country" => "Vietnam"],
            ["code" => "VCA", "city_code" => "VCA", "name_vi" => "Sân bay Trà Nóc", "name_en" => "Tra Noc International Airport", "timezone" => "Asia/Ho_Chi_Minh", "country" => "Vietnam"],
            ["code" => "VCL", "city_code" => "VCL", "name_vi" => "Sân bay Chu Lai", "name_en" => "Chu Lai Airport", "timezone" => "Asia/Ho_Chi_Minh", "country" => "Vietnam"],
            ["code" => "VCS", "city_code" => "VCS", "name_vi" => "Sân bay Cỏ Ống", "name_en" => "Co Ong Airport", "timezone" => "Asia/Ho_Chi_Minh", "country" => "Vietnam"],
            ["code" => "VDH", "city_code" => "VDH", "name_vi" => "Sân bay Đồng Hới", "name_en" => "Dong Hoi Airport", "timezone" => "Asia/Ho_Chi_Minh", "country" => "Vietnam"],
            ["code" => "VDO", "city_code" => "VDO", "name_vi" => "Sân bay Vân Đồn", "name_en" => "Van Don Airport", "timezone" => "Asia/Ho_Chi_Minh", "country" => "Vietnam"],
            ["code" => "VII", "city_code" => "VII", "name_vi" => "Sân bay Vinh", "name_en" => "Vinh Airport", "timezone" => "Asia/Ho_Chi_Minh", "country" => "Vietnam"],
            ["code" => "VKG", "city_code" => "VKG", "name_vi" => "Sân bay Rạch Giá", "name_en" => "Rach Gia Airport", "timezone" => "Asia/Ho_Chi_Minh", "country" => "Vietnam"],
        ];

        // Xóa dữ liệu cũ trước khi insert (tránh trùng)
        Airport::truncate();

        foreach ($airports as $airport) {
            Airport::create([
                'code'       => $airport['code'],
                'city_code'  => $airport['city_code'],
                'name_vi'    => $airport['name_vi'],
                'name_en'    => $airport['name_en'],
                'timezone'   => $airport['timezone'],
                'country'    => $airport['country'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Tối ưu: Xóa cache nếu có
        \Cache::forget('vietnam_airports');
        \Cache::forget('all_airports');

        $this->command->info('Đã import thành công 22 sân bay Việt Nam!');
    }
}
