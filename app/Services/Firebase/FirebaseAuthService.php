<?php

namespace App\Services\Firebase;

use Exception;
use Kreait\Firebase\Auth\SignIn\FailedToSignIn;
use Illuminate\Support\Facades\Log;

class FirebaseAuthService extends BaseFirebaseService
{
    /**
     * Sign in a user with email and password
     * 
     * @param string $email
     * @param string $password
     * @return array Firebase sign-in result
     * @throws Exception
     */
    public function signInWithEmailAndPassword($email, $password)
    {
        try {
            $result = $this->auth->signInWithEmailAndPassword($email, $password);
            // Convert the SignInResult object to an array
            return $result->data();
        } catch (FailedToSignIn $e) {
            throw new Exception('Invalid login credentials');
        }
    }

    /**
     * Get a Firebase user by ID
     * 
     * @param string $uid
     * @return \Kreait\Firebase\Auth\UserRecord
     */
    public function getUserById($uid)
    {
        return $this->auth->getUser($uid);
    }
}

