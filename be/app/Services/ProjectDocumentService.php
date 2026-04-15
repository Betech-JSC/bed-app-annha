<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Attachment;
use App\Models\SupplierAcceptance;
use App\Models\Invoice;
use Illuminate\Support\Facades\DB;
use Exception;

class ProjectDocumentService
{
    /**
     * Attach an existing attachment to a project
     */
    public function attachToProject(Project $project, int $attachmentId, ?string $description = null): Attachment
    {
        $attachment = Attachment::findOrFail($attachmentId);

        $attachment->update([
            'attachable_type' => Project::class,
            'attachable_id' => $project->id,
            'description' => $description,
        ]);

        return $attachment;
    }

    /**
     * Update document description
     */
    public function updateDescription(Attachment $attachment, ?string $description): Attachment
    {
        $attachment->update([
            'description' => $description,
        ]);

        return $attachment;
    }

    /**
     * Remove document from project
     */
    public function removeFromProject(Attachment $attachment): bool
    {
        return $attachment->delete();
    }

    /**
     * Get all documents for a project with filters
     */
    public function getProjectDocuments(Project $project, array $filters = [])
    {
        $query = $project->attachments();

        if (!empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        return $query->orderByDesc('created_at')->get();
    }

    /**
     * Create Project Invoice
     */
    public function createInvoice(Project $project, array $data, $actor): Invoice
    {
        return DB::transaction(function () use ($project, $data, $actor) {
            $subtotal = (float)($data['subtotal'] ?? 0);
            $taxAmount = (float)($data['tax_amount'] ?? 0);
            $discountAmount = (float)($data['discount_amount'] ?? 0);
            $totalAmount = $subtotal + $taxAmount - $discountAmount;

            $attachmentIds = $data['attachment_ids'] ?? [];
            unset($data['attachment_ids']);

            $invoice = Invoice::create([
                'project_id' => $project->id,
                'cost_group_id' => $data['cost_group_id'],
                'invoice_date' => $data['invoice_date'] ?? now(),
                'customer_id' => $project->customer_id,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'discount_amount' => $discountAmount,
                'total_amount' => $totalAmount,
                'description' => $data['description'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $actor->id,
            ]);

            if (!empty($attachmentIds)) {
                $this->attachFilesToInvoice($invoice, $attachmentIds, $actor);
            }

            return $invoice->fresh(['customer', 'creator', 'costGroup', 'attachments']);
        });
    }

    /**
     * Update Project Invoice
     */
    public function updateInvoice(Invoice $invoice, array $data, $actor): Invoice
    {
        return DB::transaction(function () use ($invoice, $data, $actor) {
            $attachmentIds = $data['attachment_ids'] ?? [];
            unset($data['attachment_ids']);

            $invoice->update($data);

            // Re-calculate total
            $totalAmount = $invoice->subtotal + $invoice->tax_amount - $invoice->discount_amount;
            $invoice->update(['total_amount' => $totalAmount]);

            if (!empty($attachmentIds)) {
                $this->attachFilesToInvoice($invoice, $attachmentIds, $actor);
            }

            return $invoice->fresh(['customer', 'creator', 'costGroup', 'attachments']);
        });
    }

    /**
     * Get Invoice Summary by Cost Group
     */
    public function getInvoiceSummaryByCostGroup(Project $project)
    {
        return Invoice::where('project_id', $project->id)
            ->whereNotNull('cost_group_id')
            ->select('cost_group_id', DB::raw('sum(total_amount) as total_amount'))
            ->groupBy('cost_group_id')
            ->with('costGroup:id,name')
            ->get();
    }

    /**
     * Helper to attach files to invoice
     */
    protected function attachFilesToInvoice(Invoice $invoice, array $attachmentIds, $actor)
    {
        foreach ($attachmentIds as $attachmentId) {
            $attachment = Attachment::find($attachmentId);
            if ($attachment) {
                $attachment->update([
                    'attachable_type' => Invoice::class,
                    'attachable_id' => $invoice->id,
                ]);
            }
        }
    }
}
