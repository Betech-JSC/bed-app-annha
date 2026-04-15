<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // 'employee' = Nhân viên nội bộ (được chấm công, tính lương)
            // 'customer' = Khách hàng (chỉ dùng app để theo dõi dự án)
            $table->enum('user_type', ['employee', 'customer'])
                ->default('employee')
                ->after('department_id')
                ->comment('Phân loại người dùng: employee=Nhân viên, customer=Khách hàng');
        });

    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('user_type');
        });
    }
};
