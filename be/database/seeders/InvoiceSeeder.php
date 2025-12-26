<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Invoice;
use Illuminate\Database\Seeder;

class InvoiceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $projects = Project::with('customer')->limit(3)->get();

        if ($projects->isEmpty()) {
            $this->command->warn('Chưa có dự án. Vui lòng chạy ProjectSeeder trước.');
            return;
        }

        foreach ($projects as $project) {
            // Tạo 2-3 hóa đơn cho mỗi dự án
            $invoices = [
                [
                    'project_id' => $project->id,
                    'customer_id' => $project->customer_id,
                    'invoice_date' => now()->subMonths(2),
                    'due_date' => now()->subMonths(1),
                    'subtotal' => 2000000000,
                    'tax_amount' => 200000000,
                    'discount_amount' => 0,
                    'total_amount' => 2200000000,
                    'description' => 'Hóa đơn thanh toán đợt 1 - Khởi công',
                    'status' => 'paid',
                    'paid_date' => now()->subMonths(1)->addDays(5),
                    'created_by' => $project->created_by,
                ],
                [
                    'project_id' => $project->id,
                    'customer_id' => $project->customer_id,
                    'invoice_date' => now()->subMonths(1),
                    'due_date' => now()->addDays(15),
                    'subtotal' => 3000000000,
                    'tax_amount' => 300000000,
                    'discount_amount' => 0,
                    'total_amount' => 3300000000,
                    'description' => 'Hóa đơn thanh toán đợt 2 - Thi công phần thô',
                    'status' => 'sent',
                    'created_by' => $project->created_by,
                ],
                [
                    'project_id' => $project->id,
                    'customer_id' => $project->customer_id,
                    'invoice_date' => now(),
                    'due_date' => now()->addMonths(1),
                    'subtotal' => 2500000000,
                    'tax_amount' => 250000000,
                    'discount_amount' => 100000000,
                    'total_amount' => 2650000000,
                    'description' => 'Hóa đơn thanh toán đợt 3 - Hoàn thiện',
                    'status' => 'draft',
                    'created_by' => $project->created_by,
                ],
            ];

            foreach ($invoices as $invoice) {
                Invoice::create($invoice);
            }
        }

        $this->command->info('Đã tạo hóa đơn cho ' . $projects->count() . ' dự án.');
    }
}

