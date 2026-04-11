<?php

namespace App\Http\Controllers\Admin;

use App\Constants\Permissions;
use App\Services\AuthorizationService;

/**
 * Trait cung cấp permission check cho tất cả CRM controllers.
 * Admin model (superadmin) → full access, User model → check permission.
 */
trait CrmAuthorization
{
    protected function crmRequire($user, string $permission, $project = null): void
    {
        // Only explicit super admins bypass security
        if ($user instanceof \App\Models\Admin && $user->super_admin) return;

        $authService = app(AuthorizationService::class);
        $authService->require($user, $permission, $project);
    }

    protected function crmCan($user, string $permission, $project = null): bool
    {
        if ($user instanceof \App\Models\Admin && $user->super_admin) return true;

        $authService = app(AuthorizationService::class);
        return $authService->can($user, $permission, $project);
    }
}
