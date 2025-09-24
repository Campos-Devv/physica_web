<?php

namespace App\Services\Firebase;

use Exception;
use Illuminate\Support\Facades\Log;

class FirebaseUserService extends BaseFirebaseService
{
    /**
     * Get user data from Firestore or Realtime Database
     * 
     * @param string $uid
     * @return array|null User data
     */
    public function getUserData($uid)
    {
        try {
            Log::debug('Getting user data for UID', ['uid' => $uid]);
            
            // Try Firestore first if available
            if ($this->firestore) {
                // First check admin_accounts collection by uid field
                Log::debug('Checking admin_accounts collection', ['uid' => $uid]);
                
                try {
                    $adminQuery = $this->firestore->database()->collection('admin_accounts')->where('uid', '=', $uid);
                    $adminDocs = $adminQuery->documents();
                    
                    foreach ($adminDocs as $doc) {
                        if ($doc->exists()) {
                            $data = $doc->data();
                            Log::info('Found user in admin_accounts collection', [
                                'uid' => $uid, 
                                'document_id' => $doc->id(),
                                'data' => $data
                            ]);
                            return $data;
                        }
                    }
                    
                    Log::debug('User not found in admin_accounts by uid', ['uid' => $uid]);
                    
                    // Also try to search by email if not found by uid
                    // Get the user email from Firebase Auth
                    $authUser = $this->auth->getUser($uid);
                    $email = $authUser->email;
                    
                    Log::debug('Trying to find admin by email', ['email' => $email]);
                    
                    $emailQuery = $this->firestore->database()->collection('admin_accounts')->where('email', '=', $email);
                    $emailDocs = $emailQuery->documents();
                    
                    foreach ($emailDocs as $doc) {
                        if ($doc->exists()) {
                            $data = $doc->data();
                            Log::info('Found user in admin_accounts collection by email', [
                                'email' => $email, 
                                'document_id' => $doc->id(),
                                'data' => $data
                            ]);
                            
                            // Update the uid field if it doesn't match
                            if ($data['uid'] !== $uid) {
                                Log::info('Updating uid in admin_accounts document', [
                                    'old_uid' => $data['uid'],
                                    'new_uid' => $uid
                                ]);
                                
                                $docRef = $this->firestore->database()->collection('admin_accounts')->document($doc->id());
                                $docRef->update([
                                    ['path' => 'uid', 'value' => $uid]
                                ]);
                                
                                $data['uid'] = $uid;
                            }
                            
                            return $data;
                        }
                    }
                } catch (Exception $e) {
                    Log::error('Error querying admin_accounts: ' . $e->getMessage(), ['exception' => $e, 'uid' => $uid]);
                }
                
                // Then check users collection
                Log::debug('Checking users collection', ['uid' => $uid]);
                
                try {
                    $userDoc = $this->firestore->database()->collection('users')->document($uid)->snapshot();
                    
                    if ($userDoc->exists()) {
                        Log::info('Found user in users collection', ['uid' => $uid, 'document_id' => $userDoc->id()]);
                        return $userDoc->data();
                    }
                } catch (Exception $e) {
                    Log::error('Error querying users: ' . $e->getMessage(), ['exception' => $e, 'uid' => $uid]);
                }
                
                Log::debug('User not found in Firestore collections', ['uid' => $uid]);
            } else {
                Log::warning('Firestore is not initialized, falling back to Realtime Database');
            }
            
            // Fallback to Realtime Database
            $userData = $this->database->getReference('users/' . $uid)->getValue();
            
            if ($userData) {
                Log::info('Found user in Realtime Database', ['uid' => $uid]);
            } else {
                Log::warning('User not found in any database', ['uid' => $uid]);
            }
            
            return $userData;
        } catch (Exception $e) {
            Log::error('Error fetching user data: ' . $e->getMessage(), ['exception' => $e, 'uid' => $uid]);
            return null;
        }
    }
    
