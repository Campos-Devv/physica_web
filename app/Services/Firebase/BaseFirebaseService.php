<?php

namespace App\Services\Firebase;

use Exception;
use Kreait\Firebase\Factory;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

abstract class BaseFirebaseService
{
    protected $firebase;
    protected $auth;
    protected $database;
    protected $firestore;
    
    public function __construct()
    {
        try {
            // Initialize Firebase with credentials from firebase.php config
            $this->firebase = (new Factory)
                ->withServiceAccount(config('firebase.projects.app.credentials'));
                
            // Only add database URI if it's set
            $databaseUrl = env('FIREBASE_DATABASE_URL');
            if ($databaseUrl) {
                $this->firebase = $this->firebase->withDatabaseUri($databaseUrl);
            }

            // Initialize services
            $this->auth = $this->firebase->createAuth();
            
            // Check if Firestore class exists before creating it
            if (class_exists('Google\Cloud\Firestore\FirestoreClient')) {
                $this->firestore = $this->firebase->createFirestore();
            }
            
            // Only initialize Realtime Database if URL is provided
            if ($databaseUrl) {
                $this->database = $this->firebase->createDatabase();
            }
        } catch (Exception $e) {
            Log::error('Firebase initialization error: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Parse timestamp from Firestore
     * 
     * @param mixed $timestamp
     * @return Carbon|null
     */
    protected function parseTimestamp($timestamp)
    {
        try {
            // Handle Firestore Timestamp object
            if (is_object($timestamp) && method_exists($timestamp, 'get')) {
                return Carbon::createFromTimestamp($timestamp->get()->getTimestamp());
            }
            
            // Handle timestamp as string (ISO 8601)
            if (is_string($timestamp)) {
                return Carbon::parse($timestamp);
            }
            
            // Handle timestamp as integer
            if (is_numeric($timestamp)) {
                return Carbon::createFromTimestamp($timestamp);
            }
            
            return null;
        } catch (Exception $e) {
            Log::warning("Failed to parse timestamp: " . $e->getMessage());
            return null;
        }
    }
}