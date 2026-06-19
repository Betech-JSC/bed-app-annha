<?php

namespace App\Services;

use App\Models\Payroll;
use App\Models\Cost;
use App\Models\CostGroup;
use App\Models\Attachment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class PayrollService
{
    /**
     * Create or update a Payroll record.
     */
    public function upsert(array $data, ?Payroll $payroll = null, $user = null): Payroll
    {
        $rules = [
            'user_id'          => 'required|exists:users,id',
            'project_id'       => 'nullable|exists:projects,id',
            'period_type'      => 'required|in:daily,weekly,monthly',
            'period_start'     => 'required|date',
            'period_end'       => 'required|date|after_or_equal:period_start',
            'base_salary'      => 'required|numeric|min:0',
            'bonus_amount'     => 'nullable|numeric|min:0',
            'allowance_amount' => 'nullable|numeric|min:0',
            'deductions'       => 'nullable|numeric|min:0',
            'notes'            => 'nullable|string',
            'attachment_ids'   => 'nullable|array',
        ];

        $validator = Validator::make($data, $rules);
        if ($validator->fails()) {
            throw new \Illuminate\Validation\ValidationException($validator);
        }

        return DB::transaction(function () use ($data, $payroll, $user) {
            $baseSalary = (float) $data['base_salary'];
            $bonus = (float) ($data['bonus_amount'] ?? 0);
            $allowance = (float) ($data['allowance_amount'] ?? 0);
            $deductions = (float) ($data['deductions'] ?? 0);
            
            $gross = $baseSalary + $bonus + $allowance;
            $net = max(0, $gross - $deductions);

            $payrollFields = [
                'user_id'          => $data['user_id'],
                'project_id'       => $data['project_id'] ?? null,
                'period_type'      => $data['period_type'],
                'period_start'     => $data['period_start'],
                'period_end'       => $data['period_end'],
                'base_salary'      => $baseSalary,
                'bonus_amount'     => $bonus,
                'allowance_amount' => $allowance,
                'deductions'       => $deductions,
                'gross_salary'     => $gross,
                'net_salary'       => $net,
                'notes'            => $data['notes'] ?? null,
            ];

            if (!$payroll) {
                $payrollFields['status'] = 'draft';
                $payroll = Payroll::create($payrollFields);
            } else {
                if (!in_array($payroll->status, ['draft', 'rejected', 'pending_management', 'pending_accountant'])) {
                    throw new \Exception('Chỉ có thể chỉnh sửa phiếu lương ở trạng thái Nháp, Từ chối, hoặc đang chờ duyệt.');
                }
                
                // Keep status draft if editing a draft or rejected, otherwise preserve it
                if (in_array($payroll->status, ['draft', 'rejected'])) {
                    $payrollFields['status'] = 'draft';
                }
                
                $payroll->update($payrollFields);
            }

            // Sync attachments
            if (isset($data['attachment_ids'])) {
                Attachment::whereIn('id', $data['attachment_ids'])->update([
                    'attachable_id'   => $payroll->id,
                    'attachable_type' => Payroll::class,
                ]);
            }

            // Ensure Cost is linked (though it's in draft state until approved)
            $this->ensureLinkedCost($payroll, $user);

            return $payroll;
        });
    }

    /**
     * Submit for BHD approval.
     */
    public function submit(Payroll $payroll, $user): void
    {
        if (!in_array($payroll->status, ['draft', 'rejected'])) {
            throw new \Exception('Trạng thái không hợp lệ để gửi duyệt.');
        }

        $payroll->submitForManagementApproval();
        $payroll->notifyEvent('submitted', $user);
        
        // Sync with linked Cost
        $this->ensureLinkedCost($payroll, $user);
    }

    /**
     * Multilevel approval.
     */
    public function approve(Payroll $payroll, $user, array $extraData = []): void
    {
        if ($payroll->status === 'pending_management') {
            $payroll->approveByManagement($user);
            $payroll->notifyEvent('approved_management', $user);
        } elseif ($payroll->status === 'pending_accountant') {
            $payroll->approveByAccountant($user);
            $payroll->notifyEvent('approved_accountant', $user);
        } else {
            throw new \Exception('Phiếu lương không ở trạng thái chờ duyệt.');
        }

        // Sync with linked Cost
        $this->ensureLinkedCost($payroll, $user);
    }

    /**
     * Reject.
     */
    public function reject(Payroll $payroll, $user, string $reason): void
    {
        if (!in_array($payroll->status, ['pending_management', 'pending_accountant'])) {
            throw new \Exception('Phiếu lương không ở trạng thái chờ duyệt.');
        }

        $payroll->reject($user, $reason);
        $payroll->notifyEvent('rejected', $user, ['reason' => $reason]);

        // Sync with linked Cost
        $this->ensureLinkedCost($payroll, $user);
    }

    /**
     * Revert to draft.
     */
    public function revertToDraft(Payroll $payroll, $user): void
    {
        $status = $payroll->status;
        $revertibleStatuses = ['pending_management', 'pending_accountant', 'approved', 'rejected'];
        if (!in_array($status, $revertibleStatuses)) {
            throw new \Exception('Trạng thái hiện tại không thể hoàn duyệt.');
        }

        $isSuperAdmin = $user && method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin();

        DB::transaction(function () use ($payroll, $status, $user, $isSuperAdmin) {
            if ($status === 'pending_management') {
                $payroll->status = 'draft';
                $payroll->management_approved_by = null;
                $payroll->management_approved_at = null;
            } elseif ($status === 'pending_accountant') {
                $payroll->status = 'draft';
                $payroll->management_approved_by = null;
                $payroll->management_approved_at = null;
                $payroll->accountant_approved_by = null;
                $payroll->accountant_approved_at = null;
            } elseif ($status === 'approved') {
                $payroll->status = 'pending_accountant';
                $payroll->accountant_approved_by = null;
                $payroll->accountant_approved_at = null;
            } elseif ($status === 'rejected') {
                $payroll->status = 'draft';
                $payroll->management_approved_by = null;
                $payroll->management_approved_at = null;
                $payroll->accountant_approved_by = null;
                $payroll->accountant_approved_at = null;
            }

            $payroll->save();

            // Sync with linked Cost record
            $this->ensureLinkedCost($payroll, $user);
        });
    }

    /**
     * Delete.
     */
    public function delete(Payroll $payroll): void
    {
        if (!in_array($payroll->status, ['draft'])) {
            throw new \Exception('Chỉ có thể xóa phiếu lương ở trạng thái Nháp.');
        }

        DB::transaction(function () use ($payroll) {
            Cost::where('payroll_id', $payroll->id)->delete();
            $payroll->delete();
        });
    }

    /**
     * Ensure a Cost record is linked to this Payroll sheet.
     */
    public function ensureLinkedCost(Payroll $payroll, $user = null): void
    {
        $cost = Cost::where('payroll_id', $payroll->id)->first();
        
        $empName = $payroll->user ? $payroll->user->name : '';
        $monthStr = $payroll->period_start ? $payroll->period_start->format('m/Y') : '';
        $costName = "Phiếu lương - {$empName} - Tháng {$monthStr}";
        
        // Find labor cost group (NC - Nhân công)
        $costGroup = CostGroup::where('code', 'NC')->active()->first();
        if (!$costGroup) {
            $costGroup = CostGroup::where('name', 'like', '%Nhân công%')->active()->first();
        }
        
        $costData = [
            'project_id'               => $payroll->project_id,
            'cost_group_id'            => $costGroup ? $costGroup->id : null,
            'category'                 => 'labor',
            'expense_category'         => 'payroll',
            'payroll_id'               => $payroll->id,
            'name'                     => $costName,
            'amount'                   => $payroll->net_salary,
            'description'              => $payroll->notes ?? "Từ phiếu lương " . ($payroll->payroll_number ?? $payroll->id),
            'cost_date'                => $payroll->period_end ?: now(),
            'status'                   => $this->mapStatusToCost($payroll->status),
            'management_approved_by'   => $payroll->management_approved_by,
            'management_approved_at'   => $payroll->management_approved_at,
            'accountant_approved_by'   => $payroll->accountant_approved_by,
            'accountant_approved_at'   => $payroll->accountant_approved_at,
            'rejected_reason'          => $payroll->rejected_reason,
        ];

        if (!$cost) {
            $costData['created_by'] = $user ? $user->id : 1;
            Cost::create($costData);
        } else {
            $cost->update($costData);
        }
    }

    protected function mapStatusToCost(string $status): string
    {
        return match ($status) {
            'approved'           => 'approved',
            'pending_management' => 'pending_management_approval',
            'pending_accountant' => 'pending_accountant_approval',
            'rejected'           => 'rejected',
            default              => 'draft',
        };
    }
}
