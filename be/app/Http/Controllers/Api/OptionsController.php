<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\Request;

class OptionsController extends Controller
{
    /**
     * Lấy tất cả các options cho dropdowns
     */
    public function index(Request $request)
    {
        $type = $request->query('type');

        switch ($type) {
            case 'project_statuses':
                return $this->getProjectStatuses();
            case 'equipment_statuses':
                return $this->getEquipmentStatuses();
            case 'equipment_types':
                return $this->getEquipmentTypes();
            case 'personnel_roles':
                return $this->getPersonnelRoles();
            case 'cost_statuses':
                return $this->getCostStatuses();
            case 'all':
            default:
                return $this->getAllOptions();
        }
    }

    /**
     * Lấy tất cả options
     */
    private function getAllOptions()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'project_statuses' => $this->getProjectStatuses()->getData(true)['data'],
                'equipment_statuses' => $this->getEquipmentStatuses()->getData(true)['data'],
                'equipment_types' => $this->getEquipmentTypes()->getData(true)['data'],
                'personnel_roles' => $this->getPersonnelRoles()->getData(true)['data'],
                'cost_statuses' => $this->getCostStatuses()->getData(true)['data'],
            ]
        ]);
    }

    /**
     * Trạng thái dự án
     */
    private function getProjectStatuses()
    {
        $statuses = [
            ['value' => 'planning', 'label' => 'Lập kế hoạch', 'color' => '#6B7280'],
            ['value' => 'in_progress', 'label' => 'Đang thực hiện', 'color' => '#10B981'],
            ['value' => 'completed', 'label' => 'Hoàn thành', 'color' => '#3B82F6'],
            ['value' => 'cancelled', 'label' => 'Đã hủy', 'color' => '#EF4444'],
            ['value' => 'on_hold', 'label' => 'Tạm dừng', 'color' => '#F59E0B'],
        ];

        return response()->json([
            'success' => true,
            'data' => $statuses
        ]);
    }

    /**
     * Trạng thái thiết bị
     */
    private function getEquipmentStatuses()
    {
        $statuses = [
            ['value' => 'available', 'label' => 'Sẵn sàng', 'color' => '#10B981'],
            ['value' => 'in_use', 'label' => 'Đang sử dụng', 'color' => '#3B82F6'],
            ['value' => 'maintenance', 'label' => 'Bảo trì', 'color' => '#F59E0B'],
            ['value' => 'retired', 'label' => 'Ngừng sử dụng', 'color' => '#6B7280'],
            ['value' => 'damaged', 'label' => 'Hư hỏng', 'color' => '#EF4444'],
        ];

        return response()->json([
            'success' => true,
            'data' => $statuses
        ]);
    }

    /**
     * Loại thiết bị
     */
    private function getEquipmentTypes()
    {
        $types = [
            ['value' => 'owned', 'label' => 'Sở hữu', 'color' => '#3B82F6'],
            ['value' => 'rented', 'label' => 'Thuê', 'color' => '#10B981'],
        ];

        return response()->json([
            'success' => true,
            'data' => $types
        ]);
    }

    /**
     * Vai trò nhân sự dự án
     */
    private function getPersonnelRoles()
    {
        // Lấy từ database nếu có Role model, nếu không thì dùng default
        try {
            $roles = Role::where('is_active', true)
                ->orderBy('name')
                ->get()
                ->map(function ($role) {
                    return [
                        'value' => $role->code ?? strtolower(str_replace(' ', '_', $role->name)),
                        'label' => $role->name,
                        'description' => $role->description ?? null,
                    ];
                })
                ->toArray();

            // Nếu không có roles trong DB, dùng default
            if (empty($roles)) {
                $roles = $this->getDefaultPersonnelRoles();
            }
        } catch (\Exception $e) {
            // Fallback về default nếu có lỗi
            $roles = $this->getDefaultPersonnelRoles();
        }

        return response()->json([
            'success' => true,
            'data' => $roles
        ]);
    }

    /**
     * Vai trò mặc định (fallback)
     */
    private function getDefaultPersonnelRoles()
    {
        return [
            ['value' => 'project_manager', 'label' => 'Quản lý dự án', 'description' => null],
            ['value' => 'supervisor', 'label' => 'Giám sát', 'description' => null],
            ['value' => 'accountant', 'label' => 'Kế toán', 'description' => null],
            ['value' => 'management', 'label' => 'Ban điều hành', 'description' => null],
            ['value' => 'team_leader', 'label' => 'Tổ trưởng', 'description' => null],
            ['value' => 'worker', 'label' => 'Thợ', 'description' => null],
            ['value' => 'designer', 'label' => 'Bên Thiết Kế', 'description' => null],
            ['value' => 'supervisor_guest', 'label' => 'Giám sát khách', 'description' => null],
            ['value' => 'editor', 'label' => 'Chỉnh sửa', 'description' => null],
            ['value' => 'viewer', 'label' => 'Xem', 'description' => null],
            ['value' => 'guest', 'label' => 'Khách', 'description' => null],
        ];
    }

    /**
     * Trạng thái chi phí
     */
    private function getCostStatuses()
    {
        $statuses = [
            ['value' => 'draft', 'label' => 'Nháp', 'color' => '#6B7280'],
            ['value' => 'pending_management_approval', 'label' => 'Chờ Ban điều hành', 'color' => '#F59E0B'],
            ['value' => 'pending_accountant_approval', 'label' => 'Chờ Kế toán', 'color' => '#3B82F6'],
            ['value' => 'approved', 'label' => 'Đã duyệt', 'color' => '#10B981'],
            ['value' => 'rejected', 'label' => 'Từ chối', 'color' => '#EF4444'],
        ];

        return response()->json([
            'success' => true,
            'data' => $statuses
        ]);
    }
}

