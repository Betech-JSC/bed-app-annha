<?php

namespace App\Services;

use App\Models\Acceptance;
use App\Models\Cost;
use App\Models\ChangeRequest;
use App\Models\AdditionalCost;
use App\Models\SubcontractorPayment;
use App\Models\Contract;
use App\Models\ProjectPayment;
use App\Models\SubcontractorAcceptance;
use App\Models\SupplierAcceptance;
use App\Models\ConstructionLog;
use App\Models\ScheduleAdjustment;
use App\Models\Defect;
use App\Models\ProjectBudget;
use App\Models\EquipmentRental;
use App\Models\AssetUsage;
use App\Models\MaterialBill;
use App\Models\Attendance;
use App\Models\Approval;
use App\Models\ApprovalLog;
use App\Models\User;
use App\Models\Notification;
use App\Constants\Permissions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * ApprovalActionService
 * 
 * Centralized service for handling ALL approval and rejection actions.
 * Ensures consistent state transitions and logging across Web and Mobile.
 */
class ApprovalActionService
{
    protected MaterialBillService $materialBillService;
    protected AcceptanceService $acceptanceService;
    protected FinancialService $financialService;
    protected EquipmentService $equipmentService;
    protected ConstructionLogService $logService;
    protected ProjectBudgetService $budgetService;
    protected AttendanceService $attendanceService;
    protected NotificationService $notificationService;

