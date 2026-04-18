<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;
use App\Constants\Permissions;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Defines the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     */
    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            'auth' => function () use ($request) {
                // CRM uses 'admin' guard which now points to users table
                $user = $request->user('admin') ?? $request->user();
                return [
                    'user' => $user ? [
                        'id' => $user->id,
                        'name' => $user->name,
                        'first_name' => $user->first_name,
                        'last_name' => $user->last_name,
                        'email' => $user->email,
                        'roles' => $user->roles->pluck('name'),
                        'avatar' => $user->avatar_url ?? null,
                        'super_admin' => $user->isSuperAdmin(),
                        'permissions' => $user->getPermissionsArray(),
                    ] : null,
                ];
            },
            // Keep 'admin' prop for backward compatibility with existing CRM pages
            'admin' => function () use ($request) {
                $user = $request->user('admin');
                return [
                    'user' => $user ? [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'super_admin' => $user->isSuperAdmin(),
                    ] : null,
                ];
            },
            'flash' => function () use ($request) {
                return [
                    'success' => $request->session()->get('success'),
                    'error' => $request->session()->get('error'),
                ];
            },
            'pending_approvals_count' => function () use ($request) {
                $user = $request->user('admin') ?? $request->user();
                if (!$user) return 0;
                
                try {
                    // Use the same service as Approval Center and Mobile API for consistency
                    $queryService = new \App\Services\ApprovalQueryService();
                    
                    // Fetch all raw data (filtered by projects the user can see)
                    $data = $queryService->getApprovalData($user);
                    
                    // Categorize items by role/permission (reusing mobile logic as it's the most consistent)
                    $canApproveManagement = $user->hasPermission(Permissions::COST_APPROVE_MANAGEMENT) || $user->isSuperAdmin();
                    $canApproveAccountant = $user->hasPermission(Permissions::COST_APPROVE_ACCOUNTANT) || $user->isSuperAdmin();
                    
                    $items = $queryService->buildMobileItems($user, $data, 'all', $canApproveManagement, $canApproveAccountant);
                    
                    // Filter out non-actionable items (e.g. items the user can see but can't approve yet)
                    $actionableItems = array_filter($items, fn($i) => ($i['can_approve'] ?? false) === true);
                    
                    return count($actionableItems);
                } catch (\Exception $e) {
                    \Log::error("Error calculating pending approvals count: " . $e->getMessage());
                    return 0;
                }
            },
            'system_cost_categories' => function () {
                if (class_exists('App\Models\Cost')) {
                    return \App\Models\Cost::getSystemCategories();
                }
                return [];
            },
        ]);
    }
}
