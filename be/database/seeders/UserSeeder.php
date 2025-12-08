<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('users')->insert([
            [
                'id' => 1,
                'account_id' => 1001,
                'first_name' => 'An',
                'last_name' => 'Nguyen',
                'email' => 'an.sender@example.com',
                'password' => Hash::make('password'),
                'owner' => false,
                'photo_path' => null,
                'remember_token' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 2,
                'account_id' => 1002,
                'first_name' => 'Binh',
                'last_name' => 'Tran',
                'email' => 'binh.receiver@example.com',
                'password' => Hash::make('password'),
                'owner' => false,
                'photo_path' => null,
                'remember_token' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 3,
                'account_id' => 1003,
                'first_name' => 'Cuong',
                'last_name' => 'Pham',
                'email' => 'cuong.courier@example.com',
                'password' => Hash::make('password'),
                'owner' => false,
                'photo_path' => null,
                'remember_token' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 4,
                'account_id' => 1004,
                'first_name' => 'Admin',
                'last_name' => 'Betech',
                'email' => 'admin@example.com',
                'password' => Hash::make('admin123'),
                'owner' => true,
                'photo_path' => null,
                'remember_token' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
