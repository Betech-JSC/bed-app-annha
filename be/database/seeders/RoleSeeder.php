<?php

namespace Database\Seeders;

use App\Constants\Roles;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Creates core roles only. No business logic here.
     * All authorization is done through permissions.
     */
    public function run(): void
    {
        $this->command->info('Creating core roles...');

        $roles = [
            [
                'name' => Roles::SUPER_ADMIN,
                'description' => Roles::descriptions()[Roles::SUPER_ADMIN],
            ],
            [
                'name' => Roles::ADMIN,
                'description' => Roles::descriptions()[Roles::ADMIN],
            ],
            [
                'name' => Roles::PROJECT_OWNER,
                'description' => Roles::descriptions()[Roles::PROJECT_OWNER],
            ],
            [
                'name' => Roles::PROJECT_MANAGER,
                'description' => Roles::descriptions()[Roles::PROJECT_MANAGER],
            ],
            [
                'name' => Roles::SITE_SUPERVISOR,
                'description' => Roles::descriptions()[Roles::SITE_SUPERVISOR],
            ],
            [
                'name' => Roles::ACCOUNTANT,
                'description' => Roles::descriptions()[Roles::ACCOUNTANT],
            ],
            [
                'name' => Roles::CLIENT,
                'description' => Roles::descriptions()[Roles::CLIENT],
            ],
        ];

        foreach ($roles as $roleData) {
            $role = Role::firstOrCreate(
                ['name' => $roleData['name']],
                $roleData
            );

            if ($role->wasRecentlyCreated) {
                $this->command->info("✅ Created role: {$role->name}");
            } else {
                // Update description if role exists but description changed
                if ($role->description !== $roleData['description']) {
                    $role->update(['description' => $roleData['description']]);
                    $this->command->info("🔄 Updated role: {$role->name}");
                }
            }
        }

        $this->command->newLine();
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info('✅ Core roles created successfully!');
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();
    }
}
