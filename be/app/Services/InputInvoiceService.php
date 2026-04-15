<?php

namespace App\Services;

use App\Models\InputInvoice;
use App\Models\Cost;
use App\Models\Attachment;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class InputInvoiceService
{
    /**
     * Create a new input invoice and sync it with a project cost
     * 
     * @param array $data
     * @param User $user
     * @return InputInvoice
     */
    public function createInvoice(array $data, User $user): InputInvoice
    {
        return DB::transaction(function () use ($data, $user) {
            // Calculate VAT and totals
            $amountBeforeVat = $data['amount_before_vat'];
            $vatPercentage = $data['vat_percentage'] ?? 0;
            $vatAmount = ($amountBeforeVat * $vatPercentage) / 100;
            $totalAmount = $amountBeforeVat + $vatAmount;

            // Create Invoice
            $invoice = InputInvoice::create([
                'project_id' => $data['project_id'] ?? null,
                'invoice_type' => $data['invoice_type'] ?? null,
                'issue_date' => $data['issue_date'],
                'invoice_number' => $data['invoice_number'] ?? null,
                'supplier_name' => $data['supplier_name'] ?? null,
                'amount_before_vat' => $amountBeforeVat,
                'vat_percentage' => $vatPercentage,
                'vat_amount' => $vatAmount,
                'total_amount' => $totalAmount,
                'description' => $data['description'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $user->id,
            ]);

            // Sync Attachments
            if (!empty($data['attachment_ids'])) {
                Attachment::whereIn('id', $data['attachment_ids'])->update([
                    'attachable_type' => InputInvoice::class,
                    'attachable_id' => $invoice->id,
                ]);
            }

            // Sync with Project Cost
            if ($invoice->project_id) {
                $this->syncToCost($invoice, $user);
            }

            return $invoice->fresh(['project', 'creator', 'attachments']);
        });
    }

    /**
     * Update an existing input invoice
     * 
     * @param InputInvoice $invoice
     * @param array $data
     * @param User $user
     * @return InputInvoice
     */
    public function updateInvoice(InputInvoice $invoice, array $data, User $user): InputInvoice
    {
        return DB::transaction(function () use ($invoice, $data, $user) {
            $invoice->fill($data);
            
            // Recalculate totals if financial info changed
            if (isset($data['amount_before_vat']) || isset($data['vat_percentage'])) {
                $invoice->vat_amount = ($invoice->amount_before_vat * ($invoice->vat_percentage ?? 0)) / 100;
                $invoice->total_amount = $invoice->amount_before_vat + $invoice->vat_amount;
            }

            $invoice->save();

            // Sync Attachments
            if (isset($data['attachment_ids'])) {
                // Remove old links
                Attachment::where('attachable_type', InputInvoice::class)
                    ->where('attachable_id', $invoice->id)
                    ->update(['attachable_type' => null, 'attachable_id' => null]);
                
                // Add new links
                Attachment::whereIn('id', $data['attachment_ids'])->update([
                    'attachable_type' => InputInvoice::class,
                    'attachable_id' => $invoice->id,
                ]);
            }

            // Update linked cost
            $this->syncToCost($invoice, $user);

            return $invoice->fresh(['project', 'creator', 'attachments']);
        });
    }

    /**
     * Sync input invoice data to a project Cost record
     */
    protected function syncToCost(InputInvoice $invoice, User $user): void
    {
        $cost = Cost::updateOrCreate(
            ['input_invoice_id' => $invoice->id],
            [
                'project_id' => $invoice->project_id,
                'name' => "Hóa đơn đầu vào: " . ($invoice->supplier_name ?? 'N/A') . " (#" . ($invoice->invoice_number ?? 'N/A') . ")",
                'amount' => $invoice->total_amount,
                'cost_date' => $invoice->issue_date,
                'category' => 'construction_materials',
                'cost_group_id' => 1, // Vật liệu xây dựng
                'description' => "Đồng bộ từ hóa đơn đầu vào #" . $invoice->id,
                'status' => 'approved',
                'created_by' => $invoice->created_by,
                'accountant_approved_by' => $user->id,
                'accountant_approved_at' => now(),
            ]
        );
    }
}
