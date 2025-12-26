<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Receipt;
use App\Models\MaterialSupplier;
use App\Models\Cost;
use App\Models\User;
use Illuminate\Database\Seeder;

class ReceiptSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $projects = Project::limit(3)->get();
        $suppliers = MaterialSupplier::limit(3)->get();
        $users = User::whereIn('role', ['manager', 'accountant'])->get();

        if ($projects->isEmpty()) {
            $this->command->warn('Chưa có dự án. Vui lòng chạy ProjectSeeder trước.');
            return;
        }

        if ($users->isEmpty()) {
            $this->command->warn('Chưa có users. Vui lòng chạy UserSeeder trước.');
            return;
        }

        $receipts = [];

        foreach ($projects as $project) {
            // Chứng từ mua hàng
            $receipts[] = [
                'project_id' => $project->id,
                'receipt_date' => now()->subMonths(1),
                'type' => 'purchase',
                'supplier_id' => $suppliers->first()?->id,
                'amount' => 50000000,
                'payment_method' => 'bank_transfer',
                'description' => 'Mua xi măng, thép, gạch cho dự án',
                'status' => 'verified',
                'created_by' => $users->first()->id,
                'verified_by' => $users->where('role', 'accountant')->first()?->id ?? $users->first()->id,
                'verified_at' => now()->subMonths(1)->addDays(1),
            ];

            // Chứng từ chi phí
            $receipts[] = [
                'project_id' => $project->id,
                'receipt_date' => now()->subDays(15),
                'type' => 'expense',
                'supplier_id' => $suppliers->skip(1)->first()?->id,
                'amount' => 10000000,
                'payment_method' => 'cash',
                'description' => 'Chi phí vận chuyển vật liệu',
                'status' => 'verified',
                'created_by' => $users->first()->id,
                'verified_by' => $users->where('role', 'accountant')->first()?->id ?? $users->first()->id,
                'verified_at' => now()->subDays(14),
            ];

            // Chứng từ thanh toán
            $receipts[] = [
                'project_id' => $project->id,
                'receipt_date' => now()->subDays(5),
                'type' => 'payment',
                'supplier_id' => $suppliers->skip(2)->first()?->id,
                'amount' => 30000000,
                'payment_method' => 'bank_transfer',
                'description' => 'Thanh toán tiền nhà thầu phụ',
                'status' => 'draft',
                'created_by' => $users->first()->id,
            ];
        }

        foreach ($receipts as $receipt) {
            Receipt::create($receipt);
        }

        $this->command->info('Đã tạo ' . count($receipts) . ' chứng từ.');
    }
}