    /**
     * Create a new teacher
     *
     * @param array $data Teacher data
     * @return array
     */
    public function createTeacher(array $data)
    {
        try {
            // Check if email exists first
            try {
                $existingUser = $this->auth->getUserByEmail($data['email']);
                if ($existingUser) {
                    return [
                        'success' => false,
                        'message' => 'The email address is already in use by another account.'
                    ];
                }
            } catch (\Kreait\Firebase\Exception\Auth\UserNotFound $e) {
                // Email not found, we can proceed
            }
            
            // Create user in Firebase Auth
            $userProperties = [
                'email' => $data['email'],
                'password' => $data['password'],
                'displayName' => $data['first_name'] . ' ' . $data['last_name'],
                'emailVerified' => true,
                'disabled' => $data['status'] === 'inactive',
            ];
            
            $authUser = $this->auth->createUser($userProperties);
            
            // Set custom claims based on role
            $this->auth->setCustomUserClaims($authUser->uid, ['role' => $data['teacher_role']]);
            
            // Save to Firestore
            $teacherData = [
                'uid' => $authUser->uid,
                'name' => $data['first_name'] . ' ' . $data['last_name'],
                'email' => $data['email'],
                'role' => $data['teacher_role'],
                'strand' => $data['strand'],
                'status' => $data['status'],
                'created_at' => \Carbon\Carbon::now()->toDateTimeString(),
                'updated_at' => \Carbon\Carbon::now()->toDateTimeString()
            ];
            
            $this->firestore->database()->collection('admin_accounts')->document($authUser->uid)->set($teacherData);
            
            return [
                'success' => true,
                'message' => 'Teacher created successfully',
                'teacher' => $teacherData
            ];
        } catch (\Kreait\Firebase\Exception\Auth\EmailExists $e) {
            return [
                'success' => false,
                'message' => 'The email address is already in use by another account.'
            ];
        } catch (Exception $e) {
            Log::error('Error creating teacher: ' . $e->getMessage());
            throw $e;
        }
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
        try {
            // Check if teacher exists
            $teacherDoc = $this->firestore->database()->collection('admin_accounts')->document($id)->snapshot();
            
            if (!$teacherDoc->exists()) {
                return [
                    'success' => false,
                    'message' => 'Teacher not found'
                ];
            }
            
            // Update Firestore document
            $teacherData = [
                'name' => $data['first_name'] . ' ' . $data['last_name'],
                'role' => $data['teacher_role'],
                'strand' => $data['strand'],
                'status' => $data['status'],
                'updated_at' => \Carbon\Carbon::now()->toDateTimeString()
            ];
            
            $this->firestore->database()->collection('admin_accounts')->document($id)->update($teacherData);
            
            // Update Firebase Auth user if password provided
            if (!empty($data['password'])) {
                $this->auth->changeUserPassword($id, $data['password']);
            }
            
            // Update disabled status based on active/inactive
            $this->auth->updateUser($id, [
                'displayName' => $teacherData['name'],
                'disabled' => $data['status'] === 'inactive',
            ]);
            
            // Update custom claims based on role
            $this->auth->setCustomUserClaims($id, ['role' => $data['teacher_role']]);
            
            return [
                'success' => true,
                'message' => 'Teacher updated successfully',
                'teacher' => array_merge(['id' => $id], $teacherData)
            ];
        } catch (Exception $e) {
            Log::error('Error updating teacher: ' . $e->getMessage());
            throw $e;
        }
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
        try {
            // Check if teacher exists
            $teacherDoc = $this->firestore->database()->collection('admin_accounts')->document($id)->snapshot();
            
            if (!$teacherDoc->exists()) {
                return [
                    'success' => false,
                    'message' => 'Teacher not found'
                ];
            }
            
            // Update status in Firestore
            $this->firestore->database()->collection('admin_accounts')->document($id)->update([
                ['path' => 'status', 'value' => $status],
                ['path' => 'updated_at', 'value' => \Carbon\Carbon::now()->toDateTimeString()]
            ]);
            
            // Update disabled status in Firebase Auth if possible
            try {
                $this->auth->updateUser($id, [
                    'disabled' => $status === 'inactive',
                ]);
            } catch (Exception $e) {
                Log::warning('Could not update user auth status: ' . $e->getMessage());
                // Continue anyway as Firestore was updated
            }
            
            return [
                'success' => true,
                'message' => 'Teacher status updated successfully',
                'status' => $status
            ];
        } catch (Exception $e) {
            Log::error('Error updating teacher status: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Delete a teacher
     *
     * @param string $id Teacher ID
     * @return array
     */
    public function deleteTeacher(string $id)
    {
        try {
            // Try to delete from Firestore
            try {
                $this->firestore->database()->collection('admin_accounts')->document($id)->delete();
                Log::info("Teacher document deleted from Firestore: {$id}");
            } catch (Exception $e) {
                Log::warning("Error deleting from Firestore: {$e->getMessage()}");
                // Continue to try Auth deletion anyway
            }
            
            // Try to delete from Auth as well
            try {
                $this->auth->deleteUser($id);
                Log::info("Teacher deleted from Auth: {$id}");
            } catch (Exception $e) {
                Log::warning("Could not delete user from auth: {$e->getMessage()}");
                // If we deleted from Firestore but not Auth, still consider it a partial success
            }
            
            return [
                'success' => true,
                'message' => 'Teacher removed successfully'
            ];
        } catch (Exception $e) {
            Log::error("Error in deleteTeacher method: {$e->getMessage()}");
            throw $e;
        }
    }
}