    public function __construct(
        MaterialBillService $materialBillService,
        AcceptanceService $acceptanceService,
        FinancialService $financialService,
        EquipmentService $equipmentService,
        ConstructionLogService $logService,
        ProjectBudgetService $budgetService,
        AttendanceService $attendanceService,
        NotificationService $notificationService
    ) {
        $this->materialBillService = $materialBillService;
        $this->acceptanceService = $acceptanceService;
        $this->financialService = $financialService;
        $this->equipmentService = $equipmentService;
        $this->logService = $logService;
        $this->budgetService = $budgetService;
        $this->attendanceService = $attendanceService;
        $this->notificationService = $notificationService;
    }
    /**
     * Unified Approval Method
     */
    public function approve(User $user, string $type, $id, array $params = []): array
    {
        try {
            DB::beginTransaction();

            $result = false;
            $message = "Đã duyệt thành công";

            switch ($type) {
                case 'management':
                case 'project_cost':
                case 'company_cost':
                    $cost = Cost::findOrFail($id);
                    $this->financialService->approveCostByManagement($cost, $user);
                    $result = true;
                    $message = "Đã duyệt chi phí \"{$cost->name}\" (Ban điều hành)";
                    break;

                case 'accountant':
                    $cost = Cost::findOrFail($id);
                    $this->financialService->approveCostByAccountant($cost, [], $user);
                    $result = true;
                    $message = "Đã xác nhận chi phí \"{$cost->name}\" (Kế toán)";
                    break;

                case 'acceptance':
                case 'acceptance_supervisor':
                    $acceptance = Acceptance::findOrFail($id);
                    $this->acceptanceService->approve($acceptance, $user, 1);
                    $result = true;
                    $message = "Giám sát đã xác nhận nghiệm thu \"{$acceptance->name}\"";
                    break;

                case 'acceptance_customer':
                    $acceptance = Acceptance::findOrFail($id);
                    $this->acceptanceService->approve($acceptance, $user, 3);
                    $result = true;
                    $message = "Khách hàng đã duyệt nghiệm thu \"{$acceptance->name}\"";
                    break;

                case 'change_request':
                    $cr = ChangeRequest::findOrFail($id);
                    $result = $cr->approve($user, $params['notes'] ?? null);
                    $message = "Đã duyệt yêu cầu thay đổi";
                    break;

                case 'additional_cost':
                    $ac = AdditionalCost::findOrFail($id);
                    $result = $ac->approve($user);
                    $message = "Đã duyệt chi phí phát sinh";
                    break;

                case 'sub_payment':
                    $p = SubcontractorPayment::findOrFail($id);
                    $this->financialService->approveSubPayment($p, $user);
                    $result = true;
                    $message = "BĐH đã duyệt thanh toán NTP";
                    break;

                case 'sub_payment_confirm':
                    $p = SubcontractorPayment::findOrFail($id);
                    $this->financialService->processSubPayment($p, $params, $user);
                    $result = true;
                    $message = "KT đã xác nhận thanh toán NTP";
                    break;

                case 'contract':
                    $c = Contract::findOrFail($id);
                    $result = $c->approve($user);
                    $message = "Đã duyệt hợp đồng";
                    break;

                case 'project_payment_submit':
                    $p = ProjectPayment::findOrFail($id);
                    $result = $p->submit();
                    $message = "Đã gửi yêu cầu thanh toán cho khách hàng";
                    break;

                case 'project_payment':
                    $p = ProjectPayment::findOrFail($id);
                    $result = $p->approveByCustomer($user);
                    $message = "KH đã duyệt thanh toán";
                    break;

                case 'project_payment_confirm':
                    $p = ProjectPayment::findOrFail($id);
                    $result = $p->markAsPaid($user);
                    $message = "KT đã xác nhận thanh toán";
                    break;

                case 'material_bill':
                    $b = MaterialBill::findOrFail($id);
                    $this->materialBillService->approve($b, $user, $params);
                    $result = true;
                    $message = "Đã duyệt phiếu vật tư \"{$b->bill_number}\"";
                    break;

                case 'sub_acceptance':
                    $sa = SubcontractorAcceptance::findOrFail($id);
                    $result = $sa->approve($user, $params['notes'] ?? null);
                    $message = "Đã duyệt nghiệm thu NTP";
                    break;

                case 'supplier_acceptance':
                    $sa = SupplierAcceptance::findOrFail($id);
                    $result = $sa->approve($user, $params['notes'] ?? null);
                    $message = "Đã duyệt nghiệm thu NCC";
                    break;

                case 'construction_log':
                    $log = ConstructionLog::findOrFail($id);
                    $this->logService->approve($log, ['status' => 'approved', 'notes' => $params['notes'] ?? null], $user);
                    $result = true;
                    $message = "Đã duyệt nhật ký công trường";
                    break;

                case 'schedule_adjustment':
                    $adj = ScheduleAdjustment::findOrFail($id);
                    $result = $adj->approve($user, $params['notes'] ?? null);
                    $message = "Đã duyệt điều chỉnh tiến độ";
                    break;

                case 'defect_verify':
                    $d = Defect::findOrFail($id);
                    $result = $d->markAsVerified($user);
                    $message = "Đã xác nhận sửa lỗi";
                    break;

                case 'budget':
                    $b = ProjectBudget::findOrFail($id);
                    $this->budgetService->approve($b, $user);
                    $result = true;
                    $message = "Đã duyệt ngân sách";
                    break;

                case 'equipment_rental_management':
                    $r = EquipmentRental::findOrFail($id);
                    $result = $this->equipmentService->approveRentalByManagement($r, $user);
                    $message = "BĐH duyệt thuê thiết bị";
                    break;

                case 'equipment_rental_accountant':
                    $r = EquipmentRental::findOrFail($id);
                    $result = $this->equipmentService->confirmRentalByAccountant($r, $user);
                    $message = "KT xác nhận thuê thiết bị";
                    break;

                case 'equipment_rental_return':
                    $r = EquipmentRental::findOrFail($id);
                    $result = $this->equipmentService->confirmReturnRental($r, $user);
                    $message = "Xác nhận trả thiết bị";
                    break;

                case 'asset_usage_management':
                    $u = AssetUsage::findOrFail($id);
                    $result = $this->equipmentService->approveUsageByManagement($u, $user);
                    $message = "BĐH duyệt sử dụng thiết bị";
                    break;

                case 'asset_usage_accountant':
                    $u = AssetUsage::findOrFail($id);
                    $result = $this->equipmentService->confirmUsageByAccountant($u, $user);
                    $message = "KT xác nhận sử dụng thiết bị";
                    break;

                case 'asset_usage_return':
                    $u = AssetUsage::findOrFail($id);
                    $result = $this->equipmentService->confirmReturnUsage($u, $user);
                    $message = "Xác nhận trả thiết bị kho";
                    break;

                case 'equipment_purchase_management':
                    $p = \App\Models\EquipmentPurchase::findOrFail($id);
                    $result = $this->equipmentService->approvePurchaseByManagement($p, $user);
                    $message = "BĐH duyệt mua thiết bị";
                    break;

                case 'equipment_purchase_accountant':
                    $p = \App\Models\EquipmentPurchase::findOrFail($id);
                    $result = $this->equipmentService->confirmPurchaseByAccountant($p, $user);
                    $message = "KT xác nhận thanh toán mua thiết bị";
                    break;

                case 'attendance':
                    $att = Attendance::findOrFail($id);
                    $result = $this->attendanceService->approve($att, $user);
                    $message = "Đã duyệt chấm công của " . ($att->user->name ?? "nhân viên") . " ngày " . optional($att->work_date)->format('d/m/Y');
                    break;

                default:
                    throw new Exception("Loại phê duyệt không hợp lệ: {$type}");
            }

            if (!$result) {
                DB::rollBack();
                return ['success' => false, 'message' => 'Thao tác không thành công — Trạng thái hiện tại không cho phép thực hiện.'];
            }

            DB::commit();
            Log::info("ApprovalActionService: Approved type {$type}", ['id' => $id, 'user' => $user->id]);

            // Centralized Approval Update
            $this->completeCentralizedApproval($type, $id, 'approved', $user, $params['notes'] ?? null);

            // Thông báo cho người tạo biết yêu cầu của họ đã được duyệt
            $this->dispatchApprovalResultNotification($type, $id, 'approved', null);

            // Thông báo cho người duyệt tiếp theo (nếu cần)
            $this->dispatchNextApproverNotification($type, $id);

            return ['success' => true, 'message' => $message];

        } catch (Exception $e) {
            DB::rollBack();
            Log::error("ApprovalActionService Error: " . $e->getMessage(), ['type' => $type, 'id' => $id]);
            return ['success' => false, 'message' => 'Lỗi hệ thống: ' . $e->getMessage()];
        }
    }

