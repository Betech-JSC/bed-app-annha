<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * The path to the "home" route for your application.
     *
     * This is used by Laravel authentication to redirect users after login.
     *
     * @var string
     */
    public const HOME = '/';

    /**
     * Register any application services.
     */
    public function register(): void
    {
        Model::unguard();
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //

        $this->bootRoute();
    }

    public function bootRoute(): void
    {
        // Increased rate limit for mobile app usage
        // 120 requests per minute per user (2 requests per second)
        // For unauthenticated requests, use IP-based limiting (60 per minute)
        RateLimiter::for('api', function (Request $request) {
            if ($request->user()) {
                // Authenticated users: 120 requests per minute
                return Limit::perMinute(120)->by($request->user()->id);
            }
            // Unauthenticated: 60 requests per minute per IP
            return Limit::perMinute(60)->by($request->ip());
        });
    }
}
