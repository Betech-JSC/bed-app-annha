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
        Schema::table('time_tracking', function (Blueprint $table) {
            // Check-in method: card, qr, gps, faceid
            $table->enum('check_in_method', ['card', 'qr', 'gps', 'faceid', 'manual'])->default('manual')->after('check_in_at');

            // Shift information
            $table->string('shift')->nullable()->after('check_in_method'); // ca1, ca2, ca3, etc.
            $table->date('work_date')->nullable()->after('shift'); // Ngày làm việc

            // GPS coordinates
            $table->decimal('check_in_latitude', 10, 8)->nullable()->after('check_in_location');
            $table->decimal('check_in_longitude', 10, 8)->nullable()->after('check_in_latitude');
            $table->decimal('check_out_latitude', 10, 8)->nullable()->after('check_out_location');
            $table->decimal('check_out_longitude', 10, 8)->nullable()->after('check_out_latitude');

            // QR code data
            $table->string('qr_code')->nullable()->after('check_in_method');

            // FaceID data
            $table->string('face_id_photo')->nullable()->after('qr_code');

            // Overtime information
            $table->boolean('is_overtime')->default(false)->after('total_hours');
            $table->enum('overtime_type', ['weekday', 'weekend', 'holiday'])->nullable()->after('is_overtime');
            $table->decimal('overtime_hours', 8, 2)->nullable()->after('overtime_type');
            $table->decimal('overtime_multiplier', 4, 2)->nullable()->after('overtime_hours'); // Hệ số OT
            $table->unsignedBigInteger('overtime_category_id')->nullable()->after('overtime_multiplier'); // Hạng mục OT - Foreign key sẽ được thêm sau

            // Team check-in (chấm công tập thể)
            $table->unsignedBigInteger('team_check_in_id')->nullable()->after('overtime_category_id'); // Foreign key sẽ được thêm sau

            // Offline sync
            $table->boolean('is_offline')->default(false)->after('team_check_in_id');
            $table->timestamp('synced_at')->nullable()->after('is_offline');

            // Indexes
            $table->index('work_date');
            $table->index('shift');
            $table->index('is_overtime');
            $table->index('team_check_in_id');
            $table->index('overtime_category_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('time_tracking', function (Blueprint $table) {
            $table->dropColumn([
                'check_in_method',
                'shift',
                'work_date',
                'check_in_latitude',
                'check_in_longitude',
                'check_out_latitude',
                'check_out_longitude',
                'qr_code',
                'face_id_photo',
                'is_overtime',
                'overtime_type',
                'overtime_hours',
                'overtime_multiplier',
                'overtime_category_id',
                'team_check_in_id',
                'is_offline',
                'synced_at',
            ]);
        });
    }
};