    /**
     * Unified Reject Method
     */
    public function reject(User $user, string $type, $id, string $reason): array
    {
        try {
            DB::beginTransaction();

            $model = null;
            switch ($type) {
                case 'management':
                case 'accountant':
                case 'project_cost':
                case 'company_cost':
                    $model = Cost::findOrFail($id); break;
                case 'acceptance':
                case 'acceptance_customer':
                case 'acceptance_supervisor':
                    $model = Acceptance::findOrFail($id); break;
                case 'change_request': $model = ChangeRequest::findOrFail($id); break;
                case 'additional_cost': $model = AdditionalCost::findOrFail($id); break;
                case 'sub_payment':
                case 'sub_payment_confirm':
                    $model = SubcontractorPayment::findOrFail($id); break;
                case 'contract': $model = Contract::findOrFail($id); break;
                case 'project_payment':
                case 'project_payment_confirm':
                    $model = ProjectPayment::findOrFail($id); break;
                case 'material_bill': $model = MaterialBill::findOrFail($id); break;
                case 'sub_acceptance': $model = SubcontractorAcceptance::findOrFail($id); break;
                case 'supplier_acceptance': $model = SupplierAcceptance::findOrFail($id); break;
                case 'construction_log': $model = ConstructionLog::findOrFail($id); break;
                case 'schedule_adjustment': $model = ScheduleAdjustment::findOrFail($id); break;
                case 'defect_verify': $model = Defect::findOrFail($id); break;
                case 'budget': $model = ProjectBudget::findOrFail($id); break;
                case 'equipment_rental_management':
                case 'equipment_rental_accountant':
                case 'equipment_rental_return':
                    $model = EquipmentRental::findOrFail($id); break;
                case 'asset_usage_management':
                case 'asset_usage_accountant':
                case 'asset_usage_return':
                    $model = AssetUsage::findOrFail($id); break;
                case 'equipment_purchase_management':
                case 'equipment_purchase_accountant':
                    $model = \App\Models\EquipmentPurchase::findOrFail($id); break;
                case 'attendance':
                    $att = Attendance::findOrFail($id);
                    $this->attendanceService->reject($att, $user, $reason);
                    DB::commit();
                    return ['success' => true, 'message' => 'Đã từ chối chấm công của ' . ($att->user->name ?? 'nhân viên')];
                default:
                    throw new Exception("Loại cần từ chối không hợp lệ: {$type}");
            }

            // Perform rejection — handle different model signatures
            if ($model instanceof Cost) {
                $this->financialService->rejectCost($model, $reason, $user);
                $result = true;
            } elseif ($model instanceof SubcontractorPayment) {
                $this->financialService->rejectSubPayment($model, $reason, $user);
                $result = true;
            } elseif ($model instanceof Acceptance) {
                $this->acceptanceService->reject($model, $user, $reason);
                $result = true;
            } elseif ($model instanceof MaterialBill) {
                $this->materialBillService->reject($model, $user, $reason);
                $result = true;
            } elseif ($model instanceof EquipmentRental) {
                $result = $this->equipmentService->rejectRental($model, $reason, $user);
            } elseif ($model instanceof AssetUsage) {
                $result = $this->equipmentService->rejectUsage($model, $reason, $user);
            } elseif ($model instanceof \App\Models\EquipmentPurchase) {
                $result = $this->equipmentService->rejectPurchase($model, $reason, $user);
            } elseif ($model instanceof ConstructionLog) {
                $this->logService->approve($model, ['status' => 'rejected', 'notes' => $reason], $user);
                $result = true;
            } elseif ($model instanceof ProjectBudget) {
                $this->budgetService->reject($model, $reason, $user);
                $result = true;
            } elseif ($model instanceof ProjectPayment) {
                $result = $this->financialService->rejectProjectPayment($model, $reason, $user);
            } elseif (method_exists($model, 'reject')) {
                // Models with signature: reject(string $reason, ?User $user)
                if ($model instanceof Cost 
                    || $model instanceof AdditionalCost 
                    || $model instanceof Contract
                ) {
                    $result = $model->reject($reason, $user);
                } else {
                    // Models with signature: reject(?User $user, ?string $reason)
                    $result = $model->reject($user, $reason);
                }
            } else {
                // Fallback for models without reject()
                $model->status = 'rejected';
                $fillable = $model->getFillable();
                if (in_array('rejection_reason', $fillable)) {
                    $model->rejection_reason = $reason;
                } elseif (in_array('rejected_reason', $fillable)) {
                    $model->rejected_reason = $reason;
                } elseif (in_array('notes', $fillable)) {
                    $model->notes = ($model->notes ? $model->notes . "\n\n" : '') . "Lý do từ chối: " . $reason;
                }
                $model->save();
                $result = true;
            }

            if (!$result) {
                DB::rollBack();
                return ['success' => false, 'message' => 'Không thể từ chối yêu cầu này.'];
            }

            DB::commit();
            Log::info("ApprovalActionService: Rejected type {$type}", ['id' => $id, 'user' => $user->id, 'reason' => $reason]);

            // Centralized Approval Update
            $this->completeCentralizedApproval($type, $id, 'rejected', $user, $reason);

            // Thông báo cho người tạo biết yêu cầu bị từ chối
            $this->dispatchApprovalResultNotification($type, $id, 'rejected', $reason);

            return ['success' => true, 'message' => 'Đã từ chối yêu cầu thành công'];

        } catch (Exception $e) {
            DB::rollBack();
            Log::error("ApprovalActionService Reject Error: " . $e->getMessage(), ['type' => $type, 'id' => $id]);
            return ['success' => false, 'message' => 'Lỗi hệ thống: ' . $e->getMessage()];
        }
    }

