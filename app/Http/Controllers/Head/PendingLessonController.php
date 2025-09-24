<?php
namespace App\Http\Controllers\Head;

use App\Http\Controllers\Controller;
use App\Services\FirebaseService;
use Google\Cloud\Firestore\FirestoreClient;
use Google\Cloud\Core\Timestamp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class PendingLessonController extends Controller
{
    protected FirestoreClient $firestore;

    public function __construct(FirebaseService $firebase)
    {
        $this->firestore = $firebase->getFirestore();
    }

    // GET /head/pending-lessons?filter=pending|approved|rejected|under_review
    public function index(Request $request)
    {
        try {
            $filter = (string) $request->query('filter', 'pending');
            $status = $filter === 'under_review' ? 'rejected' : $filter;

            $snap = $this->firestore->collection('lessons')->where('status', '=', $status)->documents();

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

                // quarter_number: from stored field or from "quarter" like "q1"
                $quarterNumber = $data['quarter_number'] ?? null;
                if ($quarterNumber === null && !empty($data['quarter']) && preg_match('/q(\d+)/i', (string)$data['quarter'], $m)) {
                    $quarterNumber = (int)($m[1] ?? 0) ?: null;
                }

                $items[] = [
                    'id'               => $doc->id(),
                    'title'            => $data['title'] ?? null,
                    'topic'            => $data['topic'] ?? null,
                    'status'           => $data['status'] ?? null,
                    'created_at'       => $createdAt,
                    'created_by_name'  => $data['created_by_name'] ?? null, // may be null; UI will fallback
                    'role'             => $data['created_by_role'] ?? null,
                    'strand'           => $data['created_by_strand'] ?? null,
                    'module_number'    => $data['module_number'] ?? null,
                    'module_id'        => $data['module_id'] ?? null,
                    'quarter_number'   => $quarterNumber,
                    'quarter_id'       => $data['quarter_id'] ?? null,
                ];
            }
            return response()->json($items);
        } catch (Throwable $e) {
            Log::error('PendingLessonController@index failed', ['e' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to fetch lessons'], 500);
        }
    }

    // Resolve actor meta (same pattern as modules)
    protected function actorMeta(Request $request): array
    {
        $uid  = session('user.uid') ?: 'unknown_user';
        $name = session('user.name') ?: 'Unknown User Name';
        $role = session('user.role') ?: 'unknown_role';

        $strand = $request->input('strand') ?: session('user.strand');
        if ((!$strand || $strand === 'unknown_strand') && $uid !== 'unknown_user') {
            try {
                $snap = $this->firestore->collection('admin_accounts')->document($uid)->snapshot();
                if ($snap->exists()) {
                    $acc = $snap->data();
                    if (!empty($acc['strand'])) $strand = $acc['strand'];
                }
            } catch (Throwable $e) {
                Log::warning('actorMeta (lessons): admin_accounts lookup failed', ['error' => $e->getMessage()]);
            }
        }

        return [
            'actor_id'     => $uid,
            'actor_name'   => $name,
            'actor_role'   => $role,
            'actor_strand' => $strand,
        ];
    }

    // POST /head/pending-lessons/{id}/approve
    public function approve(Request $request, string $id)
    {
        try {
            $actor = $this->actorMeta($request);

            $this->firestore->collection('lessons')->document($id)->set([
                'status'     => 'approved',
                'updated_at' => (new Timestamp(new \DateTimeImmutable())),
            ], ['merge' => true]);

            $this->firestore->collection('lessons')->document($id)->collection('reviews')->add([
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
            Log::error('PendingLessonController@approve failed', ['id' => $id, 'e' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to approve lesson'], 500);
        }
    }

    // POST /head/pending-lessons/{id}/reject
    public function reject(Request $request, string $id)
    {
        try {
            $comment = $request->input('comment');
            $actor = $this->actorMeta($request);

            $this->firestore->collection('lessons')->document($id)->set([
                'status'     => 'rejected',
                'updated_at' => (new Timestamp(new \DateTimeImmutable())),
            ], ['merge' => true]);

            $this->firestore->collection('lessons')->document($id)->collection('reviews')->add([
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
            Log::error('PendingLessonController@reject failed', ['id' => $id, 'e' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to reject lesson'], 500);
        }
    }

    // GET /head/pending-lessons/{id}/reviews
    public function reviews(string $id)
    {
        try {
            $snap = $this->firestore->collection('lessons')->document($id)
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
            Log::error('PendingLessonController@reviews failed', ['id' => $id, 'e' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to load reviews'], 500);
        }
    }

    // GET /head/pending-lessons/{id}
    public function show(string $id)
    {
        try {
            $doc = $this->firestore->collection('lessons')->document($id)->snapshot();
            if (!$doc->exists()) {
                return response()->json(['error' => 'Lesson not found'], 404);
            }
            $data = $doc->data();
            $createdAt = $data['created_at'] ?? ($data['createdOn'] ?? null);
            if ($createdAt instanceof Timestamp) {
                $createdAt = $createdAt->get()->format(DATE_ATOM);
            } elseif ($createdAt instanceof \DateTimeInterface) {
                $createdAt = $createdAt->format(DATE_ATOM);
            }
            return response()->json([
                'id'               => $doc->id(),
                'title'            => $data['title'] ?? null,
                'topic'            => $data['topic'] ?? null,
                'status'           => $data['status'] ?? null,
                'created_at'       => $createdAt,
                'created_by_name'  => $data['created_by_name'] ?? null,
                'role'             => $data['created_by_role'] ?? null,
                'strand'           => $data['created_by_strand'] ?? null,
                'module_number'    => $data['module_number'] ?? null,
                'module_id'        => $data['module_id'] ?? null,
                'quarter_number'   => $data['quarter_number'] ?? null,
                'quarter_id'       => $data['quarter_id'] ?? null,
                'contents'         => isset($data['contents']) && is_array($data['contents']) ? array_values($data['contents']) : [],
            ]);
        } catch (\Throwable $e) {
            Log::error('PendingLessonController@show failed', ['id' => $id, 'e' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to load lesson'], 500);
        }
    }
}