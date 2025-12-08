<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::factory()->create([
            'first_name' => 'sender',
            'last_name'  => 'sender',
            'name'       => 'sender',
            'email'      => 'sender@gmail.com',
            'password'   => Hash::make('sender@gmail.com'),
            'owner'      => true,
            'role'      => 'sender',
        ]);

        User::factory()->create([
            'first_name' => 'customer',
            'last_name'  => 'customer',
            'name'       => 'customer',
            'email'      => 'customer@gmail.com',
            'password'   => Hash::make('customer@gmail.com'),
            'role'      => 'customer',
        ]);

        $this->call([
            RolePermissionSeeder::class, // Chạy trước để tạo roles và permissions
            AdminSeeder::class, // Sau đó mới tạo admins và gán roles
            AirportSeeder::class,
            AirlineSeeder::class,
            PaymentMethodSeeder::class,
        ]);
    }
}