    /**
     * Unified Revert to Draft Method
     */
    public function revert(User $user, string $type, $id): array
    {
        try {
            DB::beginTransaction();

            $result = false;
            $message = "Đã hoàn duyệt về nháp";

            switch ($type) {
                case 'management':
                case 'accountant':
                case 'project_cost':
                case 'company_cost':
                    $cost = Cost::findOrFail($id);
                    $result = $this->financialService->revertCostToDraft($cost, $user);
                    $message = "Đã hoàn duyệt chi phí \"{$cost->name}\"";
                    break;

                case 'additional_cost':
                    $ac = AdditionalCost::findOrFail($id);
                    $result = $ac->revertToDraft($user);
                    $message = "Đã hoàn duyệt chi phí phát sinh";
                    break;

                case 'sub_payment':
                case 'sub_payment_confirm':
                    $p = SubcontractorPayment::findOrFail($id);
                    $result = $this->financialService->revertSubPaymentToDraft($p, $user);
                    $message = "Đã hoàn duyệt thanh toán NTP";
                    break;

                case 'contract':
                    $c = Contract::findOrFail($id);
                    $result = $c->revertToDraft($user);
                    $message = "Đã hoàn duyệt hợp đồng";
                    break;

                case 'project_payment':
                case 'project_payment_confirm':
                    $p = ProjectPayment::findOrFail($id);
                    $result = $this->financialService->revertProjectPaymentToDraft($p, $user);
                    $message = "Đã hoàn duyệt thanh toán đợt";
                    break;

                case 'material_bill':
                    $b = MaterialBill::findOrFail($id);
                    $this->materialBillService->revertToDraft($b, $user);
                    $result = true;
                    $message = "Đã hoàn duyệt phiếu vật tư \"{$b->bill_number}\"";
                    break;

                case 'budget':
                    $b = ProjectBudget::findOrFail($id);
                    $this->budgetService->revertToDraft($b, $user);
                    $result = true;
                    $message = "Đã hoàn duyệt ngân sách";
                    break;

                case 'equipment_rental_management':
                case 'equipment_rental_accountant':
                case 'equipment_rental_return':
                    $r = EquipmentRental::findOrFail($id);
                    $result = $this->equipmentService->revertRentalToDraft($r, $user);
                    $message = "Đã hoàn duyệt thuê thiết bị";
                    break;

                case 'asset_usage_management':
                case 'asset_usage_accountant':
                case 'asset_usage_return':
                    $u = AssetUsage::findOrFail($id);
                    $result = $this->equipmentService->revertUsageToDraft($u, $user);
                    $message = "Đã hoàn duyệt sử dụng thiết bị";
                    break;
                
                case 'acceptance_customer':
                case 'acceptance_supervisor':
                case 'acceptance':
                    $acceptance = Acceptance::findOrFail($id);
                    $this->acceptanceService->revertToDraft($acceptance, $user);
                    $result = true;
                    $message = "Đã hoàn duyệt nghiệm thu \"{$acceptance->name}\"";
                    break;

                default:
                    throw new Exception("Loại cần hoàn duyệt không hợp lệ: {$type}");
            }

            if (!$result) {
                DB::rollBack();
                return ['success' => false, 'message' => 'Không thể hoàn duyệt yêu cầu này.'];
            }

            DB::commit();
            Log::info("ApprovalActionService: Reverted to draft type {$type}", ['id' => $id, 'user' => $user->id]);

            // Track in centralized approval if exists
            $this->completeCentralizedApproval($type, $id, 'reverted', $user);

            return ['success' => true, 'message' => $message];

        } catch (Exception $e) {
            DB::rollBack();
            Log::error("ApprovalActionService Revert Error: " . $e->getMessage(), ['type' => $type, 'id' => $id]);
            return ['success' => false, 'message' => 'Lỗi hệ thống: ' . $e->getMessage()];
        }
    }

