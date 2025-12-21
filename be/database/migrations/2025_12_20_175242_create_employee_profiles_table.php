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
        Schema::create('employee_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('employee_code')->unique()->nullable(); // Mã nhân sự
            $table->string('full_name')->nullable(); // Họ tên
            $table->string('cccd', 20)->nullable(); // CCCD
            $table->date('date_of_birth')->nullable(); // Ngày sinh
            $table->string('place_of_birth')->nullable(); // Quê quán
            $table->string('phone', 20)->nullable(); // Số điện thoại
            $table->string('emergency_contact_name')->nullable(); // Tên người liên hệ khẩn cấp
            $table->string('emergency_contact_phone', 20)->nullable(); // SĐT người liên hệ khẩn cấp
            $table->string('education_level')->nullable(); // Trình độ học vấn
            $table->text('skills')->nullable(); // Tay nghề
            $table->string('profile_photo')->nullable(); // Ảnh hồ sơ
            $table->json('legal_documents')->nullable(); // Hồ sơ pháp lý (array of attachment IDs)
            
            // Phân loại nhân sự
            $table->enum('employee_type', [
                'official',        // Nhân sự chính thức
                'temporary',      // Nhân sự thời vụ / khoán
                'contracted',     // Nhân sự thuê ngoài / thầu phụ
                'engineer',       // Kỹ sư – chỉ huy trưởng – giám sát
                'worker'          // Công nhân theo đội / tổ / nhà thầu
            ])->default('official');
            
            $table->string('team_name')->nullable(); // Tên đội/tổ/nhà thầu
            $table->foreignId('subcontractor_id')->nullable()->constrained('subcontractors')->nullOnDelete(); // ID nhà thầu phụ
            
            $table->timestamps();
            $table->softDeletes();
            
            $table->index('employee_code');
            $table->index('employee_type');
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_profiles');
    }
};
