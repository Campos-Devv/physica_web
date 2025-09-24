<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Kreait\Firebase\Factory;
use Google\Cloud\Firestore\FirestoreClient;

class ListAdminAccounts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'admin:list';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'List all admin accounts in Firebase';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("Listing all admin accounts...");
        
        try {
            // Check credentials file path
            $credentialsPath = storage_path('app/firebase/firebase_credentials.json');
            
            if (!file_exists($credentialsPath)) {
                $this->error("Firebase credentials file not found at: $credentialsPath");
                return 1;
            }
            
            // Connect to Firebase Authentication
            $factory = (new Factory)->withServiceAccount($credentialsPath);
            $auth = $factory->createAuth();
            
            // Connect to Firestore
            $firestore = new FirestoreClient([
                'keyFilePath' => $credentialsPath,
            ]);
            
            // Get all admin accounts from Firestore
            $collection = $firestore->collection('admin_accounts');
            $documents = $collection->documents();
            
            $this->info("\nFirestore Admin Accounts:");
            $count = 0;
            
            foreach ($documents as $document) {
                if ($document->exists()) {
                    $count++;
                    $data = $document->data();
                    
                    $this->info("\nAdmin #{$count}:");
                    $this->info("Document ID: {$document->id()}");
                    
                    foreach ($data as $key => $value) {
                        if (is_array($value)) {
                            $this->info("{$key}: " . json_encode($value));
                        } else {
                            $this->info("{$key}: {$value}");
                        }
                    }
                    
                    // Try to get the Firebase Auth user
                    if (isset($data['uid'])) {
                        try {
                            $authUser = $auth->getUser($data['uid']);
                            $this->info("Firebase Auth: ✅ Valid UID");
                        } catch (\Exception $e) {
                            $this->error("Firebase Auth: ❌ Invalid UID: " . $e->getMessage());
                        }
                    } else {
                        $this->warn("Firebase Auth: ⚠️ No UID field found");
                    }
                    
                    // Try to get by email
                    if (isset($data['email'])) {
                        try {
                            $authUserByEmail = $auth->getUserByEmail($data['email']);
                            $this->info("Firebase Auth by Email: ✅ Found (UID: {$authUserByEmail->uid})");
                            
                            // Check if UIDs match
                            if (isset($data['uid']) && $data['uid'] !== $authUserByEmail->uid) {
                                $this->warn("⚠️ UID mismatch - Firestore: {$data['uid']}, Firebase Auth: {$authUserByEmail->uid}");
                            }
                        } catch (\Exception $e) {
                            $this->error("Firebase Auth by Email: ❌ Not found: " . $e->getMessage());
                        }
                    }
                }
            }
            
            if ($count === 0) {
                $this->info("No admin accounts found in Firestore.");
            } else {
                $this->info("\nTotal admin accounts found: {$count}");
            }
            
            // Get all Firebase Auth users
            $this->info("\nFirebase Authentication Users:");
            
            try {
                $usersCount = 0;
                $pageSize = 100;
                
                $users = $auth->listUsers($pageSize);
                
                foreach ($users as $user) {
                    $usersCount++;
                    $this->info("\nUser #{$usersCount}:");
                    $this->info("UID: {$user->uid}");
                    $this->info("Email: {$user->email}");
                    $this->info("Display Name: {$user->displayName}");
                    $this->info("Email Verified: " . ($user->emailVerified ? 'Yes' : 'No'));
                    $this->info("Disabled: " . ($user->disabled ? 'Yes' : 'No'));
                    
                    // Get custom claims
                    $customClaims = $user->customClaims;
                    if (!empty($customClaims)) {
                        $this->info("Custom Claims:");
                        foreach ($customClaims as $key => $value) {
                            $this->info("  {$key}: {$value}");
                        }
                    }
                    
                    // Check if exists in admin_accounts
                    $adminQuery = $firestore->collection('admin_accounts')->where('email', '=', $user->email);
                    $adminDocs = $adminQuery->documents();
                    
                    $foundInAdminAccounts = false;
                    foreach ($adminDocs as $doc) {
                        if ($doc->exists()) {
                            $foundInAdminAccounts = true;
                            $this->info("Admin Account: ✅ Found in admin_accounts (Document ID: {$doc->id()})");
                            break;
                        }
                    }
                    
                    if (!$foundInAdminAccounts) {
                        $this->warn("Admin Account: ⚠️ Not found in admin_accounts");
                    }
                }
                
                if ($usersCount === 0) {
                    $this->info("No users found in Firebase Authentication.");
                } else {
                    $this->info("\nTotal Firebase Auth users found: {$usersCount}");
                }
            } catch (\Exception $e) {
                $this->error("Error listing Firebase Auth users: " . $e->getMessage());
            }
            
            return 0;
            
        } catch (\Exception $e) {
            $this->error("Error listing admin accounts: " . $e->getMessage());
            return 1;
        }
    }
}