    /**
     * Gửi thông báo kết quả duyệt (approved/rejected) cho người tạo request.
     * Áp dụng cho các loại chưa có Observer riêng.
     */
    protected function dispatchApprovalResultNotification(string $type, $id, string $status, ?string $reason): void
    {
        try {
            [$submitterId, $itemLabel, $itemType, $projectId] = match ($type) {
                'equipment_rental_management', 'equipment_rental_accountant', 'equipment_rental_return' => (function () use ($id, $type) {
                    $r = EquipmentRental::find($id);
                    return $r ? [$r->created_by, "Thuê thiết bị #{$r->id}", 'equipment_rental', $r->project_id ?? null] : [null, '', null, null];
                })(),
                'asset_usage_management', 'asset_usage_accountant', 'asset_usage_return' => (function () use ($id) {
                    $u = AssetUsage::find($id);
                    return $u ? [$u->created_by, "Sử dụng thiết bị #{$u->id}", 'asset_usage', $u->project_id ?? null] : [null, '', null, null];
                })(),
                'attendance' => (function () use ($id) {
                    $a = Attendance::find($id);
                    return $a ? [$a->user_id, "Chấm công " . optional($a->work_date)->format('d/m/Y'), 'attendance', null] : [null, '', null, null];
                })(),
                'material_bill' => (function () use ($id) {
                    $b = MaterialBill::find($id);
                    return $b ? [$b->created_by, "Phiếu vật tư {$b->bill_number}", 'material_bill', $b->project_id ?? null] : [null, '', null, null];
                })(),
                'project_payment', 'project_payment_confirm' => (function () use ($id) {
                    $p = ProjectPayment::find($id);
                    return $p ? [$p->created_by, "Thanh toán đợt #{$p->payment_number}", 'project_payment', $p->project_id ?? null] : [null, '', null, null];
                })(),
                'contract' => (function () use ($id) {
                    $c = Contract::find($id);
                    return $c ? [$c->created_by, "Hợp đồng #{$c->id}", 'contract', $c->project_id ?? null] : [null, '', null, null];
                })(),
                'budget' => (function () use ($id) {
                    $b = ProjectBudget::find($id);
                    return $b ? [$b->created_by, "Ngân sách dự án #{$b->project_id}", 'budget', $b->project_id ?? null] : [null, '', null, null];
                })(),
                'equipment_purchase_management', 'equipment_purchase_accountant' => (function () use ($id) {
                    $p = \App\Models\EquipmentPurchase::find($id);
                    return $p ? [$p->created_by, "Mua thiết bị #{$p->id}", 'equipment_purchase', null] : [null, '', null, null];
                })(),
                default => [null, '', null, null],
            };

            if ($submitterId) {
                $this->notificationService->notifyApprovalResult(
                    $submitterId, $itemLabel, $status, $reason, $itemType, $id, $projectId
                );
            }
        } catch (\Throwable $e) {
            Log::warning("dispatchApprovalResultNotification failed: {$e->getMessage()}", ['type' => $type, 'id' => $id]);
        }
    }

