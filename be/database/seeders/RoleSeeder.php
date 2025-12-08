<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('roles')->insert([
            ['id' => 1, 'name' => 'sender', 'display_name' => 'Người gửi', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 2, 'name' => 'receiver', 'display_name' => 'Người nhận', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 3, 'name' => 'courier', 'display_name' => 'Người vận chuyển', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 4, 'name' => 'admin', 'display_name' => 'Quản trị viên', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}
