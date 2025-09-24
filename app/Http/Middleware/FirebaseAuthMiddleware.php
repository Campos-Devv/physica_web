<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\View;

class FirebaseAuthMiddleware
{
    public function handle(Request $request, Closure $next, ...$roles)
    {
        // If the user is already at the login page, don't redirect again
        if ($request->routeIs('login')) {
            View::share('userRole', 'guest');
            return $next($request);
        }

        if (!Session::has('user')) {
            // Share guest role with views
            View::share('userRole', 'guest');
            return redirect()->route('login');
        }

        // Get user role from session
        $userRole = Session::get('user.role');
        
        // Share the role with all views
        View::share('userRole', $userRole);

        // If no roles are specified or roles array is empty, just check if user is logged in
        if (empty($roles)) {
            return $next($request);
        }
        
    // Allow Principal to access principal routes (case difference between stored role and middleware param)
    if ($userRole === 'Principal' && in_array('principal', $roles)) {
            return $next($request);
        }

    // Allow Head Teacher to access head routes
    if ($userRole === 'Head Teacher' && in_array('head', $roles)) {
            return $next($request);
        }

    // Allow Science Teacher to access science routes
    if ($userRole === 'Science Teacher' && in_array('science', $roles)) {
            return $next($request);
        }
        
        // Check if the user has any of the required roles for this route
        if (!in_array($userRole, $roles)) {
            // Instead of redirecting to login, redirect to an unauthorized page
            // or to the home page with an error message
            return redirect()->route('unauthorized', ['intended' => $request->path()]);
        }
        
        return $next($request);
    }
}