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
        // 1. Drop foreign key in costs table
        Schema::table('costs', function (Blueprint $table) {
            $table->dropForeign(['time_tracking_id']);
            $table->dropIndex(['time_tracking_id']);
            $table->dropColumn('time_tracking_id');
        });

        // 2. Drop time_tracking table
        Schema::dropIfExists('time_tracking');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Recreate time_tracking table
        if (!Schema::hasTable('time_tracking')) {
            Schema::create('time_tracking', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->dateTime('check_in_at');
                $table->string('check_in_location')->nullable();
                $table->dateTime('check_out_at')->nullable();
                $table->string('check_out_location')->nullable();
                $table->decimal('total_hours', 8, 2)->nullable();
                // Advanced fields
                $table->enum('check_in_method', ['card', 'qr', 'gps', 'faceid', 'manual'])->default('manual');
                $table->string('shift')->nullable();
                $table->date('work_date')->nullable();
                $table->decimal('check_in_latitude', 10, 8)->nullable();
                $table->decimal('check_in_longitude', 10, 8)->nullable();
                $table->decimal('check_out_latitude', 10, 8)->nullable();
                $table->decimal('check_out_longitude', 10, 8)->nullable();
                $table->string('qr_code')->nullable();
                $table->string('face_id_photo')->nullable();
                $table->boolean('is_overtime')->default(false);
                $table->enum('overtime_type', ['weekday', 'weekend', 'holiday'])->nullable();
                $table->decimal('overtime_hours', 8, 2)->nullable();
                $table->decimal('overtime_multiplier', 4, 2)->nullable();
                $table->unsignedBigInteger('overtime_category_id')->nullable();
                $table->unsignedBigInteger('team_check_in_id')->nullable();
                $table->boolean('is_offline')->default(false);
                $table->timestamp('synced_at')->nullable();
                $table->timestamps();

                $table->index('check_in_at');
                $table->index('user_id');
            });
        }

        // 2. Add column back to costs table
        Schema::table('costs', function (Blueprint $table) {
            $table->foreignId('time_tracking_id')->nullable()->after('cost_group_id')->constrained('time_tracking')->nullOnDelete();
            $table->index('time_tracking_id');
        });
    }
};
