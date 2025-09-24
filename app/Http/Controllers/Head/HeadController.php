<?php

namespace App\Http\Controllers\Head;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Exception;

class HeadController extends Controller
{
    protected $firestore;

    /**
     * Constructor to initialize Firestore
     */
    public function __construct()
    {
        try {
            // Get Firestore instance directly
            $factory = (new \Kreait\Firebase\Factory)
                ->withServiceAccount(config('firebase.projects.app.credentials'));
            $this->firestore = $factory->createFirestore()->database();
        } catch (Exception $e) {
            Log::error('Firestore initialization error: ' . $e->getMessage());
        }
    }

    /**
     * Display the dashboard for head teachers
     *
     * @return \Illuminate\View\View
     */
    public function dashboard()
    {
        try {
            // Get total students count (similar to principal dashboard)
            $studentsCollection = $this->firestore->collection('students');
            $studentsSnapshot = $studentsCollection->documents();
            $totalStudents = iterator_count($studentsSnapshot);

            // Get recent students
            $recentStudents = [];
            $recentStudentsQuery = $studentsCollection->orderBy('created_at', 'DESC')->limit(5);
            $recentStudentsSnapshot = $recentStudentsQuery->documents();
            
            foreach ($recentStudentsSnapshot as $student) {
                $data = $student->data();
                $recentStudents[] = [
                    'id' => $student->id(),
                    'name' => $data['name'] ?? 'Unknown',
                    'email' => $data['email'] ?? 'No email'
                ];
            }

            return view('head.dashboard', [
                'totalStudents' => $totalStudents,
                'recentStudents' => $recentStudents
            ]);
        } catch (Exception $e) {
            Log::error('Head dashboard error: ' . $e->getMessage());
            return view('head.dashboard', [
                'error' => 'Error loading dashboard data',
                'totalStudents' => 0,
                'recentStudents' => []
            ]);
        }
    }

    /**
     * Display pending approvals for head teachers
     *
     * @return \Illuminate\View\View
     */
    // pendingApprovals removed (workflow deprecated)

    /**
     * Process approval for a quarter
     *
     * @param  string  $id
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function processApproval(Request $request, $id)
    {
        try {
            $action = $request->input('action');
            
            if (!in_array($action, ['approve', 'reject'])) {
                return redirect()->back()->with('error', 'Invalid action specified');
            }
            
            $quarterRef = $this->firestore->collection('quarters')->document($id);
            $quarter = $quarterRef->snapshot();
            
            if (!$quarter->exists()) {
                return redirect()->back()->with('error', 'Quarter not found');
            }
            
            // Update the quarter status
            $status = $action === 'approve' ? 'approved' : 'rejected';
            $quarterRef->update([
                ['path' => 'status', 'value' => $status],
                ['path' => 'updated_at', 'value' => time()]
            ]);
            
            $message = $action === 'approve' ? 'Quarter approved successfully' : 'Quarter rejected successfully';
            return redirect()->route('head.pending')->with('success', $message);
        } catch (Exception $e) {
            Log::error('Process approval error: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Error processing approval: ' . $e->getMessage());
        }
    }

    /**
     * Display lessons for review by head teachers
     *
     * @return \Illuminate\View\View
     */
    public function viewLessons()
    {
        try {
            // Get approved quarters only
            $quartersCollection = $this->firestore->collection('quarters');
            $approvedQuartersQuery = $quartersCollection->where('status', '=', 'approved');
            $quartersSnapshot = $approvedQuartersQuery->documents();
            
            $quarters = [];
            foreach ($quartersSnapshot as $quarter) {
                $data = $quarter->data();
                
                // Get creator information if available
                if (isset($data['created_by'])) {
                    try {
                        $creatorDoc = $this->firestore->collection('admin_accounts')->document($data['created_by'])->snapshot();
                        if ($creatorDoc->exists()) {
                            $data['creatorInfo'] = $creatorDoc->data();
                        }
                    } catch (Exception $ex) {
                        Log::warning('Failed to fetch creator info: ' . $ex->getMessage());
                    }
                }
                
                $quarters[] = array_merge(
                    ['id' => $quarter->id()],
                    $data
                );
            }

            return view('head.view_lesson', [
                'quarters' => $quarters
            ]);
        } catch (Exception $e) {
            Log::error('Head view lessons error: ' . $e->getMessage());
            return view('head.view_lesson', [
                'error' => 'Error loading lesson data',
                'quarters' => []
            ]);
        }
    }

