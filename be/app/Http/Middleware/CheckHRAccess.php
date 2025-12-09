<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\DB;

class CheckHRAccess
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user('sanctum');

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Please login first.'
            ], 401);
        }

        // Check if user has HR role or is admin
        $hasHRRole = DB::table('role_user')
            ->join('roles', 'role_user.role_id', '=', 'roles.id')
            ->where('role_user.user_id', $user->id)
            ->where(function ($q) {
                $q->where('roles.name', 'hr')
                    ->orWhere('roles.name', 'admin');
            })
            ->exists();

        // Also check if user's role field is 'admin' (if exists)
        $isAdmin = $user->role === 'admin' || $hasHRRole;

        if (!$isAdmin && !$hasHRRole) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền truy cập module HR. Chỉ HR và Admin mới có quyền.'
            ], 403);
        }

        return $next($request);
    }
}
