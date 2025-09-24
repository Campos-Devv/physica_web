<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class LessonController extends Controller
{
    protected $firestore;

    public function __construct()
    {
        try {
            $factory = (new \Kreait\Firebase\Factory)
                ->withServiceAccount(storage_path('app/firebase/firebase_credentials.json'));
            $this->firestore = $factory->createFirestore()->database();
        } catch (\Exception $e) {
            Log::error('Firestore initialization error (LessonController): ' . $e->getMessage());
        }
    }

    protected function formatDate(Carbon $carbon)
    {
        return $carbon->format('Y-m-d H:i:s');
    }

    protected function extractQuarterCode(string $moduleId): string
    {
        // Expected: module_q1_01 -> q1
        $parts = explode('_', $moduleId);
        $q = $parts[1] ?? '';
        return $q ?: 'q1';
    }

    protected function extractModuleNumberInt(string $moduleId): int
    {
        // Expected: module_q1_01 -> 1
        $parts = explode('_', $moduleId);
        $last = $parts[2] ?? '1';
        $n = intval($last);
        return $n > 0 ? $n : 1;
    }

    protected function extractModuleNumber(string $moduleId): string
    {
        // Expected module ID example: module_q1_01 -> take the last segment "01"
        $parts = explode('_', $moduleId);
        $last = end($parts) ?: '1';
        // normalize to 2-digit
        $num = intval($last);
        return str_pad($num > 0 ? $num : 1, 2, '0', STR_PAD_LEFT);
    }

    protected function nextLessonNumberForModule(string $moduleId): int
    {
        try {
            $ref = $this->firestore->collection('lessons')
                ->where('module_id', '=', $moduleId);
            $snap = $ref->documents();

            $max = 0;
            foreach ($snap as $doc) {
                $data = $doc->data();
                if (isset($data['number'])) {
                    $n = intval($data['number']);
                    if ($n > $max) $max = $n;
                }
            }
            return $max + 1;
        } catch (\Exception $e) {
            Log::warning('nextLessonNumberForModule failed: ' . $e->getMessage());
            return 1;
        }
    }

    public function getByModule($id)
    {
        try {
            $ref = $this->firestore->collection('lessons')
                ->where('module_id', '=', $id);
            $snap = $ref->documents();

            $out = [];
            foreach ($snap as $doc) {
                $row = array_merge(['id' => $doc->id()], $doc->data());
                $out[] = $row;
            }

            // Sort by number ascending (avoid composite index requirement)
            usort($out, fn($a, $b) => intval($a['number'] ?? 0) <=> intval($b['number'] ?? 0));

            return response()->json($out);
        } catch (\Exception $e) {
            Log::error('Error fetching lessons by module: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch lessons',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $doc = $this->firestore->collection('lessons')->document($id)->snapshot();
            if (!$doc->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Lesson not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => array_merge(['id' => $doc->id()], $doc->data())
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching lesson: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch lesson',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title'    => 'required|string|max:255',
            'moduleId' => 'required|string',
            'topic'    => 'sometimes|string|nullable',
            'contents' => 'array',
        ]);
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors'  => $validator->errors()
            ], 422);
        }

        try {
            $moduleId = $request->input('moduleId');
            $quarterCode  = $this->extractQuarterCode($moduleId);         // e.g., q1
            $moduleNumInt = $this->extractModuleNumberInt($moduleId);     // e.g., 1
            $moduleNumber = $this->extractModuleNumber($moduleId);        // "01" (kept for module_number field if needed)

            $lessonNumber = $this->nextLessonNumberForModule($moduleId);
            $lessonNumberPadded = str_pad($lessonNumber, 2, '0', STR_PAD_LEFT);

            // New ID format: lesson_q1_m1_01 (quarter, module as int, lesson 2-digit)
            $lessonId = "lesson_{$quarterCode}_m{$moduleNumInt}_{$lessonNumberPadded}";

            // Creator info
            $userId   = session('user.uid') ?: 'unknown_user';
            $userName = session('user.name') ?: 'Unknown User Name';
            $userRole = session('user.role') ?: 'unknown_role';

            // Resolve strand: request -> session -> admin_accounts/{uid}.strand
            $userStrand = $request->input('strand') ?: session('user.strand');
            if ((!$userStrand || $userStrand === 'unknown_strand') && $userId !== 'unknown_user') {
                try {
                    $accSnap = $this->firestore->collection('admin_accounts')->document($userId)->snapshot();
                    if ($accSnap->exists()) {
                        $acc = $accSnap->data();
                        if (!empty($acc['strand'])) {
                            $userStrand = $acc['strand'];
                        }
                    }
                } catch (\Throwable $e) {
                    Log::warning('LessonController@store: strand lookup failed', ['error' => $e->getMessage()]);
                }
            }

            $now = Carbon::now('Asia/Manila');
            $data = [
                'title'             => $request->input('title'),
                'topic'             => $request->input('topic', null),
                'module_id'         => $moduleId,
                'module_number'     => $moduleNumInt,
                'quarter'           => $quarterCode,
                'number'            => $lessonNumber,
                // Direct workflow: lessons are immediately approved
                'status'            => 'approved',

                // creator info
                'created_by'        => $userId,
                'created_by_name'   => $userName,
                'created_by_role'   => $userRole,
                'created_by_strand' => $userStrand,

                'created_at'        => $this->formatDate($now),
                'updated_at'        => $this->formatDate($now),
            ];

            // Keep contents in the exact order from client
            if ($request->has('contents') && is_array($request->contents)) {
                $data['contents'] = array_values($request->contents);
            } else {
                $data['contents'] = [];
            }

            $this->firestore->collection('lessons')->document($lessonId)->set($data);

            return response()->json([
                'success' => true,
                'message' => 'Lesson created successfully',
                'data'    => array_merge(['id' => $lessonId], $data),
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating lesson: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create lesson',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'title'    => 'sometimes|required|string|max:255',
            'topic'    => 'sometimes|string|nullable',
            // status removed from validation (always approved)
            'contents' => 'sometimes|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors'  => $validator->errors()
            ], 422);
        }

        try {
            $ref = $this->firestore->collection('lessons')->document($id);
            $snap = $ref->snapshot();
            if (!$snap->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Lesson not found'
                ], 404);
            }

            $now = Carbon::now('Asia/Manila');
            $payload = [];

            if ($request->has('title'))   $payload['title'] = $request->input('title');
            if ($request->has('topic'))   $payload['topic'] = $request->input('topic');
            // status updates ignored (always approved)
            if ($request->has('contents') && is_array($request->contents)) {
                // Preserve order from client
                $payload['contents'] = array_values($request->contents);
            }
            $payload['updated_at'] = $this->formatDate($now);

            $updates = [];
            foreach ($payload as $field => $value) {
                $updates[] = ['path' => $field, 'value' => $value];
            }
            $ref->update($updates);

            return response()->json([
                'success' => true,
                'message' => 'Lesson updated successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating lesson: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update lesson',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update only the status field (pending|approved|rejected).
     */
    public function updateStatus(Request $request, $id)
    {
        // Simplified: always force approved; legacy clients calling this endpoint still succeed
        try {
            $ref = $this->firestore->collection('lessons')->document($id);
            $snap = $ref->snapshot();
            if (!$snap->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Lesson not found'
                ], 404);
            }
            $now = Carbon::now('Asia/Manila');
            $ref->update([
                ['path' => 'status', 'value' => 'approved'],
                ['path' => 'updated_at', 'value' => $this->formatDate($now)]
            ]);
            return response()->json([
                'success' => true,
                'message' => 'Lesson status set to approved',
                'status'  => 'approved'
            ]);
        } catch (\Exception $e) {
            Log::error('Error forcing lesson approved: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update lesson status',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $ref = $this->firestore->collection('lessons')->document($id);
            $snap = $ref->snapshot();
            if (!$snap->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Lesson not found'
                ], 404);
            }

            $ref->delete();
            return response()->json([
                'success' => true,
                'message' => 'Lesson deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting lesson: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete lesson',
                'error'   => $e->getMessage()
            ], 500);
        }
    }
}