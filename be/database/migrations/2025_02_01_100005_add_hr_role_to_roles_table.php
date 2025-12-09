<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add HR role to roles table if it doesn't exist
        $hrRoleExists = DB::table('roles')->where('name', 'hr')->exists();

        if (!$hrRoleExists) {
            DB::table('roles')->insert([
                'name' => 'hr',
                'description' => 'Nhân viên quản lý nhân sự',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('roles')->where('name', 'hr')->delete();
    }
};
