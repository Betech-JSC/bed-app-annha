<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('project_personnel', function (Blueprint $table) {
            if (!Schema::hasColumn('project_personnel', 'role_id')) {
                $table->foreignId('role_id')->nullable()->after('user_id')->constrained('personnel_roles')->nullOnDelete();
            }
            if (!Schema::hasColumn('project_personnel', 'permissions')) {
                $table->json('permissions')->nullable()->after('role_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('project_personnel', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
            $table->dropColumn(['role_id', 'permissions']);
        });
    }
};
