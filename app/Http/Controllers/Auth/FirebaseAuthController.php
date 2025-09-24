<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\FirebaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Log;

class FirebaseAuthController extends Controller 
{
    protected $firebase;

    public function __construct(FirebaseService $firebase)
    {
        $this->firebase = $firebase;
    }

    public function login(Request $request)
    {
        try {
            $validated = $request->validate([
                'email' => 'required|email',
                'password' => 'required',
            ]);

            Log::debug('Login attempt', [
                'email' => $validated['email'],
            ]);

            // Authentication
            try {
                $signInResult = $this->firebase->signInWithEmailAndPassword($validated['email'], $validated['password']);

                // Debug what we received
                Log::debug('Firebase sign-in result:', ['result' => $signInResult]);

                // Extract UID based on the structure (adapt the keys as needed)
                if (is_object($signInResult) && method_exists($signInResult, 'firebaseUserId')) {
                    $uid = $signInResult->firebaseUserId();
                } elseif (is_array($signInResult)) {
                    // Try common key names for user ID
                    $uid = $signInResult['uid'] ?? 
                           $signInResult['localId'] ?? 
                           $signInResult['user_id'] ?? 
                           $signInResult['userId'] ?? null;
                    
                    if (!$uid) {
                        Log::error('Could not find UID in sign-in result', ['result' => $signInResult]);
                        throw new \Exception('Authentication successful but could not determine user ID');
                    }
                } else {
                    throw new \Exception('Unexpected sign-in result format');
                }

                Log::debug('Firebase authentication successful', [
                    'uid' => $uid,
                    'email' => $validated['email'],
                ]);
            } catch (\Exception $e) {
                Log::error('Firebase authentication failed: ' . $e->getMessage(), [
                    'email' => $validated['email'],
                    'exception' => $e
                ]);
                return redirect()->back()->withErrors(['email' => 'Invalid email or password.']);
            }

            // User data retrieval
            try {
                $userData = $this->firebase->getUserData($uid);
                
                Log::debug('User data retrieved', [
                    'uid' => $uid,
                    'userData' => $userData,
                ]);
                
                // Validate user data exists
                if (!$userData) {
                    Log::error('User authenticated but no data found', ['uid' => $uid]);
                    return redirect()->back()->withErrors(['email' => 'Account not properly configured. Please contact support.']);
                }

                // Validate user status (stored as 'Active'/'Inactive')
                $status = $userData['status'] ?? null;
                if ($status !== 'Active') {
                    Log::error('User account not active', ['uid' => $uid, 'status' => $status]);
                    return redirect()->back()->withErrors(['email' => 'Your account is not active. Please contact support.']);
                }

                // Validate user role
                $role = $userData['role'] ?? null;
                if (empty($role)) {
                    Log::error('User has no role assigned', ['uid' => $uid]);
                    return redirect()->back()->withErrors(['email' => 'Your account has no permissions assigned. Please contact support.']);
                }

                // Store user data in session
                Session::put('user', [
                    'uid' => $uid,
                    'email' => $validated['email'],
                    'role' => $role,
                    'name' => $userData['name'] ?? 'Unknown User',
                    'status' => $status,
                ]);

                return $this->redirectBasedOnRole($role);
                
            } catch (\Exception $e) {
                Log::error('Error getting user data: ' . $e->getMessage(), ['exception' => $e, 'uid' => $uid]);
                return redirect()->back()->withErrors(['email' => 'We encountered an issue with your account. Please try again later.']);
            }
        } catch (\Exception $e) {
            Log::error('Unexpected error during login: ' . $e->getMessage(), ['exception' => $e]);
            return redirect()->back()->withErrors(['email' => 'An unexpected error occurred. Please try again later.']);
        }
    }

    public function logout()
    {
        Session::forget('user');
        return redirect()->route('login');
    }

    protected function redirectBasedOnRole($role)
    {
        switch ($role) {
            case 'Principal':
                return redirect()->route('principal.dashboard');
            case 'Head Teacher':
                return redirect()->route('head.dashboard');
            case 'Science Teacher':
                return redirect()->route('science.dashboard');
            default:
                Log::warning('User has unrecognized role', ['role' => $role]);
                return redirect()->route('login')
                    ->withErrors(['email' => 'Your account type is not recognized. Please contact support.']);
        }
    }
}