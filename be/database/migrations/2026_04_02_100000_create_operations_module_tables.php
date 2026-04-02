<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ============================================================
        // 1. SHAREHOLDERS — Quản lý nguồn vốn / cổ đông
        // ============================================================
        Schema::create('shareholders', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('name');                       // Tên cổ đông
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('id_number')->nullable();      // CCCD/CMND
            $table->decimal('contributed_amount', 18, 2)->default(0); // Số tiền góp
            $table->decimal('share_percentage', 8, 4)->default(0);   // Tỷ lệ %
            $table->date('contribution_date')->nullable();            // Ngày góp vốn
            $table->string('status')->default('active');  // active, inactive
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });

        // ============================================================
        // 2. COMPANY ASSETS — Quản lý tài sản công ty
        // ============================================================
        Schema::create('company_assets', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('asset_code')->unique();          // Mã tài sản (QR code)
            $table->string('name');                           // Tên tài sản
            $table->string('category');                       // Loại: computer, machinery, vehicle, furniture, other
            $table->decimal('purchase_price', 18, 2);         // Giá mua
            $table->date('purchase_date');                     // Ngày mua
            $table->integer('useful_life_months')->default(36); // Thời gian sử dụng (tháng)
            $table->string('depreciation_method')->default('straight_line'); // straight_line, declining_balance
            $table->decimal('residual_value', 18, 2)->default(0); // Giá trị còn lại tối thiểu
            $table->decimal('current_value', 18, 2)->default(0);  // Giá trị hiện tại
            $table->decimal('accumulated_depreciation', 18, 2)->default(0); // Khấu hao lũy kế
            $table->string('status')->default('in_stock');    // in_stock, in_use, under_repair, disposed
            $table->string('location')->nullable();           // Vị trí hiện tại
            $table->unsignedBigInteger('assigned_to')->nullable(); // Người đang sử dụng
            $table->unsignedBigInteger('project_id')->nullable();  // Dự án đang dùng
            $table->string('serial_number')->nullable();
            $table->string('brand')->nullable();
            $table->text('description')->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('assigned_to')->references('id')->on('users')->nullOnDelete();
            $table->foreign('project_id')->references('id')->on('projects')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });

        // Lịch sử khấu hao hàng tháng
        Schema::create('asset_depreciations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_asset_id')->constrained()->cascadeOnDelete();
            $table->date('depreciation_date');              // Tháng khấu hao
            $table->decimal('amount', 18, 2);               // Số tiền khấu hao tháng đó
            $table->decimal('remaining_value', 18, 2);      // Giá trị còn lại sau khấu hao
            $table->timestamps();
        });

        // Lịch sử gán/chuyển tài sản
        Schema::create('asset_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_asset_id')->constrained()->cascadeOnDelete();
            $table->string('action'); // assign, return, transfer, repair, dispose
            $table->unsignedBigInteger('user_id')->nullable();
            $table->unsignedBigInteger('project_id')->nullable();
            $table->string('location')->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('performed_by')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('project_id')->references('id')->on('projects')->nullOnDelete();
            $table->foreign('performed_by')->references('id')->on('users')->nullOnDelete();
        });

        // ============================================================
        // 3. Thêm expense_category vào costs (CAPEX/OPEX/Payroll)
        // ============================================================
        Schema::table('costs', function (Blueprint $table) {
            $table->string('expense_category')->nullable()->after('cost_group_id');
            // Values: capex, opex, payroll
        });
    }

    public function down(): void
    {
        Schema::table('costs', function (Blueprint $table) {
            $table->dropColumn('expense_category');
        });
        Schema::dropIfExists('asset_assignments');
        Schema::dropIfExists('asset_depreciations');
        Schema::dropIfExists('company_assets');
        Schema::dropIfExists('shareholders');
    }
};
