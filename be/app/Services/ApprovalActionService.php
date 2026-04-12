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
                    $cost = Cost::findOrFail($id);
                    $result = $cost->approveByManagement($user);
                    $message = "Đã duyệt chi phí \"{$cost->name}\" (Ban điều hành)";
                    break;

                case 'accountant':
                    $cost = Cost::findOrFail($id);
                    // Accountant specific check (must have attachments)
                    if ($cost->attachments()->count() === 0) {
                        return ['success' => false, 'message' => 'Yêu cầu thanh toán bắt buộc phải có tệp chứng từ đính kèm. Kế toán cần kiểm tra chứng từ trước khi xác nhận.'];
                    }
                    $result = $cost->approveByAccountant($user);
                    $message = "Đã xác nhận chi phí \"{$cost->name}\" (Kế toán)";
                    break;

                case 'acceptance':
                case 'acceptance_customer':
                    $stage = AcceptanceStage::findOrFail($id);
                    $result = $stage->approveCustomer($user);
                    $message = "Khách hàng đã duyệt nghiệm thu \"{$stage->name}\"";
                    break;

                case 'acceptance_pm':
                    $stage = AcceptanceStage::findOrFail($id);
                    $result = $stage->approveProjectManager($user);
                    $message = "QLDA đã duyệt nghiệm thu \"{$stage->name}\"";
                    break;

                case 'acceptance_supervisor':
                    $stage = AcceptanceStage::findOrFail($id);
                    $result = $stage->approveSupervisor($user);
                    $message = "Giám sát đã duyệt nghiệm thu \"{$stage->name}\"";
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
                    $result = $p->approve($user);
                    $message = "BĐH đã duyệt thanh toán NTP";
                    break;

                case 'sub_payment_confirm':
                    $p = SubcontractorPayment::findOrFail($id);
                    $result = $p->markAsPaid($user);
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
                    $result = $b->approve($user);
                    $message = "Đã duyệt phiếu vật tư";
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
                    $result = $log->approve($user);
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
                    $result = $b->approve($user);
                    $message = "Đã duyệt ngân sách";
                    break;

                case 'equipment_rental_management':
                    $r = EquipmentRental::findOrFail($id);
                    $result = $r->approveByManagement($user);
                    $message = "BĐH duyệt thuê thiết bị";
                    break;

                case 'equipment_rental_accountant':
                    $r = EquipmentRental::findOrFail($id);
                    $result = $r->confirmByAccountant($user);
                    $message = "KT xác nhận thuê thiết bị";
                    break;

                case 'equipment_rental_return':
                    $r = EquipmentRental::findOrFail($id);
                    $result = $r->confirmReturn($user);
                    $message = "Xác nhận trả thiết bị";
                    break;

                case 'asset_usage_management':
                    $u = AssetUsage::findOrFail($id);
                    $result = $u->approveByManagement($user);
                    $message = "BĐH duyệt sử dụng thiết bị";
                    break;

                case 'asset_usage_accountant':
                    $u = AssetUsage::findOrFail($id);
                    $result = $u->confirmByAccountant($user);
                    $message = "KT xác nhận sử dụng thiết bị";
                    break;

                case 'asset_usage_return':
                    $u = AssetUsage::findOrFail($id);
                    $result = $u->confirmReturn($user);
                    $message = "Xác nhận trả thiết bị kho";
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
                default:
                    throw new Exception("Loại cần từ chối không hợp lệ: {$type}");
            }

            // Perform rejection — handle different model signatures
            if (method_exists($model, 'reject')) {
                // Models with signature: reject(string $reason, ?User $user)
                if ($model instanceof Cost 
                    || $model instanceof AdditionalCost 
                    || $model instanceof Contract
                    || $model instanceof AcceptanceItem
                ) {
                    $result = $model->reject($reason, $user);
                } else {
                    // Models with signature: reject(?User $user, ?string $reason)
                    // AcceptanceStage, SubcontractorPayment, ChangeRequest, MaterialBill,
                    // EquipmentRental, AssetUsage, ConstructionLog, ScheduleAdjustment,
                    // ProjectBudget, SubcontractorAcceptance, SupplierAcceptance, Defect
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
