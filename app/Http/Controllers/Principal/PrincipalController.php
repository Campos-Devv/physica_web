<?php

namespace App\Http\Controllers\Principal;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Services\FirebaseService;
use App\Http\Controllers\Controller;
use Carbon\Carbon;

class PrincipalController extends Controller
{
    protected $firebaseService;
    
    public function __construct(FirebaseService $firebaseService)
    {
        $this->firebaseService = $firebaseService;
    }

    /**
     * Show the principal dashboard.
     *
     * @return \Illuminate\View\View
     */
    public function dashboard()
    {
        try {
            // Add methods to FirebaseService to handle these queries
        $headTeacherCount = $this->firebaseService->countDocumentsInCollection(
                'admin_accounts', 
                [
            ['field' => 'role', 'operator' => '=', 'value' => 'Head Teacher'],
            ['field' => 'status', 'operator' => '=', 'value' => 'Active']
                ]
            );
            
            $scienceTeacherCount = $this->firebaseService->countDocumentsInCollection(
                'admin_accounts', 
                [
            ['field' => 'role', 'operator' => '=', 'value' => 'Science Teacher'],
            ['field' => 'status', 'operator' => '=', 'value' => 'Active']
                ]
            );
            
            $studentCount = $this->firebaseService->countDocumentsInCollection('student_accounts');
            
            // Get chart data from FirebaseService using the already injected instance
            $chartData = $this->firebaseService->getStudentRegistrationStats();
            
        } catch (\Exception $e) {
            Log::error('Error fetching dashboard stats: ' . $e->getMessage());
            
            // Default values if query fails
            $headTeacherCount = 0;
            $scienceTeacherCount = 0;
            $studentCount = 0;
            $chartData = $this->firebaseService->getEmptyChartData();
        }
        
        $data = [
            'headTeacherCount' => $headTeacherCount,
            'studentCount' => $studentCount,
            'scienceTeacherCount' => $scienceTeacherCount,
            'chartData' => $chartData // Pass chart data directly
        ];
        
        return view('principal.dashboard', $data);
    }

    public function assignTeachers()
    {
        $headTeachers = [];
        $scienceTeachers = [];
        
        try {
            // Use the FirebaseService to get teachers
            $teachers = $this->firebaseService->getDocumentsFromCollection(
                'admin_accounts', 
                [['field' => 'status', 'operator' => '!=', 'value' => 'deleted']]
            );
            
            foreach ($teachers as $teacher) {
                $data = $teacher->data();
                
                // Ensure we have the minimum required fields
                if (isset($data['name']) && isset($data['email'])) {
                    $teacherData = [
                        'id' => $teacher->id(),
                        'name' => $data['name'],
                        'email' => $data['email'],
                        'strand' => $data['strand'] ?? 'N/A',
                        'status' => $data['status'] ?? 'Inactive',
                        'role' => $data['role'] ?? 'unknown'
                    ];
                    
                    // Separate teachers by role
                    if (isset($data['role']) && $data['role'] === 'Head Teacher') {
                        $headTeachers[] = $teacherData;
                    } elseif (isset($data['role']) && $data['role'] === 'Science Teacher') {
                        $scienceTeachers[] = $teacherData;
                    }
                }
            }
        } catch (\Exception $e) {
            // Log the error
            Log::error('Error fetching teachers from Firestore: ' . $e->getMessage());
        }
        
        return view('principal.assign_teachers', [
            'headTeachers' => $headTeachers,
            'scienceTeachers' => $scienceTeachers
        ]);
    }

    public function storeTeacher(Request $request)
    {
        try {
            // Validate the input
            $validatedData = $request->validate([
                'first_name' => 'required|string|min:2|max:50',
                'last_name' => 'required|string|min:2|max:50',
                'email' => 'required|email|max:255',
                'teacher_role' => 'required|in:Head Teacher,Science Teacher',
                'strand' => 'required|string|in:STEM,HUMSS,ABM,TVL',
                'status' => 'required|in:Active,Inactive',
                'password' => 'required|min:6|confirmed'
            ]);
            
            // Create a createTeacher method in FirebaseService
            $result = $this->firebaseService->createTeacher($validatedData);
            
            return response()->json($result);
            
        } catch (\Exception $e) {
            Log::error('Error creating teacher: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create teacher: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get teacher details for editing.
     *
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function getTeacher($id)
    {
        try {
            // Get teacher document using FirebaseService
            $teacherDoc = $this->firebaseService->getDocumentFromCollection('admin_accounts', $id);
            
            if (!$teacherDoc->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Teacher not found'
                ], 404);
            }
            
            $data = $teacherDoc->data();
            
            // Extract first and last name from full name
            $nameParts = explode(' ', $data['name']);
            $firstName = $nameParts[0];
            $lastName = count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : '';
            
            // Return teacher data in expected format
            return response()->json([
                'id' => $teacherDoc->id(),
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $data['email'] ?? '',
                'teacher_role' => $data['role'] ?? '',
                'strand' => $data['strand'] ?? '',
                'status' => $data['status'] ?? 'Inactive'
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching teacher: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch teacher: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified teacher.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  string  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateTeacher(Request $request, $id)
    {
        try {
            // Validate the input
            $validatedData = $request->validate([
                'first_name' => 'required|string|min:2|max:50',
                'last_name' => 'required|string|min:2|max:50',
                'teacher_role' => 'required|in:Head Teacher,Science Teacher',
                'strand' => 'required|string|in:STEM,HUMSS,ABM,TVL',
                'status' => 'required|in:Active,Inactive',
                'password' => 'nullable|min:6|confirmed' // Optional for updates
            ]);
            
            // Use FirebaseService to update the teacher
            $result = $this->firebaseService->updateTeacher($id, $validatedData);
            
            return response()->json($result);
            
        } catch (\Exception $e) {
            Log::error('Error updating teacher: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update teacher: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update only the teacher's status.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  string  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateTeacherStatus(Request $request, $id)
    {
        try {
            // Log the request for debugging
            Log::info('Status update request', [
                'teacher_id' => $id,
                'status' => $request->input('status'),
                'method' => $request->method()
            ]);
            
            // Validate the input - only status field is allowed
            $validatedData = $request->validate([
                'status' => 'required|in:Active,Inactive',
            ]);
            
            // Use FirebaseService to update status
            $result = $this->firebaseService->updateTeacherStatus($id, $validatedData['status']);
            
            return response()->json([
                'success' => true,
                'message' => 'Teacher status updated successfully',
                'status' => $validatedData['status']
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error updating teacher status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update teacher status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified teacher.
     *
     * @param  string  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteTeacher($id)
    {
        try {
            // Log the request for debugging
            Log::info('Delete teacher request', [
                'teacher_id' => $id
            ]);
            
            // Use FirebaseService to delete the teacher
            $result = $this->firebaseService->deleteTeacher($id);
            
            return response()->json([
                'success' => true,
                'message' => 'Teacher removed successfully'
            ]);
            
        } catch (\Exception $e) {
            Log::error("Error in deleteTeacher method: {$e->getMessage()}");
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete teacher: ' . $e->getMessage()
            ], 500);
        }
    }
}