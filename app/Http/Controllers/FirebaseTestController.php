<?php

namespace App\Http\Controllers;

use App\Services\FirebaseService;

class FirebaseTestController extends Controller
{
    protected $firebase;
    
    public function __construct(FirebaseService $firebase)
    {
        $this->firebase = $firebase;
    }
    
    public function testConnection()
    {
        // Write test data
        $this->firebase->set('test', [
            'message' => 'Hello Firebase!',
            'timestamp' => time()
        ]);
        
        // Read test data
        $data = $this->firebase->get('test');
        
        return response()->json($data);
    }
}