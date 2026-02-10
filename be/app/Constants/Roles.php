<?php

namespace App\Constants;

/**
 * Role Constants
 * 
 * Core roles in the system. These are base roles only - no business logic.
 * All authorization is done through permissions, not role names.
 */
class Roles
{
    public const SUPER_ADMIN = 'super_admin';
    public const ADMIN = 'admin';
    public const PROJECT_OWNER = 'project_owner';
    public const PROJECT_MANAGER = 'project_manager';
    public const SITE_SUPERVISOR = 'site_supervisor';
    public const ACCOUNTANT = 'accountant';
    public const CLIENT = 'client';

    /**
     * Get all role constants as an array
     * 
     * @return array<string>
     */
    public static function all(): array
    {
        return [
            self::SUPER_ADMIN,
            self::ADMIN,
            self::PROJECT_OWNER,
            self::PROJECT_MANAGER,
            self::SITE_SUPERVISOR,
            self::ACCOUNTANT,
            self::CLIENT,
        ];
    }

    /**
     * Get role display names
     * 
     * @return array<string, string>
     */
    public static function displayNames(): array
    {
        return [
            self::SUPER_ADMIN => 'Quản trị hệ thống (Super Admin)',
            self::ADMIN => 'Quản trị viên (Admin)',
            self::PROJECT_OWNER => 'Chủ đầu tư / Đối tác',
            self::PROJECT_MANAGER => 'Quản lý dự án (PM)',
            self::SITE_SUPERVISOR => 'Giám sát công trình',
            self::ACCOUNTANT => 'Kế toán',
            self::CLIENT => 'Khách hàng',
        ];
    }

    /**
     * Get role descriptions
     * 
     * @return array<string, string>
     */
    public static function descriptions(): array
    {
        return [
            self::SUPER_ADMIN => 'Quyền cao nhất, quản lý toàn bộ hệ thống',
            self::ADMIN => 'Quản lý vận hành hệ thống và cấu hình',
            self::PROJECT_OWNER => 'Chủ đầu tư, có quyền kiểm soát toàn bộ dự án của mình',
            self::PROJECT_MANAGER => 'Quản lý trực tiếp dự án, điều phối nguồn lực và tiến độ',
            self::SITE_SUPERVISOR => 'Giám sát trực tiếp tại công trường, ghi nhật ký và nghiệm thu',
            self::ACCOUNTANT => 'Phụ trách các nghiệp vụ tài chính, thanh toán và kế toán',
            self::CLIENT => 'Khách hàng, xem thông tin dự án, tiến độ và duyệt thanh toán',
        ];
    }
}
