<?php

namespace App\Http\Controllers\Api;

use App\Constants\Permissions;
use App\Services\AuthorizationService;

/**
 * Trait cung cấp permission check cho tất cả API controllers (Mobile).
 * User model: check permission qua AuthorizationService.
 * Owner / SuperAdmin → full access bypass.
 */
trait ApiAuthorization
{
    /**
     * Require permission - abort 403 if not authorized
     */
    protected function apiRequire($user, string $permission, $project = null): void
    {
        if (!$user) {
            abort(401, 'Unauthorized');
        }

        // Owner / SuperAdmin bypass
        if ($user->owner || $user->isSuperAdmin()) {
            return;
        }

        $authService = app(AuthorizationService::class);
        $authService->require($user, $permission, $project);
    }

    /**
     * Check permission - return boolean
     */
    protected function apiCan($user, string $permission, $project = null): bool
    {
        if (!$user) return false;

        // Owner / SuperAdmin bypass
        if ($user->owner || $user->isSuperAdmin()) {
            return true;
        }

        $authService = app(AuthorizationService::class);
        return $authService->can($user, $permission, $project);
    }
}
