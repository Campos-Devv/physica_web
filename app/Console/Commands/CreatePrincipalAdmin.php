<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Kreait\Firebase\Factory;
use Google\Cloud\Firestore\FirestoreClient;
// Removed unused imports (Str, UserRecord)
use Kreait\Firebase\Exception\Auth\EmailExists;

class CreatePrincipalAdmin extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'admin:create-principal-account 
        {--email= : The email of the admin (must be a gmail.com address)} 
        {--password= : The password for the admin} 
        {--firstName= : The first name of the admin} 
        {--lastName= : The last name of the admin} 
        {--local : Also create/sync a local users table record (optional)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a principal admin account';

    /**
     * Execute the console command.
     */
    public function handle()
    {
    $email = $this->option('email');
    $password = $this->option('password');
    $firstName = $this->option('firstName');
    $lastName = $this->option('lastName');
    $createLocal = (bool)$this->option('local');

    $this->info('Mode: ' . ($createLocal ? 'Firebase (Auth + Firestore) + Local DB' : 'Firebase Only (Auth + Firestore, no local user)'));

        // If options are not provided, ask for them interactively
        if (!$email) {
            $email = $this->ask('What is the admin email? (must be a gmail.com address)');
        }

        if (!$firstName) {
            $firstName = $this->ask('What is the admin\'s first name?');
        }

        if (!$lastName) {
            $lastName = $this->ask('What is the admin\'s last name?');
        }

        // Combine first and last name
        $name = trim($firstName . ' ' . $lastName);

        if (!$password) {
            $this->info('Password must have at least 6 characters, including one uppercase letter, one lowercase letter, and one number');
            $password = $this->secret('What is the admin password?');
            $passwordConfirmation = $this->secret('Confirm the admin password:');
            
            if ($password !== $passwordConfirmation) {
                $this->error('Passwords do not match!');
                return 1;
            }
        }

        // Build validation rules (local unique constraint only when opting into local creation)
        $emailRules = [
            'required', 'string', 'email', 'max:255', 'regex:/^[a-zA-Z0-9._%+-]+@gmail\.com$/i'
        ];
        if ($createLocal) {
            $emailRules[] = 'unique:users';
        }

        $validator = Validator::make(
            [
                'firstName' => $firstName,
                'lastName' => $lastName,
                'name' => $name,
                'email' => $email,
                'password' => $password,
            ],
            [
                'firstName' => ['required', 'string', 'max:50'],
                'lastName' => ['required', 'string', 'max:50'],
                'name' => ['required', 'string', 'max:255'],
                'email' => $emailRules,
                'password' => [
                    'required', 'string', 'min:6',
                    'regex:/[A-Z]/', // Must contain at least one uppercase letter
                    'regex:/[a-z]/', // Must contain at least one lowercase letter
                    'regex:/[0-9]/', // Must contain at least one number
                ],
            ],
            [
                'firstName.required' => 'The first name is required.',
                'lastName.required' => 'The last name is required.',
                'email.regex' => 'The email must be a gmail.com address.',
                'password.regex' => 'The password must contain at least one uppercase letter, one lowercase letter, and one number.',
                'password.min' => 'The password must be at least 6 characters.',
            ]
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }
            return 1;
        }

        try {
            // Check credentials file path
            $credentialsPath = storage_path('app/firebase/firebase_credentials.json');
            
            if (!file_exists($credentialsPath)) {
                $this->error("Firebase credentials file not found at: $credentialsPath");
                $this->info("Please make sure the credentials file exists at the specified path.");
                $this->info("You can create the credentials file with the following command:");
                $this->info("copy your-firebase-credentials.json " . $credentialsPath);
                return 1;
            }
            
            if (!is_readable($credentialsPath)) {
                $this->error("Firebase credentials file exists but is not readable: $credentialsPath");
                $this->info("Please check file permissions.");
                return 1;
            }
            
            // Connect to Firebase using the proper method for the Google Cloud Firestore client
            $firebase = new FirestoreClient([
                'keyFilePath' => $credentialsPath,
            ]);

            // Connect to Firebase Authentication
            $factory = (new Factory)->withServiceAccount($credentialsPath);
            $auth = $factory->createAuth();

            // Optional: only check local DB duplicate when user wants local creation
            if ($createLocal) {
                $existingUser = User::where('email', $email)->first();
                if ($existingUser) {
                    $this->error("Admin with email {$email} already exists in local database!");
                    return 1;
                }
            }
            
            // Check if admin exists in Firestore
            try {
                $collection = $firebase->collection('admin_accounts');
                $query = $collection->where('email', '=', $email);
                $documents = $query->documents();
                
                $adminExists = false;
                foreach ($documents as $document) {
                    if ($document->exists()) {
                        $adminExists = true;
                        break;
                    }
                }
                
                if ($adminExists) {
                    $this->error("Admin with email {$email} already exists in Firestore!");
                    return 1;
                }
            } catch (\Exception $e) {
                $this->error("Error checking Firestore: " . $e->getMessage());
                return 1;
            }
            
            // Current timestamp for created_at and updated_at
            $now = now()->toDateTimeString();
            
            // Create user in Firebase Authentication
            try {
                // Check if user already exists in Firebase Auth
                try {
                    $authUser = $auth->getUserByEmail($email);
                    $this->error("User with email {$email} already exists in Firebase Authentication!");
                    return 1;
                } catch (\Exception $e) {
                    // User not found, continue with creation
                }
                
                // Create Firebase Auth user
                $userProperties = [
                    'email' => $email,
                    'password' => $password,
                    'displayName' => $name,
                    'emailVerified' => true,
                    'disabled' => false,
                ];
                
                $authUser = $auth->createUser($userProperties);
                $this->info("User created in Firebase Authentication (UID: {$authUser->uid})");
                
                // Set custom claims for role
                $auth->setCustomUserClaims($authUser->uid, ['role' => 'principal']);
                
            } catch (EmailExists $e) {
                $this->error("User with email {$email} already exists in Firebase Authentication!");
                return 1;
            } catch (\Exception $e) {
                $this->error("Error creating Firebase Authentication user: " . $e->getMessage());
                return 1;
            }
            
            // Use Firebase Auth UID as document ID for consistency
            $adminDocId = $authUser->uid;

            // Prepare Firestore data
            $adminData = [
                'id' => $adminDocId, // Document ID same as UID
                'uid' => $authUser->uid,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'name' => $name,
                'email' => $email,
                'role' => 'Principal',
                'status' => 'Active',
                'created_at' => $now,
                'updated_at' => $now
            ];

            // Add to Firestore with rollback on failure
            try {
                $firebase->collection('admin_accounts')->document($adminDocId)->set($adminData);
                $this->info('Firestore document created (Collection: admin_accounts, ID: ' . $adminDocId . ')');
            } catch (\Exception $firestoreException) {
                $this->error('Failed to create Firestore document: ' . $firestoreException->getMessage());
                $this->warn('Rolling back Firebase Auth user...');
                try {
                    $auth->deleteUser($authUser->uid);
                    $this->info('Rollback successful: Firebase Auth user deleted.');
                } catch (\Exception $rollbackEx) {
                    $this->error('Rollback failed: could not delete Firebase Auth user: ' . $rollbackEx->getMessage());
                }
                return 1;
            }

            // Optionally create local database user
            if ($createLocal) {
                try {
                    $localUser = User::create([
                        'id' => $adminDocId,
                        'name' => $name,
                        'email' => $email,
                        'password' => Hash::make($password),
                        'first_name' => $firstName,
                        'last_name' => $lastName,
                        'role' => 'Principal',
                        'status' => 'Active',
                        'email_verified_at' => now(),
                    ]);
                    $this->info('Local DB user created (users.id = UID).');
                } catch (\Exception $localEx) {
                    $this->error('Failed to create local user: ' . $localEx->getMessage());
                    $this->warn('Remote records remain (Auth + Firestore). You can retry local creation manually.');
                }
            } else {
                $this->info('Skipped local DB user creation (use --local to enable).');
            }

            $this->info('---------------------------------------------');
            $this->info('Principal admin created successfully');
            $this->info('Email: ' . $email);
            $this->info('Name: ' . $firstName . ' ' . $lastName);
            $this->info('Firebase Auth UID: ' . $authUser->uid);
            $this->info('Stored In: Firebase Auth ✅  Firestore ✅  Local ' . ($createLocal ? '✅' : '❌ (skipped)'));
            $this->info('Role: Principal');
            $this->info('Status: Active');
            $this->info('---------------------------------------------');
            $this->info('Tip: To also store locally next time, add --local');
            
            return 0;
        } catch (\Exception $e) {
            $this->error("Error creating principal admin: " . $e->getMessage());
            $this->info("\nHere are some troubleshooting steps:");
            $this->info("1. Make sure the firebase_credentials.json file exists in the correct location");
            $this->info("2. Check that the path in config/firebase.php is correct");
            $this->info("3. Ensure the credentials file has the correct permissions");
            $this->info("4. Verify that the service account has Firestore access");
            return 1;
        }
    }
}