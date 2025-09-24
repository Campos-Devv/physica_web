<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;
use Google\Cloud\Firestore\FirestoreClient;
use Exception;
use App\Services\FirebaseService; // add

class QuarterController extends Controller
{
    protected FirestoreClient $firestore; // type-hint

    /**
     * Resolve Firestore via FirebaseService (no duplicated Factory code)
     */
    public function __construct(FirebaseService $firebase)
    {
        $this->firestore = $firebase->getFirestore();
    }

    /**
     * Display a listing of quarters
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function index()
    {
        try {
            $quartersCollection = $this->firestore->collection('quarters');
            $quartersSnapshot = $quartersCollection->orderBy('number')->documents();

            $formattedQuarters = [];
            foreach ($quartersSnapshot as $quarter) {
                $data = $quarter->data();

                // Compute modules_count for this quarter (handles quarter_id and legacy quarterId)
                $modulesCount = $this->countModulesForQuarter($quarter->id());

                $formattedQuarters[] = array_merge(
                    ['id' => $quarter->id()],
                    $data,
                    ['modules_count' => $modulesCount]
                );
            }

            return response()->json([
                'success' => true,
                'data' => $formattedQuarters
            ]);
        } catch (Exception $e) {
            Log::error('Error fetching quarters: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch quarters',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created quarter
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        // Log the incoming request data
        Log::info('Creating quarter with data:', $request->all());
        
        $validator = Validator::make($request->all(), [
            'name'   => 'required|string|max:255',
            'number' => 'required|integer|min:1|max:4', // max 4
        ]);

        if ($validator->fails()) {
            Log::warning('Quarter validation failed:', ['errors' => $validator->errors()->toArray()]);
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors'  => $validator->errors()
            ], 422);
        }

        try {
            // Hard limit: only 4 quarters allowed
            $existing = $this->firestore->collection('quarters')->documents();
            $count = 0;
            foreach ($existing as $doc) { $count++; }
            if ($count >= 4) {
                return response()->json([
                    'success' => false,
                    'message' => 'Maximum of 4 quarters reached'
                ], 409);
            }

            $userId = session('user.uid') ?: 'unknown_user';
            $userName = session('user.name') ?: 'Unknown User Name';
            $userRole = session('user.role') ?: 'unknown_role';

            $userStrand = $request->input('strand');
            if (!$userStrand) {
                $userStrand = session('user.strand');
            }
            if ((!$userStrand || $userStrand === 'unknown_strand') && $userId !== 'unknown_user') {
                try {
                    $snap = $this->firestore->collection('admin_accounts')->document($userId)->snapshot();
                    if ($snap->exists()) {
                        $data = $snap->data();
                        if (!empty($data['strand'])) {
                            $userStrand = $data['strand'];
                        }
                    }
                } catch (Exception $e) {
                    Log::warning('Unable to fetch user strand:', ['error' => $e->getMessage()]);
                }
            }

            $quarterNumber = (int) $request->input('number');

            // Format quarter ID with leading zero if needed
            $quarterId = 'quarter_' . str_pad($quarterNumber, 2, '0', STR_PAD_LEFT);

            // Prevent duplicate number
            $existingQuarter = $this->firestore->collection('quarters')->document($quarterId)->snapshot();
            if ($existingQuarter->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => "Quarter $quarterNumber already exists"
                ], 409);
            }

            $now = Carbon::now('Asia/Manila');
            $quarterData = [
                'name'       => $request->input('name'),
                'number'     => $quarterNumber,
                'created_by' => $userId,
                'created_by_name' => $userName,
                'created_by_role' => $userRole,
                'created_by_strand' => $userStrand,
                'created_at' => $now->toDateTimeString(),
                'updated_at' => $now->toDateTimeString(),
                // Directly approved (no pending/review workflow anymore)
                'status'     => 'approved'
            ];

            $this->firestore->collection('quarters')->document($quarterId)->set($quarterData);

            return response()->json([
                'success' => true,
                'message' => "Quarter $quarterNumber created successfully",
                'data'    => array_merge(['id' => $quarterId, 'modules_count' => 0], $quarterData)
            ], 201);

        } catch (Exception $e) {
            Log::error('Error creating quarter: ' . $e->getMessage());
            return response()->json([
            'success' => false,
            'message' => 'Failed to create quarter',
            'error'   => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified quarter
     *
     * @param  string  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        try {
            $quarter = $this->firestore
                ->collection('quarters')
                ->document($id)
                ->snapshot();
            
            if (!$quarter->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Quarter not found'
                ], 404);
            }
            
            $quarterData = $quarter->data();
            
            return response()->json([
                'success' => true,
                'data' => array_merge(['id' => $quarter->id()], $quarterData)
            ]);
        } catch (Exception $e) {
            Log::error('Error fetching quarter: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch quarter',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified quarter
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  string  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name'   => 'sometimes|required|string|max:255',
            // status workflow removed; ignore or coerce to approved if present
            'status' => 'sometimes|in:approved'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors'  => $validator->errors()
            ], 422);
        }

        try {
            return $this->applyQuarterUpdate($id, $validator->validated());
        } catch (Exception $e) {
            Log::error('Error updating quarter: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update quarter',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the quarter status
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  string  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateStatus(Request $request, $id)
    {
        // Status workflow removed; always set to approved
        $validator = Validator::make($request->all(), [
            'status' => 'sometimes|in:approved'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors'  => $validator->errors()
            ], 422);
        }

        try {
            return $this->applyQuarterUpdate($id, ['status' => 'approved']);
        } catch (Exception $e) {
            Log::error('Error updating quarter status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update quarter status',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified quarter and cascade delete related docs.
     */
    public function destroy($id)
    {
        try {
            $quarterRef = $this->firestore->collection('quarters')->document($id);
            $quarter    = $quarterRef->snapshot();

            if (!$quarter->exists()) {
                Log::warning("Quarter destroy: not found id={$id}");
                return response()->json([
                    'success' => false,
                    'message' => 'Quarter not found'
                ], 404);
            }

            // Delete the quarter document
            $quarterRef->delete();

            // Delete modules linked to this quarter (correct field name: quarter_id)
            $totalDeleted = 0;
            $totalDeleted += $this->deleteByQuery('modules', 'quarter_id', $id);

            // Optional legacy cleanup if some docs used quarterId
            $totalDeleted += $this->deleteByQuery('modules', 'quarterId', $id);

            Log::info("Quarter destroy: id={$id}, modulesDeleted={$totalDeleted}");

            return response()->json([
                'success' => true,
                'message' => 'Quarter and related data deleted successfully',
                'meta'    => ['modulesDeleted' => $totalDeleted]
            ]);
        } catch (Exception $e) {
            Log::error('Error deleting quarter: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete quarter',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    // Generate common id variants to handle inconsistent data
    private function quarterIdVariants(string $id): array
    {
        // id like "quarter_04" or "quarter_4" or "4"
        $n = null;
        if (preg_match('/quarter_(\d+)/', $id, $m)) {
            $n = (int) $m[1];
        } elseif (ctype_digit($id)) {
            $n = (int) $id;
        }

        $vars = [$id];
        if ($n !== null) {
            $vars[] = "quarter_" . str_pad((string)$n, 2, '0', STR_PAD_LEFT);
            $vars[] = "quarter_" . $n;
            $vars[] = (string)$n;  // string number
            $vars[] = $n;          // numeric (in case quarterId was stored as number)
        }
        // Make unique
        return array_values(array_unique($vars, SORT_REGULAR));
    }

    /**
     * Delete documents from a top-level collection where field == value.
     * Returns total deleted count.
     */
    private function deleteByQuery(string $collection, string $field, $value, int $chunk = 500): int
    {
        $total = 0;
        $query = $this->firestore->collection($collection)->where($field, '==', $value);

        while (true) {
            $docs = $query->limit($chunk)->documents();

            $count = 0;
            foreach ($docs as $snap) {
                // Delete by known path (avoids batch/commit differences)
                $this->firestore->collection($collection)->document($snap->id())->delete();
                $count++;
            }

            $total += $count;
            if ($count === 0) break;
        }

        return $total;
    }

    /**
     * Shared update logic to avoid duplication.
     */
    private function applyQuarterUpdate(string $id, array $changes)
    {
        $quarterRef = $this->firestore->collection('quarters')->document($id);
        $quarter    = $quarterRef->snapshot();

        if (!$quarter->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Quarter not found'
            ], 404);
        }

        $now = Carbon::now('Asia/Manila');
        $changes['updated_at'] = $now->toDateTimeString();
        if (array_key_exists('status', $changes)) {
            // Force status to approved regardless of input
            $changes['status'] = 'approved';
        }

        // Perform the update (merge works with associative arrays)
        $quarterRef->set($changes, ['merge' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Quarter updated successfully',
            'data'    => array_merge(
                ['id' => $id],
                array_merge($quarter->data(), $changes)
            )
        ]);
    }

    // Count modules linked to a quarter (supports quarter_id and legacy quarterId, deduping)
    private function countModulesForQuarter(string $quarterId): int
    {
        $seen = [];
        $fields = ['quarter_id', 'quarterId'];

        foreach ($fields as $field) {
            foreach ($this->quarterIdVariants($quarterId) as $val) {
                $docs = $this->firestore->collection('modules')->where($field, '==', $val)->documents();
                foreach ($docs as $snap) {
                    $seen[$snap->id()] = true;
                }
            }
        }

        return count($seen);
    }
}
