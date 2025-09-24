<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Session;

class LoginController extends Controller
{
   /**
    * Show the application's login form.
    *
    * @return \Illuminate\View\View|\Illuminate\Http\RedirectResponse
    */
   public function showLoginForm()
   {
        if (Session::has('user')) {
            $role = Session::get('user.role');

            switch ($role) {
                case 'Principal':
                    return redirect()->route('principal.dashboard');
                case 'Head Teacher':
                    return redirect()->route('head.dashboard');
                case 'Science Teacher':
                    return redirect()->route('science.dashboard');
                default:
                    return redirect()->route('login');
            }
        }

        return view('auth.login');
   }
}