<?php

namespace App\Services;

use App\Services\Firebase\FirebaseAuthService;
use App\Services\Firebase\FirebaseDataService;
use App\Services\Firebase\FirebaseUserService;
use App\Services\Firebase\FirebaseAnalyticsService;
use App\Services\Firebase\FirebaseStorageService;
use Google\Cloud\Firestore\FirestoreClient;
use Exception;
use Illuminate\Support\Facades\Log;

class FirebaseService
{
    protected $authService;
    protected $dataService;
    protected $userService;
    protected $analyticsService;
    protected $storageService;
    
    /**
     * Initialize all sub-services
     */
    public function __construct()
    {
        $this->authService = new FirebaseAuthService();
        $this->dataService = new FirebaseDataService();
        $this->userService = new FirebaseUserService();
        $this->analyticsService = new FirebaseAnalyticsService();
        $this->storageService = new FirebaseStorageService();
    }
    
    /**
     * Sign in with email and password
     * 
     * @param string $email
     * @param string $password
     * @return array
     */
    public function signInWithEmailAndPassword($email, $password)
    {
        return $this->authService->signInWithEmailAndPassword($email, $password);
    }
    
    /**
     * Get user by ID
     * 
     * @param string $uid
     * @return \Kreait\Firebase\Auth\UserRecord
     */
    public function getUserById($uid)
    {
        return $this->authService->getUserById($uid);
    }
    
    /**
     * Get document from collection
     * 
     * @param string $collection
     * @param string $document
     * @return \Google\Cloud\Firestore\DocumentSnapshot
     */
    public function getDocumentFromCollection($collection, $document)
    {
        return $this->dataService->getDocumentFromCollection($collection, $document);
    }
    
    /**
     * Get data from Realtime Database
     * 
     * @param string $path
     * @return mixed
     */
    public function get($path)
    {
        return $this->dataService->get($path);
    }
    
    /**
     * Set data in Realtime Database
     * 
     * @param string $path
     * @param mixed $data
     * @return mixed
     */
    public function set($path, $data)
    {
        return $this->dataService->set($path, $data);
    }
    
    /**
     * Get user data from Firestore or Realtime Database
     * 
     * @param string $uid
     * @return array|null
     */
    public function getUserData($uid)
    {
        return $this->userService->getUserData($uid);
    }
    
    /**
     * Get student registration statistics
     * 
     * @return array
     */
    public function getStudentRegistrationStats()
    {
        return $this->analyticsService->getStudentRegistrationStats();
    }
    
    /**
     * Get empty chart data structure
     * 
     * @return array
     */
    public function getEmptyChartData()
    {
        return $this->analyticsService->getEmptyChartData();
    }

    /**
     * Count documents in a collection with optional filters
     *
     * @param string $collection Collection name
     * @param array $filters Optional array of filters
     * @return int
     */
    public function countDocumentsInCollection(string $collection, array $filters = [])
    {
        return $this->dataService->countDocumentsInCollection($collection, $filters);
    }

    /**
     * Get documents from collection with optional filters
     *
     * @param string $collection Collection name
     * @param array $filters Optional array of filters
     * @return array
     */
    public function getDocumentsFromCollection(string $collection, array $filters = [])
    {
        return $this->dataService->getDocumentsFromCollection($collection, $filters);
    }

    /**
     * Create a new teacher
     *
     * @param array $data Teacher data
     * @return array
     */
    public function createTeacher(array $data)
    {
        return $this->userService->createTeacher($data);
    }

    /**
     * Update an existing teacher
     *
     * @param string $id Teacher ID
     * @param array $data Teacher data
     * @return array
     */
    public function updateTeacher(string $id, array $data)
    {
        return $this->userService->updateTeacher($id, $data);
    }

    /**
     * Update teacher status
     *
     * @param string $id Teacher ID
     * @param string $status New status (active or inactive)
     * @return array
     */
    public function updateTeacherStatus(string $id, string $status)
    {
        return $this->userService->updateTeacherStatus($id, $status);
    }

    /**
     * Delete a teacher
     *
     * @param string $id Teacher ID
     * @return array
     */
    public function deleteTeacher(string $id)
    {
        return $this->userService->deleteTeacher($id);
    }
    
    /**
     * Get Firebase Storage instance
     *
     * @return \Kreait\Firebase\Storage
     */
    public function getStorage()
    {
        // Delegate to the dedicated storage service
        return $this->storageService->getStorage();
    }

    /**
     * Expose Firestore database via the data service
     */
    public function getFirestore(): FirestoreClient
    {
        return $this->dataService->getFirestore();
    }
}