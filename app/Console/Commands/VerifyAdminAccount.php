<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Kreait\Firebase\Factory;
use Google\Cloud\Firestore\FirestoreClient;
use Illuminate\Support\Facades\Log;

class VerifyAdminAccount extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'admin:verify {email : The email of the admin to verify}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verify and fix an admin account in Firebase Auth and Firestore';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');
        
        $this->info("Verifying admin account: {$email}");
        
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
            
            // Check Laravel database
            $localUser = User::where('email', $email)->first();
            
            $this->info("\nLocal Database Status:");
            if ($localUser) {
                $this->info("✅ User exists in local database");
                $this->info("   ID: {$localUser->id}");
                $this->info("   Name: {$localUser->name}");
                $this->info("   Role: {$localUser->role}");
                $this->info("   Status: {$localUser->status}");
            } else {
                $this->error("❌ User does not exist in local database");
            }
            
            // Check Firebase Auth
            try {
                $authUser = $auth->getUserByEmail($email);
                $this->info("\nFirebase Authentication Status:");
                $this->info("✅ User exists in Firebase Auth");
                $this->info("   UID: {$authUser->uid}");
                $this->info("   Email: {$authUser->email}");
                $this->info("   Display Name: {$authUser->displayName}");
                $this->info("   Email Verified: " . ($authUser->emailVerified ? 'Yes' : 'No'));
                $this->info("   Disabled: " . ($authUser->disabled ? 'Yes' : 'No'));
                
                // Get custom claims
                $customClaims = $auth->getUser($authUser->uid)->customClaims;
                if (!empty($customClaims)) {
                    $this->info("   Custom Claims:");
                    foreach ($customClaims as $key => $value) {
                        $this->info("      {$key}: {$value}");
                    }
                } else {
                    $this->warn("   ⚠️ No custom claims found");
                }
                
                // If no role claim, ask to add it
                if (empty($customClaims['role'])) {
                    if ($this->confirm('Would you like to add a principal role claim?')) {
                        $auth->setCustomUserClaims($authUser->uid, ['role' => 'principal']);
                        $this->info("   ✅ Added principal role claim");
                    }
                }
                
            } catch (\Exception $e) {
                $this->error("\nFirebase Authentication Status:");
                $this->error("❌ User does not exist in Firebase Auth: " . $e->getMessage());
                
                if ($this->confirm('Would you like to create this user in Firebase Auth?') && $localUser) {
                    try {
                        $userProperties = [
                            'email' => $email,
                            'displayName' => $localUser->name,
                            'emailVerified' => true,
                            'disabled' => false,
                        ];
                        
                        if ($this->confirm('Set a new password?')) {
                            $password = $this->secret('Enter new password (minimum 6 characters with uppercase, lowercase, and number):');
                            $userProperties['password'] = $password;
                        }
                        
                        $authUser = $auth->createUser($userProperties);
                        $auth->setCustomUserClaims($authUser->uid, ['role' => 'principal']);
                        
                        $this->info("   ✅ Created user in Firebase Auth with UID: {$authUser->uid}");
                    } catch (\Exception $e) {
                        $this->error("   ❌ Failed to create user in Firebase Auth: " . $e->getMessage());
                        return 1;
                    }
                } else {
                    return 1;
                }
            }
            
            // Check Firestore admin_accounts collection
            $this->info("\nFirestore Status:");
            
            $collection = $firestore->collection('admin_accounts');
            $query = $collection->where('email', '=', $email);
            $documents = $query->documents();
            
            $adminExists = false;
            $adminDoc = null;
            
            foreach ($documents as $document) {
                if ($document->exists()) {
                    $adminExists = true;
                    $adminDoc = $document;
                    break;
                }
            }
            
            if ($adminExists) {
                $this->info("✅ User exists in admin_accounts collection");
                $this->info("   Document ID: {$adminDoc->id()}");
                
                $data = $adminDoc->data();
                foreach ($data as $key => $value) {
                    if (is_array($value)) {
                        $this->info("   {$key}: " . json_encode($value));
                    } else {
                        $this->info("   {$key}: {$value}");
                    }
                }
                
                // Check if UID matches Firebase Auth
                if (isset($authUser) && isset($data['uid']) && $data['uid'] !== $authUser->uid) {
                    $this->warn("   ⚠️ UID mismatch - Firestore: {$data['uid']}, Firebase Auth: {$authUser->uid}");
                    
                    if ($this->confirm('Would you like to update the UID in Firestore to match Firebase Auth?')) {
                        $firestore->collection('admin_accounts')->document($adminDoc->id())->update([
                            ['path' => 'uid', 'value' => $authUser->uid]
                        ]);
                        
                        $this->info("   ✅ Updated UID in Firestore");
                    }
                }
            } else {
                $this->error("❌ User does not exist in admin_accounts collection");
                
                if (isset($authUser) && $localUser && $this->confirm('Would you like to create this user in Firestore admin_accounts collection?')) {
                    $adminData = [
                        'id' => $localUser->id,
                        'uid' => $authUser->uid,
                        'name' => $localUser->name,
                        'email' => $email,
                        'role' => 'Principal',
                        'status' => 'Active',
                        'created_at' => now()->toDateTimeString(),
                        'updated_at' => now()->toDateTimeString()
                    ];
                    
                    $firestore->collection('admin_accounts')->document($localUser->id)->set($adminData);
                    
                    $this->info("   ✅ Created user in Firestore admin_accounts collection");
                }
            }
            
            $this->info("\nVerification complete!");
            return 0;
            
        } catch (\Exception $e) {
            $this->error("Error verifying admin account: " . $e->getMessage());
            Log::error("Error in VerifyAdminAccount command: " . $e->getMessage(), ['exception' => $e]);
            return 1;
        }
    }
}
