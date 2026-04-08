<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use App\Constants\Roles;

class AdminFullAccessSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $email = 'admin_full@betech.com';
        
        $admin = User::updateOrCreate(
            ['email' => $email],
            [
                'first_name' => 'System',
                'last_name' => 'Administrator',
                'name' => 'System Admin',
                'email' => $email,
                'password' => Hash::make('Betech@2026'),
                'role' => 'super_admin',
                'email_verified_at' => now(),
            ]
        );

        // Assign super_admin role if exists
        $superAdminRole = Role::where('name', 'super_admin')
            ->orWhere('name', 'Super Admin')
            ->first();

        if ($superAdminRole) {
            $exists = DB::table('role_user')
                ->where('user_id', $admin->id)
                ->where('role_id', $superAdminRole->id)
                ->exists();

            if (!$exists) {
                DB::table('role_user')->insert([
                    'user_id' => $admin->id,
                    'role_id' => $superAdminRole->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $this->command->info("Account $email seeded successfully with full access.");
    }
}
