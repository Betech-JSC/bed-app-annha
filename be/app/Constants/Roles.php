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
            self::SUPER_ADMIN => 'Super Admin',
            self::ADMIN => 'Admin',
            self::PROJECT_OWNER => 'Project Owner',
            self::PROJECT_MANAGER => 'Project Manager',
            self::SITE_SUPERVISOR => 'Site Supervisor',
            self::ACCOUNTANT => 'Accountant',
            self::CLIENT => 'Client',
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
            self::SUPER_ADMIN => 'Super administrator with full system access',
            self::ADMIN => 'System administrator with management capabilities',
            self::PROJECT_OWNER => 'Project owner with full project control',
            self::PROJECT_MANAGER => 'Manages projects and coordinates resources',
            self::SITE_SUPERVISOR => 'Supervises construction site operations',
            self::ACCOUNTANT => 'Handles financial and accounting operations',
            self::CLIENT => 'Client with view and approval permissions',
        ];
    }
}