    /**
     * Get modules for a specific quarter via AJAX
     *
     * @param  string  $quarterId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getModules($quarterId)
    {
        try {
            $modules = [];
            
            // First, get modules from the quarter's subcollection
            $modulesCollection = $this->firestore->collection('quarters')->document($quarterId)
                ->collection('modules');
            $modulesSnapshot = $modulesCollection->documents();
            
            foreach ($modulesSnapshot as $module) {
                $moduleData = $module->data();
                $moduleData['id'] = $module->id();
                $moduleData['source'] = 'quarters_subcollection';
                
                // Get creator information if available
                if (isset($moduleData['created_by'])) {
                    try {
                        $creatorDoc = $this->firestore->collection('admin_accounts')->document($moduleData['created_by'])->snapshot();
                        if ($creatorDoc->exists()) {
                            $creatorData = $creatorDoc->data();
                            if (!empty($creatorData['name'])) {
                                $moduleData['created_by_name'] = $creatorData['name'];
                            } elseif (!empty($creatorData['firstName']) || !empty($creatorData['lastName'])) {
                                $moduleData['created_by_name'] = trim(($creatorData['firstName'] ?? '') . ' ' . ($creatorData['lastName'] ?? ''));
                            } elseif (!empty($creatorData['email'])) {
                                $moduleData['created_by_name'] = $creatorData['email'];
                            }
                        }
                    } catch (Exception $ex) {
                        Log::warning('Failed to fetch creator info for module: ' . $ex->getMessage());
                    }
                }
                
                $modules[$module->id()] = $moduleData;
            }
            
            // Then, get modules from the main collection that belong to this quarter
            try {
                $mainModulesCollection = $this->firestore->collection('modules')
                    ->where('quarter_id', '=', $quarterId)
                    ->where('status', '=', 'approved');
                $mainModulesSnapshot = $mainModulesCollection->documents();
                
                foreach ($mainModulesSnapshot as $module) {
                    $moduleId = $module->id();
                    $moduleData = $module->data();
                    $moduleData['id'] = $moduleId;
                    $moduleData['source'] = 'main_collection';
                    
                    // Get creator information if available
                    if (isset($moduleData['created_by'])) {
                        try {
                            $creatorDoc = $this->firestore->collection('admin_accounts')->document($moduleData['created_by'])->snapshot();
                            if ($creatorDoc->exists()) {
                                $creatorData = $creatorDoc->data();
                                if (!empty($creatorData['name'])) {
                                    $moduleData['created_by_name'] = $creatorData['name'];
                                } elseif (!empty($creatorData['firstName']) || !empty($creatorData['lastName'])) {
                                    $moduleData['created_by_name'] = trim(($creatorData['firstName'] ?? '') . ' ' . ($creatorData['lastName'] ?? ''));
                                } elseif (!empty($creatorData['email'])) {
                                    $moduleData['created_by_name'] = $creatorData['email'];
                                }
                            }
                        } catch (Exception $ex) {
                            Log::warning('Failed to fetch creator info for main module: ' . $ex->getMessage());
                        }
                    }
                    
                    // If module already exists from subcollection, merge data with main collection
                    if (isset($modules[$moduleId])) {
                        $modules[$moduleId] = array_merge($modules[$moduleId], $moduleData);
                    } else {
                        $modules[$moduleId] = $moduleData;
                    }
                }
            } catch (Exception $ex) {
                Log::warning('Failed to fetch modules from main collection: ' . $ex->getMessage());
            }
            
            // Convert associative array to indexed array
            $modulesList = array_values($modules);
            
            return response()->json([
                'success' => true,
                'modules' => $modulesList
            ]);
        } catch (Exception $e) {
            Log::error('Get modules error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching modules',
                'modules' => []
            ]);
        }
    }

    /**
     * Get lessons for a specific module via AJAX
     *
     * @param  string  $moduleId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getLessons($moduleId)
    {
        try {
            // We need quarter ID and module ID to access the correct path
            // For simplicity, we'll search across all quarters
            $quartersCollection = $this->firestore->collection('quarters');
            $quartersSnapshot = $quartersCollection->documents();
            
            $lessons = [];
            $moduleFound = false;
            
            foreach ($quartersSnapshot as $quarter) {
                $moduleRef = $quarter->reference()->collection('modules')->document($moduleId);
                $module = $moduleRef->snapshot();
                
                if ($module->exists()) {
                    $moduleFound = true;
                    $lessonsCollection = $moduleRef->collection('lessons');
                    $lessonsSnapshot = $lessonsCollection->documents();
                    
                    foreach ($lessonsSnapshot as $lesson) {
                        $data = $lesson->data();
                        $lessons[] = array_merge(
                            ['id' => $lesson->id()],
                            $data
                        );
                    }
                    break; // Found the module, no need to continue searching
                }
            }
            
            if (!$moduleFound) {
                return response()->json([
                    'success' => false,
                    'message' => 'Module not found',
                    'lessons' => []
                ]);
            }
            
            return response()->json([
                'success' => true,
                'lessons' => $lessons
            ]);
        } catch (Exception $e) {
            Log::error('Get lessons error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching lessons',
                'lessons' => []
            ]);
        }
    }

    /**
     * Approve a module
     * 
     * @param  string  $moduleId
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    // approveModule removed (status workflow deprecated)
    
    /**
     * Reject a module
     * 
     * @param  string  $moduleId
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    // rejectModule removed (status workflow deprecated)
    
    /**
     * Get all pending modules across all quarters
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    // getPendingModules removed (pending workflow deprecated)
    
    /**
     * Get details for a specific lesson via AJAX
     *
     * @param  string  $lessonId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getLessonDetails($lessonId)
    {
        try {
            // Similar to getLessons, we need to search across quarters and modules
            $quartersCollection = $this->firestore->collection('quarters');
            $quartersSnapshot = $quartersCollection->documents();
            
            $lessonDetails = null;
            $lessonFound = false;
            
            foreach ($quartersSnapshot as $quarter) {
                $modulesCollection = $quarter->reference()->collection('modules');
                $modulesSnapshot = $modulesCollection->documents();
                
                foreach ($modulesSnapshot as $module) {
                    $lessonRef = $module->reference()->collection('lessons')->document($lessonId);
                    $lesson = $lessonRef->snapshot();
                    
                    if ($lesson->exists()) {
                        $lessonFound = true;
                        $lessonDetails = array_merge(
                            ['id' => $lesson->id()],
                            $lesson->data()
                        );
                        break 2; // Found the lesson, exit both loops
                    }
                }
            }
            
            if (!$lessonFound) {
                return response()->json([
                    'success' => false,
                    'message' => 'Lesson not found'
                ]);
            }
            
            return response()->json([
                'success' => true,
                'lesson' => $lessonDetails
            ]);
        } catch (Exception $e) {
            Log::error('Get lesson details error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching lesson details'
            ]);
        }
    }
}
