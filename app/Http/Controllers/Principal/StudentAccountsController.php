<?php

namespace App\Http\Controllers\Principal;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Contract\Firestore;

class StudentAccountsController extends Controller
{
    protected $firestore;
    
    public function __construct(Firestore $firestore)
    {
        $this->firestore = $firestore;
    }
    
    /**
     * Display the student accounts list.
     */
    public function index()
    {
        try {
            // Get student accounts from Firestore
            $studentsSnapshot = $this->firestore->database()->collection('student_accounts')->documents();
            
            // Check if we have any documents and log the count
            $hasDocuments = !$studentsSnapshot->isEmpty();
            Log::debug('Student records found: ' . ($hasDocuments ? 'Yes' : 'No'));
            
            $students = [];
            foreach ($studentsSnapshot as $document) {
                $data = $document->data();
                
                // Debug info - print out the data structure to Laravel log
                Log::debug('Student data structure: ' . json_encode($data));
                
                // Check for different possible name field formats
                $fullName = '';
                
                // Check for first_name and last_name fields (most likely)
                if (isset($data['first_name']) || isset($data['last_name'])) {
                    $firstName = $data['first_name'] ?? '';
                    $lastName = $data['last_name'] ?? '';
                    $fullName = trim("$firstName $lastName");
                } 
                // Check for firstName and lastName fields (camelCase)
                else if (isset($data['firstName']) || isset($data['lastName'])) {
                    $firstName = $data['firstName'] ?? '';
                    $lastName = $data['lastName'] ?? '';
                    $fullName = trim("$firstName $lastName");
                }
                // Check for displayName
                else if (isset($data['displayName'])) {
                    $fullName = $data['displayName'];
                }
                // Check for name
                else if (isset($data['name'])) {
                    $fullName = $data['name'];
                }
                
                $students[] = [
                    'id' => $document->id(),
                    'name' => !empty($fullName) ? $fullName : 'N/A',
                    'email' => $data['email'] ?? 'N/A',
                    'lrn' => $data['lrn'] ?? 'N/A',
                    'strand' => $data['strand'] ?? 'N/A',
                    'status' => $data['status'] ?? 'inactive',
                ];
            }
            
            return view('principal.students_list', compact('students'));
        } catch (\Exception $e) {
            return view('principal.students_list', ['students' => [], 'error' => $e->getMessage()]);
        }
    }
    
    /**
     * Store a newly created student account.
     */
    public function store(Request $request)
    {
        $request->validate([
            'first_name' => 'required|min:2',
            'last_name' => 'required|min:2',
            'email' => 'required|email',
            'lrn' => 'required|numeric|digits:12',
            'strand' => 'required',
            'status' => 'required',
            'password' => 'required|min:6',
        ]);
        
        try {
            // This is just a placeholder - actual Firebase Auth and Firestore creation happens in the JS code
            return response()->json([
                'success' => true,
                'message' => 'Student account creation initiated successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to initiate student account creation.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Update the student's status.
     */
    public function updateStatus(Request $request)
    {
        $request->validate([
            'student_id' => 'required',
            'new_status' => 'required|in:active,inactive,graduated,suspended,transferred',
        ]);
        
        try {
            $studentId = $request->student_id;
            $newStatus = $request->new_status;
            
            // Update the student status in Firestore
            $studentRef = $this->firestore->database()->collection('student_accounts')->document($studentId);
            $studentRef->update([
                ['path' => 'status', 'value' => $newStatus]
            ]);
            
            // Log the status update
            Log::info("Updated student status: {$studentId} to {$newStatus}");
            
            return response()->json([
                'success' => true,
                'message' => 'Student status updated successfully.',
                'redirect' => route('principal.students_list')
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update student status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update student status.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Remove the student account.
     */
    public function destroy(Request $request)
    {
        $request->validate([
            'student_id' => 'required',
        ]);
        
        try {
            $studentId = $request->student_id;
            
            // Delete the student from Firestore
            $this->firestore->database()->collection('student_accounts')->document($studentId)->delete();
            
            // Log the deletion
            Log::info("Student removed: {$studentId}");
            
            return response()->json([
                'success' => true,
                'message' => 'Student removed successfully.',
                'redirect' => route('principal.students_list')
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to remove student: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to remove student.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}