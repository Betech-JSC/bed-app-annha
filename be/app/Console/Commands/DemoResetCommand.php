<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

/**
 * Command reset toàn bộ database và seed demo data cho pitch/demo.
 *
 * Usage:
 *   php artisan demo:reset              # Reset + seed full demo data
 *   php artisan demo:reset --no-fresh   # Chỉ seed thêm data (không xóa DB)
 *   php artisan demo:reset --force      # Không hỏi xác nhận
 */
class DemoResetCommand extends Command
{
    protected $signature = 'demo:reset
        {--no-fresh : Chỉ seed data, không migrate:fresh}
        {--force : Không hỏi xác nhận}';

    protected $description = '🎬 Reset database và tạo mockup data cho demo/pitch sản phẩm';

    public function handle(): int
    {
        $this->newLine();
        $this->info('╔══════════════════════════════════════════════════════════╗');
        $this->info('║  🎬  BED CRM — DEMO DATA RESET                         ║');
        $this->info('║  Tạo toàn bộ dữ liệu mockup cho pitch & demo           ║');
        $this->info('╚══════════════════════════════════════════════════════════╝');
        $this->newLine();

        if (!$this->option('force')) {
            $this->warn('⚠️  Lệnh này sẽ XÓA TOÀN BỘ dữ liệu hiện tại và tạo lại dữ liệu demo!');
            if (!$this->confirm('Bạn chắc chắn muốn tiếp tục?', false)) {
                $this->info('❌ Đã hủy.');
                return 0;
            }
        }

        $startTime = microtime(true);

        // ── Step 1: Migrate fresh ──
        if (!$this->option('no-fresh')) {
            $this->info('');
            $this->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            $this->info('📦 Bước 1/3: Reset database (migrate:fresh)...');
            $this->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            $this->call('migrate:fresh', ['--force' => true]);

            $this->info('✅ Database đã được reset.');
        }

        // ── Step 2: Seed core data ──
        $this->newLine();
        $this->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        $this->info('👥 Bước 2/3: Tạo RBAC, Users, Master Data...');
        $this->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        $this->call('db:seed', ['--force' => true]);

        $this->info('✅ Core data (RBAC, Users, Settings) đã sẵn sàng.');

        // ── Step 3: Seed full demo data ──
        $this->newLine();
        $this->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        $this->info('🏗️  Bước 3/3: Tạo dữ liệu demo đầy đủ (16 modules)...');
        $this->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        $this->call('db:seed', [
            '--class' => 'FullSystemTestSeeder',
            '--force' => true,
        ]);

        // ── Summary ──
        $elapsed = round(microtime(true) - $startTime, 1);

        $this->newLine();
        $this->info('╔══════════════════════════════════════════════════════════╗');
        $this->info('║  ✅  DEMO DATA SẴN SÀNG!                               ║');
        $this->info('╠══════════════════════════════════════════════════════════╣');
        $this->info("║  ⏱  Thời gian: {$elapsed}s                                     ");
        $this->info('╠══════════════════════════════════════════════════════════╣');
        $this->info('║  🔑  Tài khoản đăng nhập CRM:                          ║');
        $this->info('║  ────────────────────────────────────────────────────    ║');
        $this->info('║  Super Admin:  superadmin@skysend.com / superadmin123   ║');
        $this->info('║  SA Test:      superadmin.test@test.com / superadmin123 ║');
        $this->info('║  PM:           pm1@test.com / pm123                     ║');
        $this->info('║  Accountant:   accountant1@test.com / accountant123     ║');
        $this->info('║  Supervisor:   supervisor1@test.com / supervisor123     ║');
        $this->info('║  Client:       client1@test.com / client123             ║');
        $this->info('╠══════════════════════════════════════════════════════════╣');
        $this->info('║  🌐  Truy cập: php artisan serve → http://localhost:8000║');
        $this->info('╚══════════════════════════════════════════════════════════╝');
        $this->newLine();

        return 0;
    }
}
