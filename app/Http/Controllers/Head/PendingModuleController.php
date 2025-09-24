<?php

namespace App\Http\Controllers\Head;

use App\Http\Controllers\Controller;
use App\Services\FirebaseService;
use Google\Cloud\Firestore\FirestoreClient;
use Google\Cloud\Core\Timestamp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class PendingModuleController extends Controller
{
    protected FirestoreClient $firestore;

    public function __construct(FirebaseService $firebase)
    {
        $this->firestore = $firebase->getFirestore();
    }

    // GET /head/pending-modules?filter=pending|approved|rejected|under_review
    public function index(Request $request)
    {
        try {
            $filter = (string) $request->query('filter', 'pending');
            $status = $filter === 'under_review' ? 'rejected' : $filter;

            $snap = $this->firestore->collection('modules')->where('status', '=', $status)->documents();

            $items = [];
            foreach ($snap as $doc) {
                if (!$doc->exists()) continue;
                $data = $doc->data();

                $createdAt = $data['created_at'] ?? ($data['createdOn'] ?? null);
                if ($createdAt instanceof Timestamp) {
                    $createdAt = $createdAt->get()->format(DATE_ATOM);
                } elseif ($createdAt instanceof \DateTimeInterface) {
                    $createdAt = $createdAt->format(DATE_ATOM);
                }

                $items[] = [
                    'id'              => $doc->id(),
                    'title'           => $data['title'] ?? null,
                    'topic'           => $data['topic'] ?? null, // add this
                    'status'          => $data['status'] ?? null,
                    'created_at'      => $createdAt,
                    'created_by_name' => $data['created_by_name'] ?? null,
                    'role'            => $data['created_by_role'] ?? null,
                    'strand'          => $data['created_by_strand'] ?? null,
                    // NEW: for card identification
                    'quarter_number'  => $data['quarter_number'] ?? null,
                    'quarter_id'      => $data['quarter_id'] ?? null,
                ];
            }
            return response()->json($items);
        } catch (Throwable $e) {
            Log::error('PendingModuleController@index failed', ['e' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to fetch modules'], 500);
        }
    }

    // Strict actor meta (no fallbacks or Firestore lookups)
    protected function actorMeta(Request $request): array
    {
        $uid  = session('user.uid') ?: 'unknown_user';
        $name = session('user.name') ?: 'Unknown User Name';
        $role = session('user.role') ?: 'unknown_role';

        // Resolve strand like PendingQuarterController:
        // request('strand') -> session('user.strand') -> admin_accounts/{uid}.strand
        $strand = $request->input('strand');
        if (!$strand) {
            $strand = session('user.strand');
        }
        if ((!$strand || $strand === 'unknown_strand') && $uid !== 'unknown_user') {
            try {
                $snap = $this->firestore->collection('admin_accounts')->document($uid)->snapshot();
                if ($snap->exists()) {
                    $acc = $snap->data();
                    if (!empty($acc['strand'])) {
                        $strand = $acc['strand'];
                    }
                }
            } catch (Throwable $e) {
                Log::warning('actorMeta (modules): admin_accounts lookup failed', ['error' => $e->getMessage()]);
            }
        }

        return [
            'actor_id'     => $uid,
            'actor_name'   => $name,
            'actor_role'   => $role,
            'actor_strand' => $strand,
        ];
    }

    // POST /head/pending-modules/{id}/approve
    public function approve(Request $request, string $id)
    {
        try {
            $actor = $this->actorMeta($request);

            $this->firestore->collection('modules')->document($id)->set([
                'status' => 'approved',
                'updated_at' => (new Timestamp(new \DateTimeImmutable())),
            ], ['merge' => true]);

            // subcollection: modules/{id}/reviews
            $this->firestore->collection('modules')->document($id)->collection('reviews')->add([
                'action'       => 'approve',
                'comment'      => null,
                'createdAt'    => new Timestamp(new \DateTimeImmutable()),
                'actor_id'     => $actor['actor_id'] ?? null,
                'actor_name'   => $actor['actor_name'] ?? null,
                'actor_role'   => $actor['actor_role'] ?? null,
                'actor_strand' => $actor['actor_strand'] ?? null,
            ]);

            return response()->json(['id' => $id, 'status' => 'approved']);
        } catch (Throwable $e) {
            Log::error('PendingModuleController@approve failed', ['id' => $id, 'e' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to approve module'], 500);
        }
    }

    // POST /head/pending-modules/{id}/reject
    public function reject(Request $request, string $id)
    {
        try {
            $comment = $request->input('comment');
            $actor = $this->actorMeta($request);

            $this->firestore->collection('modules')->document($id)->set([
                'status' => 'rejected',
                'updated_at' => (new Timestamp(new \DateTimeImmutable())),
            ], ['merge' => true]);

            // subcollection: modules/{id}/reviews
            $this->firestore->collection('modules')->document($id)->collection('reviews')->add([
                'action'       => 'reject',
                'comment'      => $comment,
                'createdAt'    => new Timestamp(new \DateTimeImmutable()),
                'actor_id'     => $actor['actor_id'] ?? null,
                'actor_name'   => $actor['actor_name'] ?? null,
                'actor_role'   => $actor['actor_role'] ?? null,
                'actor_strand' => $actor['actor_strand'] ?? null,
            ]);

            return response()->json(['id' => $id, 'status' => 'rejected']);
        } catch (Throwable $e) {
            Log::error('PendingModuleController@reject failed', ['id' => $id, 'e' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to reject module'], 500);
        }
    }

    // GET /head/pending-modules/{id}/reviews
    public function reviews(string $id)
    {
        try {
            // read subcollection: modules/{id}/reviews
            $snap = $this->firestore->collection('modules')->document($id)
                ->collection('reviews')->orderBy('createdAt', 'DESC')->documents();

            $items = [];
            foreach ($snap as $doc) {
                if (!$doc->exists()) continue;
                $data = $doc->data();
                $ts = $data['createdAt'] ?? null;
                $items[] = [
                    'id'           => $doc->id(),
                    'action'       => $data['action'] ?? null,
                    'comment'      => $data['comment'] ?? null,
                    'createdAt'    => $ts instanceof Timestamp ? $ts->get()->format(DATE_ATOM) : null,
                    'actor_id'     => $data['actor_id'] ?? null,
                    'actor_name'   => $data['actor_name'] ?? null,
                    'actor_role'   => $data['actor_role'] ?? null,
                    'actor_strand' => $data['actor_strand'] ?? null,
                ];
            }
            return response()->json($items);
        } catch (Throwable $e) {
            Log::error('PendingModuleController@reviews failed', ['id' => $id, 'e' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to load reviews'], 500);
        }
    }
}