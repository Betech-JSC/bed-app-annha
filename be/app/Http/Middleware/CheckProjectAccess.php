<?php

namespace App\Http\Middleware;

use App\Models\Project;
use App\Models\ProjectPersonnel;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckProjectAccess
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $permission = 'view'): Response
    {
        $user = $request->user('sanctum');

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Please login first.'
            ], 401);
        }

        // Get project ID from route parameter
        $projectId = $request->route('projectId') ?? $request->route('id');

        if (!$projectId) {
            return response()->json([
                'success' => false,
                'message' => 'Project ID is required.'
            ], 400);
        }

        // Find project
        $project = Project::find($projectId);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Project not found.'
            ], 404);
        }

        // Check if user is customer (owner) of the project
        if ($project->customer_id === $user->id) {
            // Customer has full access
            $request->merge(['project' => $project]);
            return $next($request);
        }

        // Check if user is project manager
        if ($project->project_manager_id === $user->id) {
            // Project manager has full access
            $request->merge(['project' => $project]);
            return $next($request);
        }

        // Check if user is in project personnel
        $personnel = ProjectPersonnel::where('project_id', $project->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$personnel) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have access to this project.'
            ], 403);
        }

        // Check permission based on role
        $hasAccess = match ($permission) {
            'view' => $personnel->canView(),
            'edit' => $personnel->canEdit(),
            'approve' => $personnel->canApprove(),
            default => $personnel->canView(),
        };

        if (!$hasAccess) {
            return response()->json([
                'success' => false,
                'message' => "You do not have {$permission} permission for this project."
            ], 403);
        }

        // Attach project and personnel to request for use in controllers
        $request->merge([
            'project' => $project,
            'personnel' => $personnel,
        ]);

        return $next($request);
    }
}