    /**
     * Gửi thông báo cho người duyệt tiếp theo trong workflow
     * (áp dụng cho các loại thiếu Observer)
     */
    protected function dispatchNextApproverNotification(string $type, $id): void
    {
        try {
            switch ($type) {
                case 'equipment_rental_management':
                    $r = EquipmentRental::find($id);
                    if ($r) {
                        $this->notificationService->sendToPermissionUsers(
                            Permissions::COST_APPROVE_ACCOUNTANT, $r->project_id ?? null,
                            Notification::TYPE_WORKFLOW, Notification::CATEGORY_WORKFLOW_APPROVAL,
                            "Yêu cầu xác nhận thuê thiết bị",
                            "Phiếu thuê thiết bị #{$r->id} đã được BĐH duyệt, cần KT xác nhận.",
                            ['item_type' => 'equipment_rental', 'item_id' => $r->id, 'project_id' => $r->project_id],
                            Notification::PRIORITY_HIGH, '/approvals', true
                        );
                    }
                    break;
                case 'asset_usage_management':
                    $u = AssetUsage::find($id);
                    if ($u) {
                        $this->notificationService->sendToPermissionUsers(
                            Permissions::COST_APPROVE_ACCOUNTANT, $u->project_id ?? null,
                            Notification::TYPE_WORKFLOW, Notification::CATEGORY_WORKFLOW_APPROVAL,
                            "Yêu cầu xác nhận sử dụng thiết bị",
                            "Phiếu sử dụng thiết bị #{$u->id} đã được BĐH duyệt, cần KT xác nhận.",
                            ['item_type' => 'asset_usage', 'item_id' => $u->id, 'project_id' => $u->project_id],
                            Notification::PRIORITY_HIGH, '/approvals', true
                        );
                    }
                    break;
                case 'equipment_purchase_management':
                    $p = \App\Models\EquipmentPurchase::find($id);
                    if ($p) {
                        $this->notificationService->sendToPermissionUsers(
                            Permissions::COST_APPROVE_ACCOUNTANT, null,
                            Notification::TYPE_WORKFLOW, Notification::CATEGORY_WORKFLOW_APPROVAL,
                            "Yêu cầu xác nhận thanh toán mua thiết bị",
                            "Phiếu mua thiết bị #{$p->id} đã được BĐH duyệt, cần KT xác nhận thanh toán.",
                            ['item_type' => 'equipment_purchase', 'item_id' => $p->id],
                            Notification::PRIORITY_HIGH, '/approvals', true
                        );
                    }
                    break;
                case 'project_payment':
                    $p = ProjectPayment::find($id);
                    if ($p) {
                        $this->notificationService->sendToPermissionUsers(
                            Permissions::COST_APPROVE_ACCOUNTANT, $p->project_id ?? null,
                            Notification::TYPE_WORKFLOW, Notification::CATEGORY_WORKFLOW_APPROVAL,
                            "Yêu cầu xác nhận thanh toán khách hàng",
                            "Thanh toán đợt #{$p->payment_number} đã được khách hàng duyệt, cần KT xác nhận.",
                            ['item_type' => 'project_payment', 'item_id' => $p->id, 'project_id' => $p->project_id],
                            Notification::PRIORITY_HIGH, '/approvals', true
                        );
                    }
                    break;
            }
        } catch (\Throwable $e) {
            Log::warning("dispatchNextApproverNotification failed: {$e->getMessage()}", ['type' => $type, 'id' => $id]);
        }
    }

