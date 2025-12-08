<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class VerifyCsrfToken
{
    /**
     * The URIs that should be excluded from CSRF verification.
     *
     * @var array
     */
    protected $except = [
        'api/register',  // Exclude the register route
        'api/login',     // Exclude the login route
    ];

    public function handle(Request $request, Closure $next)
    {
        return parent::handle($request, $next);
    }
}
