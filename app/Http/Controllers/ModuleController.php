<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class ModuleController extends Controller
{
    protected $firestore;

    /**
     * Constructor to initialize Firestore
     */
    public function __construct()
    {
        try {
            // Get Firestore instance directly with correct path to credentials
            $factory = (new \Kreait\Firebase\Factory)
                ->withServiceAccount(storage_path('app/firebase/firebase_credentials.json'));
            $this->firestore = $factory->createFirestore()->database();
        } catch (\Exception $e) {
            Log::error('Firestore initialization error: ' . $e->getMessage());
        }
    }
    
    /**
     * Format Carbon date for API responses
     * 
     * @param Carbon $carbon
     * @return string
     */
    protected function formatDate(Carbon $carbon)
    {
        return $carbon->format('Y-m-d H:i:s');
    }

    /**
     * Display a listing of modules in the main collection
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function index()
    {
        try {
            $modulesCollection = $this->firestore->collection('modules');
            $modulesSnapshot = $modulesCollection->documents();
            
            $modules = [];
            foreach ($modulesSnapshot as $module) {
                $modules[] = $this->docToArray($module);
            }
            
            return response()->json($modules);
        } catch (\Exception $e) {
            Log::error('Error fetching modules: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch modules',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get modules belonging to a specific quarter
     *
     * @param string $quarterId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getByQuarter($quarterId)
    {
        try {
            $quarterRef = $this->firestore->collection('quarters')->document($quarterId);
            $quarter = $quarterRef->snapshot();
            if (!$quarter->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Quarter not found'
                ], 404);
            }
            
            $modulesRef = $this->firestore->collection('modules')
                ->where('quarter_id', '=', $quarterId);
            $modulesSnapshot = $modulesRef->documents();
            
            $modules = [];
            foreach ($modulesSnapshot as $module) {
                $modules[] = $this->docToArray($module);
            }
            
            return response()->json([
                'success' => true,
                'data' => $modules
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching modules by quarter: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch modules by quarter',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created module in the main collection
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'quarterId' => 'required|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // First check if quarter exists
            $quarterId = $request->input('quarterId');
            $quarterRef = $this->firestore->collection('quarters')->document($quarterId);
            $quarter = $quarterRef->snapshot();
            
            if (!$quarter->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Quarter not found'
                ], 404);
            }
            
            $userId = $this->currentUserId();

            // Use a simpler approach to get the highest module number
            $nextModuleNumber = 1; // Default to 1 if no modules exist
            
            try {
                // Get all modules for this quarter
                $modulesRef = $this->firestore->collection('modules')
                    ->where('quarter_id', '=', $quarterId);
                $modulesSnapshot = $modulesRef->documents();
                
                // Find the highest number manually
                foreach ($modulesSnapshot as $document) {
                    $moduleData = $document->data();
                    if (isset($moduleData['number']) && $moduleData['number'] >= $nextModuleNumber) {
                        $nextModuleNumber = $moduleData['number'] + 1;
                    }
                }
            } catch (\Exception $e) {
                Log::warning('Error finding highest module number: ' . $e->getMessage());
                // Just continue with default number 1 if we can't find existing modules
            }
            
            // Format the module number with leading zero if needed
            $formattedNumber = str_pad($nextModuleNumber, 2, '0', STR_PAD_LEFT);
            
            // Extract quarter number from quarterId (e.g., "quarter_01" -> "1")
            $quarterNumber = "1"; // Default to 1 if we can't extract
            if (preg_match('/quarter_(\d+)/', $quarterId, $matches)) {
                // Convert "01" to "1", "02" to "2", etc.
                $quarterNumber = ltrim($matches[1], '0');
            }
            
            // Create module ID with quarter identifier: module_q{quarterNumber}_{moduleNumber}
            $moduleId = 'module_q' . $quarterNumber . '_' . $formattedNumber;
            
            // Use Philippine timezone (Asia/Manila)
            $now = Carbon::now('Asia/Manila');

            // Resolve strand same as QuarterController::store
            $userStrand = $request->input('strand');
            if (!$userStrand) {
                $userStrand = session('user.strand');
            }
            if ((!$userStrand || $userStrand === 'unknown_strand') && $userId !== 'unknown_user') {
                try {
                    $snap = $this->firestore->collection('admin_accounts')->document($userId)->snapshot();
                    if ($snap->exists()) {
                        $acc = $snap->data();
                        if (!empty($acc['strand'])) {
                            $userStrand = $acc['strand'];
                        }
                    }
                } catch (\Exception $e) {
                    Log::warning('Unable to fetch user strand:', ['error' => $e->getMessage()]);
                }
            }

            $moduleData = [
                'title'          => $request->input('title'),
                'number'         => $nextModuleNumber,
                'quarter_number' => intval($quarterNumber),

                // creator info
                'created_by'        => $userId,
                'created_by_name'   => session('user.name'),
                'created_by_role'   => session('user.role'),
                'created_by_strand' => $userStrand, // aligned with QuarterController

                'created_at'     => $this->formatDate($now),
                'updated_at'     => $this->formatDate($now),
                // Direct workflow: modules are immediately approved
                'status'         => 'approved',
                'quarter_id'     => $quarterId
            ];

            if ($request->has('topic')) {
                $moduleData['topic'] = $request->input('topic');
            }

            // Save to Firestore
            $this->firestore->collection('modules')->document($moduleId)->set($moduleData);

            return response()->json([
                'success' => true,
                'message' => 'Module created successfully',
                'id' => $moduleId,
                'created_at' => $moduleData['created_at'],
                'title' => $moduleData['title'],
                'topic' => $moduleData['topic'] ?? '',
                'number' => $moduleData['number'],
                'status' => $moduleData['status'], // always 'approved'
                'created_by_name' => $moduleData['created_by_name'],
                'role' => $moduleData['created_by_role'],
                'strand' => $moduleData['created_by_strand'],
            ], 201);

        } catch (\Exception $e) {
            $errorMessage = $e->getMessage();
            Log::error('Error creating module: ' . $errorMessage);
            
            // Check for common Firestore errors
            if (strpos($errorMessage, 'requires an index') !== false) {
                // Extract the index creation URL if available
                $indexUrl = null;
                if (preg_match('/https:\\/\\/console\\.firebase\\.google\\.com\\/[^\\s"\']+/', $errorMessage, $matches)) {
                    $indexUrl = $matches[0];
                }
                
                return response()->json([
                    'success' => false,
                    'message' => 'A database index needs to be created before this operation can complete.',
                    'error' => $errorMessage,
                    'indexUrl' => $indexUrl,
                    'needsIndex' => true
                ], 500);
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create module',
                'error' => $errorMessage
            ], 500);
        }
    }

    /**
     * Display the specified module
     *
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        try {
            $module = $this->firestore->collection('modules')->document($id)->snapshot();
            if (!$module->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Module not found'
                ], 404);
            }
            
            $moduleData = $this->docToArray($module);
            return response()->json([
                'success' => true,
                'data' => $moduleData
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching module: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch module',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified module
     *
     * @param \Illuminate\Http\Request $request
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'topic' => 'sometimes|string|nullable',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $moduleRef = $this->firestore->collection('modules')->document($id);
            $module = $moduleRef->snapshot();
            if (!$module->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Module not found'
                ], 404);
            }
            
            // Use Philippine timezone (Asia/Manila)
            $now = Carbon::now('Asia/Manila');
            
            $moduleData = [];
            
            if ($request->has('title')) {
                $moduleData['title'] = $request->input('title');
            }
            
            if ($request->has('topic')) {
                $moduleData['topic'] = $request->input('topic');
            }
            
            $moduleData['updated_at'] = $this->formatDate($now);
            
            // Update in Firestore
            // $moduleRef->update($moduleData); // WRONG for Firestore PHP client

            $moduleRef->update($this->toUpdateOps($moduleData));
            
            return response()->json([
                'success' => true,
                'message' => 'Module updated successfully',
                'updated_at' => $moduleData['updated_at']
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error updating module: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update module',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the module status
     *
     * @param \Illuminate\Http\Request $request
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateStatus(Request $request, $id)
    {
        // Simplified: always set to approved; legacy calls still succeed
        try {
            $moduleRef = $this->firestore->collection('modules')->document($id);
            $module = $moduleRef->snapshot();
            if (!$module->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Module not found'
                ], 404);
            }
            $now = Carbon::now('Asia/Manila');
            $moduleRef->update($this->toUpdateOps([
                'status' => 'approved',
                'updated_at' => $this->formatDate($now)
            ]));
            return response()->json([
                'success' => true,
                'message' => 'Module status set to approved',
                'status' => 'approved'
            ]);
        } catch (\Exception $e) {
            Log::error('Error forcing module approved: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update module status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified module
     *
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        try {
            // Get the module reference
            $moduleRef = $this->firestore->collection('modules')->document($id);
            $module = $moduleRef->snapshot();
            
            if (!$module->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Module not found'
                ], 404);
            }
            
            // Cascade delete lessons belonging to this module
            try {
                $lessonsRef = $this->firestore->collection('lessons')->where('module_id', '=', $id);
                $lessonsSnap = $lessonsRef->documents();
                foreach ($lessonsSnap as $lesson) {
                    try {
                        $this->firestore->collection('lessons')->document($lesson->id())->delete();
                    } catch (\Throwable $cascadeErr) {
                        Log::warning('Failed deleting lesson during module cascade', [
                            'module_id' => $id,
                            'lesson_id' => $lesson->id(),
                            'error' => $cascadeErr->getMessage()
                        ]);
                    }
                }
            } catch (\Throwable $cascadeOuter) {
                Log::warning('Cascade lesson deletion query failed', [
                    'module_id' => $id,
                    'error' => $cascadeOuter->getMessage()
                ]);
            }

            // Delete module after cascading
            $moduleRef->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Module deleted successfully'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error deleting module: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete module',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get lessons count for a module
     * 
     * @param string $moduleId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getLessonsCount($moduleId)
    {
        try {
            // Check if module exists
            $moduleRef = $this->firestore->collection('modules')->document($moduleId);
            $module = $moduleRef->snapshot();
            
            if (!$module->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Module not found'
                ], 404);
            }
            
            // Count lessons in the module
            $lessonsRef = $this->firestore->collection('lessons')
                ->where('module_id', '=', $moduleId);
            $lessonsSnapshot = $lessonsRef->documents();
            
            $count = 0;
            foreach ($lessonsSnapshot as $lesson) {
                $count++;
            }
            
            return response()->json([
                'success' => true,
                'count' => $count
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error counting lessons: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to count lessons',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helpers to reduce duplication
     */
    private function docToArray($doc): array
    {
        return array_merge(['id' => $doc->id()], $doc->data());
    }

    private function toUpdateOps(array $data): array
    {
        $ops = [];
        foreach ($data as $field => $value) {
            $ops[] = ['path' => $field, 'value' => $value];
        }
        return $ops;
    }

    private function currentUserId(): string
    {
        $uid = session('user.uid');
        if (!$uid) {
            Log::warning('User ID not found in session.');
            return 'unknown_user';
        }
        return $uid;
    }
}