    /**
     * Complete or log the centralized approval action.
     */
    protected function completeCentralizedApproval(string $type, $id, string $status, User $user, ?string $reason = null): void
    {
        try {
            $modelClass = match ($type) {
                'management', 'accountant', 'project_cost', 'company_cost' => Cost::class,
                'acceptance', 'acceptance_customer', 'acceptance_supervisor' => Acceptance::class,
                'change_request' => ChangeRequest::class,
                'additional_cost' => AdditionalCost::class,
                'sub_payment', 'sub_payment_confirm' => SubcontractorPayment::class,
                'contract' => Contract::class,
                'project_payment', 'project_payment_confirm', 'project_payment_submit' => ProjectPayment::class,
                'material_bill' => MaterialBill::class,
                'sub_acceptance' => SubcontractorAcceptance::class,
                'supplier_acceptance' => SupplierAcceptance::class,
                'construction_log' => ConstructionLog::class,
                'schedule_adjustment' => ScheduleAdjustment::class,
                'defect_verify' => Defect::class,
                'budget' => ProjectBudget::class,
                'equipment_rental_management', 'equipment_rental_accountant', 'equipment_rental_return' => EquipmentRental::class,
                'asset_usage_management', 'asset_usage_accountant', 'asset_usage_return' => AssetUsage::class,
                'equipment_purchase_management', 'equipment_purchase_accountant' => \App\Models\EquipmentPurchase::class,
                'attendance' => Attendance::class,
                default => null,
            };

            if (!$modelClass) return;
            
            $approval = Approval::where('approvable_type', $modelClass)
                ->where('approvable_id', $id)
                ->latest()
                ->first();

            if ($approval) {
                // Keep the approval updated if the saved hook didn't catch the exact status
                if ($status === 'rejected' && $approval->status !== 'rejected') {
                    $approval->status = 'rejected';
                    $approval->last_action = 'rejected';
                    $approval->last_actor_id = $user->id;
                    $approval->save();
                }

                ApprovalLog::create([
                    'approval_id' => $approval->id,
                    'user_id' => $user->id,
                    'action' => $status,
                    'to_status' => $approval->status,
                    'notes' => $reason,
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning("completeCentralizedApproval failed: {$e->getMessage()}", ['type' => $type, 'id' => $id]);
        }
    }
}
