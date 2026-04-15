<?php

namespace App\Services;

use App\Models\Cost;
use App\Models\AcceptanceStage;
use App\Models\AcceptanceItem;
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
use App\Models\User;
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
    protected $financialService;
    protected $equipmentService;
    protected $logService;
    protected $budgetService;
    protected $attendanceService;

    public function __construct(
        MaterialBillService $materialBillService,
        AcceptanceService $acceptanceService,
        FinancialService $financialService,
        EquipmentService $equipmentService,
        ConstructionLogService $logService,
        ProjectBudgetService $budgetService,
        AttendanceService $attendanceService
    ) {
        $this->materialBillService = $materialBillService;
        $this->acceptanceService = $acceptanceService;
        $this->financialService = $financialService;
        $this->equipmentService = $equipmentService;
        $this->logService = $logService;
        $this->budgetService = $budgetService;
        $this->attendanceService = $attendanceService;
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
                case 'acceptance_customer':
                    $stage = AcceptanceStage::findOrFail($id);
                    $this->acceptanceService->approveStage($stage, $user, 3);
                    $result = true;
                    $message = "Khách hàng đã duyệt nghiệm thu \"{$stage->name}\"";
                    break;

                case 'acceptance_pm':
                    $stage = AcceptanceStage::findOrFail($id);
                    $this->acceptanceService->approveStage($stage, $user, 2);
                    $result = true;
                    $message = "QLDA đã duyệt nghiệm thu \"{$stage->name}\"";
                    break;

                case 'acceptance_supervisor':
                    $stage = AcceptanceStage::findOrFail($id);
                    $this->acceptanceService->approveStage($stage, $user, 1);
                    $result = true;
                    $message = "Giám sát đã duyệt nghiệm thu \"{$stage->name}\"";
                    break;

                case 'acceptance_item_supervisor':
                    $item = AcceptanceItem::findOrFail($id);
                    $this->acceptanceService->approveItem($item, $user, 1);
                    $result = true;
                    $message = "Giám sát đã duyệt hạng mục \"{$item->name}\"";
                    break;

                case 'acceptance_item_pm':
                    $item = AcceptanceItem::findOrFail($id);
                    $this->acceptanceService->approveItem($item, $user, 2);
                    $result = true;
                    $message = "QLDA đã duyệt hạng mục \"{$item->name}\"";
                    break;

                case 'acceptance_item_customer':
                    $item = AcceptanceItem::findOrFail($id);
                    $this->acceptanceService->approveItem($item, $user, 3);
                    $result = true;
                    $message = "Khách hàng đã duyệt hạng mục \"{$item->name}\"";
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
                case 'acceptance_pm':
                case 'acceptance_supervisor':
                    $model = AcceptanceStage::findOrFail($id); break;
                case 'acceptance_item':
                case 'acceptance_item_supervisor':
                case 'acceptance_item_pm':
                case 'acceptance_item_customer':
                    $model = AcceptanceItem::findOrFail($id); break;
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
            } elseif ($model instanceof AcceptanceStage) {
                $this->acceptanceService->rejectStage($model, $user, $reason);
                $result = true;
            } elseif ($model instanceof AcceptanceItem) {
                $this->acceptanceService->rejectItem($model, $user, $reason);
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
                $rejectionField = in_array('rejection_reason', $model->getFillable()) ? 'rejection_reason' : 'rejected_reason';
                $model->$rejectionField = $reason;
                $model->save();
                $result = true;
            }

            if (!$result) {
                DB::rollBack();
                return ['success' => false, 'message' => 'Không thể từ chối yêu cầu này.'];
            }

            DB::commit();
            Log::info("ApprovalActionService: Rejected type {$type}", ['id' => $id, 'user' => $user->id, 'reason' => $reason]);

            return ['success' => true, 'message' => 'Đã từ chối yêu cầu thành công'];

        } catch (Exception $e) {
            DB::rollBack();
            Log::error("ApprovalActionService Reject Error: " . $e->getMessage(), ['type' => $type, 'id' => $id]);
            return ['success' => false, 'message' => 'Lỗi hệ thống: ' . $e->getMessage()];
        }
    }
}
