<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\ProjectPersonnel;

class CheckPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $permission, ?string $projectIdParam = null): Response
    {
        $user = $request->user('sanctum');

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Please login first.'
            ], 401);
        }

        // Super admin có toàn quyền
        if ($user->role === 'admin' && $user->owner === true) {
            return $next($request);
        }

        // Check permission thông qua ProjectPersonnel nếu có projectIdParam
        if ($projectIdParam && $request->route($projectIdParam)) {
            $projectId = $request->route($projectIdParam);
            $personnel = ProjectPersonnel::where('project_id', $projectId)
                ->where('user_id', $user->id)
                ->first();

            if ($personnel && $personnel->hasPermission($permission)) {
                return $next($request);
            }
        }

        // Check permission thông qua roles
        $hasPermission = $user->roles()
            ->whereHas('permissions', function ($query) use ($permission) {
                $query->where('permissions.name', $permission);
            })
            ->exists();

        if (!$hasPermission) {
            return response()->json([
                'success' => false,
                'message' => "Bạn không có quyền thực hiện hành động này. Cần quyền: {$permission}"
            ], 403);
        }

        return $next($request);
    }
}
