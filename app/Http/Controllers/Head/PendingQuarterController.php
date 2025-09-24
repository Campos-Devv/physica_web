<?php

namespace App\Http\Controllers\Head;

use App\Http\Controllers\Controller;
use App\Services\FirebaseService;
use Google\Cloud\Firestore\FirestoreClient;
use Google\Cloud\Firestore\FieldValue;
use Google\Cloud\Core\Timestamp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PendingQuarterController extends Controller
{
    protected FirestoreClient $firestore;

    public function __construct(FirebaseService $firebase)
    {
        // Reuse central FirebaseService to get the Firestore client
        $this->firestore = $firebase->getFirestore();
    }

    // GET /head/pending-quarters
    public function index()
    {
        try {
            // 'pending' | 'under_review' | 'approved' | 'rejected'
            $filter = request()->query('filter', 'pending');
            $statuses = match ($filter) {
                // Under Review = items requiring changes (rejected)
                'under_review' => ['rejected'],
                'approved'     => ['approved'],
                'rejected'     => ['rejected'],
                default        => ['pending'],
            };

            $quarters = $this->firestore->collection('quarters');

            // Build query by filter
            if (count($statuses) === 1) {
                $query = $quarters->where('status', '==', $statuses[0]);
            } else {
                // Firestore 'in' operator (max 10 values)
                $query = $quarters->where('status', 'in', $statuses);
            }

            $documents = $query->documents();

            $items = [];
            foreach ($documents as $doc) {
                if (!$doc->exists()) continue;
                $data = $doc->data();

                $items[] = [
                    'id'         => $doc->id(),
                    'title'      => $data['title'] ?? ('Quarter ' . ($data['number'] ?? $doc->id())),
                    'number'     => $data['number'] ?? null,
                    'status'     => $data['status'] ?? 'pending',
                    'created_at' => $data['created_at'] ?? null,
                    'createdBy'  => $data['created_by_name'] ?? ($data['created_by'] ?? null),
                    'role'       => $data['created_by_role'] ?? null,
                    'strand'     => $data['created_by_strand'] ?? null
                ];
            }

            // Optional: sort by number if present
            usort($items, fn($a,$b) => ($a['number'] ?? 0) <=> ($b['number'] ?? 0));

            return response()->json(['data' => $items]);
        } catch (\Throwable $e) {
            Log::error('PendingQuarterController@index error: '.$e->getMessage());
            return response()->json(['data' => [], 'error' => 'Failed to load quarters'], 500);
        }
    }

    // Helper to capture actor metadata (align strand lookup with QuarterController::store)
    protected function actorMeta(Request $request): array
    {
        $uid  = session('user.uid') ?: 'unknown_user';
        $name = session('user.name') ?: 'Unknown User Name';
        $role = session('user.role') ?: 'unknown_role';

        // Resolve strand like QuarterController::store:
        // request('strand') -> session('user.strand') -> admin_accounts/{uid}.strand
        $strand = $request->input('strand');
        if (!$strand) {
            $strand = session('user.strand');
        }
        if ((!$strand || $strand === 'unknown_strand') && $uid !== 'unknown_user') {
            try {
                $snap = $this->firestore->collection('admin_accounts')->document($uid)->snapshot();
                if ($snap->exists()) {
                    $data = $snap->data();
                    if (!empty($data['strand'])) {
                        $strand = $data['strand'];
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('actorMeta: admin_accounts lookup failed', ['error' => $e->getMessage()]);
            }
        }

        return [
            'actor_id'     => $uid,
            'actor_name'   => $name,
            'actor_role'   => $role,
            'actor_strand' => $strand,
        ];
    }

    // POST /head/pending-quarters/{id}/approve
    public function approve(Request $request, string $id)
    {
        try {
            $docRef = $this->firestore->collection('quarters')->document($id);
            $snap = $docRef->snapshot();
            if (!$snap->exists()) return response()->json(['error' => 'Quarter not found'], 404);

            $status = strtolower((string)($snap->get('status') ?? 'pending'));
            if ($status !== 'pending') {
                return response()->json(['error' => 'Quarter is not pending', 'status' => $status], 409);
            }

            $actor = $this->actorMeta($request);

            $this->firestore->runTransaction(function ($transaction) use ($docRef, $actor) {
                /** @var \Google\Cloud\Firestore\Transaction $transaction */
                $transaction->update($docRef, [
                    ['path' => 'status',       'value' => 'approved'],
                    ['path' => 'approved_at',  'value' => FieldValue::serverTimestamp()],
                ]);

                $reviewDoc = $docRef->collection('reviews')->newDocument();
                $transaction->set($reviewDoc, array_merge($actor, [
                    'action'       => 'approve',
                    'comment'      => '',
                    'createdAt'    => FieldValue::serverTimestamp(),
                    'status_after' => 'approved',
                ]));
            });

            return response()->json(['id' => $id, 'status' => 'approved']);
        } catch (\Throwable $e) {
            Log::error('PendingQuarterController@approve error: '.$e->getMessage());
            return response()->json(['error' => 'Failed to approve quarter'], 500);
        }
    }

    // POST /head/pending-quarters/{id}/reject
    public function reject(Request $request, string $id)
    {
        $payload = $request->validate([
            'comment' => 'nullable|string|max:2000',
        ]);

        try {
            $docRef = $this->firestore->collection('quarters')->document($id);
            $snap = $docRef->snapshot();
            if (!$snap->exists()) return response()->json(['error' => 'Quarter not found'], 404);

            $status = strtolower((string)($snap->get('status') ?? 'pending'));
            // Only allow rejecting from pending now
            if ($status !== 'pending') {
                return response()->json(['error' => 'Quarter cannot be rejected from current status', 'status' => $status], 409);
            }

            $actor = $this->actorMeta($request);
            $comment = $payload['comment'] ?? '';

            $this->firestore->runTransaction(function ($transaction) use ($docRef, $actor, $comment) {
                /** @var \Google\Cloud\Firestore\Transaction $transaction */
                $transaction->update($docRef, [
                    ['path' => 'status', 'value' => 'rejected'],
                ]);

                $reviewDoc = $docRef->collection('reviews')->newDocument();
                $transaction->set($reviewDoc, array_merge($actor, [
                    'action'       => 'reject',
                    'comment'      => $comment,
                    'createdAt'    => FieldValue::serverTimestamp(),
                    'status_after' => 'rejected',
                ]));
            });

            return response()->json(['id' => $id, 'status' => 'rejected']);
        } catch (\Throwable $e) {
            Log::error('PendingQuarterController@reject error: '.$e->getMessage());
            return response()->json(['error' => 'Failed to reject quarter'], 500);
        }
    }

    // GET /head/pending-quarters/{id}/reviews
    public function reviews(string $id)
    {
        try {
            $docRef = $this->firestore->collection('quarters')->document($id);
            $snap = $docRef->snapshot();
            if (!$snap->exists()) {
                return response()->json(['data' => [], 'error' => 'Quarter not found'], 404);
            }

            $query = $docRef->collection('reviews')
                ->orderBy('createdAt', 'DESC');

            $docs = $query->documents();
            $items = [];
            foreach ($docs as $d) {
                if (!$d->exists()) continue;
                $data = $d->data();

                $ts = $data['createdAt'] ?? null;
                if ($ts instanceof Timestamp) {
                    $dt = $ts->get();
                    $createdIso = $dt instanceof \DateTimeInterface ? $dt->format(DATE_ATOM) : null;
                } elseif ($ts instanceof \DateTimeInterface) {
                    $createdIso = $ts->format(DATE_ATOM);
                } else {
                    $createdIso = is_string($ts) ? $ts : null;
                }

                $items[] = [
                    'id'           => $d->id(),
                    'action'       => $data['action']       ?? '',
                    'comment'      => $data['comment']      ?? '',
                    'status_after' => $data['status_after'] ?? '',
                    'createdAt'    => $createdIso,
                    'actor_id'     => $data['actor_id']     ?? 'unknown',
                    'actor_name'   => $data['actor_name']   ?? 'Unknown',
                    'actor_role'   => $data['actor_role']   ?? 'Unknown',
                    'actor_strand' => $data['actor_strand'] ?? 'Unknown',
                ];
            }

            return response()->json(['data' => $items]);
        } catch (\Throwable $e) {
            Log::error('PendingQuarterController@reviews error: '.$e->getMessage());
            return response()->json(['data' => [], 'error' => 'Failed to load reviews'], 500);
        }
    }
}