<?php

namespace App\Services\Firebase;

use Exception;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Database as RealtimeDatabase;
use Google\Cloud\Firestore\FirestoreClient;

class FirebaseDataService
{
    /** Firestore (cached) */
    private ?FirestoreClient $firestore = null;

    /** Realtime Database (cached) */
    private ?RealtimeDatabase $database = null;

    /**
     * Get Firestore database (cached)
     */
    public function getFirestore(): FirestoreClient
    {
        if ($this->firestore) {
            return $this->firestore;
        }

        // Prefer Laravel binding if available
        try {
            if (app()->bound('firebase.firestore')) {
                $firestoreComponent = app('firebase.firestore'); // Kreait Firestore component
                $this->firestore = $firestoreComponent->database(); // Google\Cloud\Firestore\FirestoreClient
                return $this->firestore;
            }
        } catch (\Throwable $e) {
            Log::warning('firebase.firestore binding not available: ' . $e->getMessage());
        }

        // Fallback: Factory + credentials
        $factory = app()->bound('firebase.factory')
            ? app('firebase.factory')
            : new Factory();

        $credentialsPath = env('FIREBASE_CREDENTIALS', storage_path('app/firebase/firebase_credentials.json'));
        if (is_string($credentialsPath) && file_exists($credentialsPath)) {
            $factory = $factory->withServiceAccount($credentialsPath);
        } else {
            Log::warning('Firebase credentials file not found at: ' . $credentialsPath);
        }

        $this->firestore = $factory->createFirestore()->database();
        return $this->firestore;
    }

    /**
     * Get Realtime Database (cached)
     */
    public function getDatabase(): RealtimeDatabase
    {
        if ($this->database) {
            return $this->database;
        }

        // Prefer Laravel binding if available
        try {
            if (app()->bound('firebase.database')) {
                $this->database = app('firebase.database');
                return $this->database;
            }
        } catch (\Throwable $e) {
            Log::warning('firebase.database binding not available: ' . $e->getMessage());
        }

        // Fallback: Factory + credentials
        $factory = app()->bound('firebase.factory')
            ? app('firebase.factory')
            : new Factory();

        $credentialsPath = env('FIREBASE_CREDENTIALS', storage_path('app/firebase/firebase_credentials.json'));
        if (is_string($credentialsPath) && file_exists($credentialsPath)) {
            $factory = $factory->withServiceAccount($credentialsPath);
        } else {
            Log::warning('Firebase credentials file not found at: ' . $credentialsPath);
        }

        $this->database = $factory->createDatabase();
        return $this->database;
    }

    /**
     * Get document from a Firestore collection
     */
    public function getDocumentFromCollection(string $collection, string $document)
    {
        $firestore = $this->getFirestore();
        return $firestore->collection($collection)->document($document)->snapshot();
    }

    /**
     * Get data from a path in Firebase Realtime Database
     */
    public function get(string $path)
    {
        return $this->getDatabase()->getReference($path)->getValue();
    }
    
    /**
     * Set data at a path in Firebase Realtime Database
     */
    public function set(string $path, $data)
    {
        return $this->getDatabase()->getReference($path)->set($data);
    }

    /**
     * Count documents in a collection with optional filters
     */
    public function countDocumentsInCollection(string $collection, array $filters = []): int
    {
        try {
            $firestore = $this->getFirestore();
            $query = $firestore->collection($collection);

            foreach ($filters as $filter) {
                $query = $query->where($filter['field'], $filter['operator'], $filter['value']);
            }

            $count = 0;
            foreach ($query->documents() as $_) {
                $count++;
            }
            return $count;
        } catch (\Throwable $e) {
            Log::error("Error counting documents in {$collection}: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Get documents from collection with optional filters
     *
     * @return \Google\Cloud\Firestore\DocumentSnapshot[]
     */
    public function getDocumentsFromCollection(string $collection, array $filters = []): array
    {
        try {
            $firestore = $this->getFirestore();
            $query = $firestore->collection($collection);

            foreach ($filters as $filter) {
                $query = $query->where($filter['field'], $filter['operator'], $filter['value']);
            }

            $documents = [];
            foreach ($query->documents() as $document) {
                $documents[] = $document;
            }
            return $documents;
        } catch (\Throwable $e) {
            Log::error("Error getting documents from {$collection}: " . $e->getMessage());
            return [];
        }
    }
}