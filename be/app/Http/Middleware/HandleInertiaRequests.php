<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

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
                        'role' => $user->role ?? null,
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
                // Return total count of all pending operations across CRM modules
                if (!$request->user('admin')) return 0;
                
                try {
                    $count = 0;
                    if (class_exists('App\Models\Cost')) $count += \App\Models\Cost::whereIn('status', ['pending_management_approval', 'pending_accountant_approval'])->count();
                    if (class_exists('App\Models\AcceptanceStage')) $count += \App\Models\AcceptanceStage::whereIn('status', ['pending', 'supervisor_approved', 'project_manager_approved'])->count();
                    if (class_exists('App\Models\ChangeRequest')) $count += \App\Models\ChangeRequest::where('status', 'pending')->count();
                    if (class_exists('App\Models\AdditionalCost')) $count += \App\Models\AdditionalCost::where('status', 'pending')->count();
                    if (class_exists('App\Models\SubcontractorPayment')) $count += \App\Models\SubcontractorPayment::whereIn('status', ['pending_management_approval', 'pending_accountant_confirmation'])->count();
                    if (class_exists('App\Models\Contract')) $count += \App\Models\Contract::where('status', 'pending')->count();
                    if (class_exists('App\Models\ProjectPayment')) $count += \App\Models\ProjectPayment::whereIn('status', ['customer_pending_approval', 'customer_paid'])->count();
                    if (class_exists('App\Models\MaterialBill')) $count += \App\Models\MaterialBill::whereIn('status', ['pending_management', 'pending_accountant'])->count();
                    if (class_exists('App\Models\SubcontractorAcceptance')) $count += \App\Models\SubcontractorAcceptance::where('status', 'pending')->count();
                    if (class_exists('App\Models\SupplierAcceptance')) $count += \App\Models\SupplierAcceptance::where('status', 'pending')->count();
                    if (class_exists('App\Models\ConstructionLog')) $count += \App\Models\ConstructionLog::where('approval_status', 'pending')->count();
                    if (class_exists('App\Models\ScheduleAdjustment')) $count += \App\Models\ScheduleAdjustment::where('status', 'pending')->count();
                    if (class_exists('App\Models\Defect')) $count += \App\Models\Defect::where('status', 'fixed')->count();
                    if (class_exists('App\Models\ProjectBudget')) $count += \App\Models\ProjectBudget::where('status', 'pending')->count();
                    
                    return $count;
                } catch (\Exception $e) {
                    return 0; // Return 0 gracefully if any DB error
                }
            },
        ]);
    }
}
