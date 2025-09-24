<?php

use App\Http\Controllers\Auth\FirebaseAuthController;
use App\Http\Controllers\FirebaseTestController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Session;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Principal\PrincipalController;
use App\Http\Controllers\Head\HeadController;
use Illuminate\Http\Request;
use App\Http\Controllers\LessonController;
// Removed Pending* controllers (pending workflow deprecated)

Route::get('/', function () {
    return redirect()->route('login');
}); 

// Add unauthorized route here at the top, so it's accessible without auth
Route::get('/unauthorized', function(Request $request) {
    // This page should be accessible to anyone
    $intended = $request->query('intended', '/');
    return view('errors.unauthorized', ['intended' => $intended]);
})->name('unauthorized');

Route::get('/firebase-test', [FirebaseTestController::class, 'testConnection']);

Route::get('/login', [LoginController::class, 'showLoginForm'])->name('login');
Route::post('/login', [FirebaseAuthController::class, 'login']);
Route::post('/logout', [FirebaseAuthController::class, 'logout'])->name('logout');



// Principal routes with auth.role middleware
Route::middleware(['auth.role:principal'])->prefix('principal')->name('principal.')->group(function () {
    Route::get('/dashboard', [PrincipalController::class, 'dashboard'])->name('dashboard');
    
    // Add your assign-teachers route here with the controller method
    Route::get('/assign-teachers', [PrincipalController::class, 'assignTeachers'])->name('assign.teachers');
    
    // Student Accounts
    Route::get('/students', [App\Http\Controllers\Principal\StudentAccountsController::class, 'index'])->name('students_list');
    Route::post('/students', [App\Http\Controllers\Principal\StudentAccountsController::class, 'store'])->name('students.store');
    Route::post('/students/update-status', [App\Http\Controllers\Principal\StudentAccountsController::class, 'updateStatus'])->name('students.update_status');
    Route::post('/students/destroy', [App\Http\Controllers\Principal\StudentAccountsController::class, 'destroy'])->name('students.destroy');

    // Teacher management routes - added the GET route for fetching a single teacher
    Route::get('/teachers/{id}', [PrincipalController::class, 'getTeacher'])->name('teachers.get'); // Add this line
    Route::post('/teachers', [PrincipalController::class, 'storeTeacher'])->name('teachers.store');
    Route::put('/teachers/{id}', [PrincipalController::class, 'updateTeacher'])->name('teachers.update');
    Route::delete('/teachers/{id}', [PrincipalController::class, 'deleteTeacher'])->name('teachers.delete');
    Route::match(['post', 'patch'], '/teachers/{id}/status', [PrincipalController::class, 'updateTeacherStatus'])->name('teachers.update.status');
});

// Head routes with auth.role middleware
Route::middleware(['auth.role:head'])->prefix('head')->name('head.')->group(function () {
    Route::get('/dashboard', [HeadController::class, 'dashboard'])->name('dashboard');
    // Pending content & manual approval routes removed
});

// Removed: head pending quarters approve/reject endpoints



// Redirect to dashboard based on role - removing middleware from this route
Route::get('/dashboard', function () {
    // Check if user is logged in
    if (!Session::has('user')) {
        return redirect()->route('login');
    }
    
    $role = session('user.role');
    
    switch ($role) {
        case 'Principal':
            return redirect()->route('principal.dashboard');
        case 'Head Teacher':
            return redirect()->route('head.dashboard');
        case 'Science Teacher':
            return redirect()->route('science.dashboard');
        default:
            return redirect()->route('login');
    }
})->name('dashboard');



Route::middleware(['auth.role:science'])->prefix('science')->name('science.')->group(function () {
    Route::get('/dashboard', function() {
        return view('science.dashboard');
    })->name('dashboard');

    Route::get('/create-lesson', function() {
        return view('science.create_lesson');
    })->name('create_lesson');
    
    Route::get('/classes', function() {
        return view('under_construction');
    })->name('classes');
    
    // Quarter Management Routes
    Route::get('/quarters', [App\Http\Controllers\QuarterController::class, 'index'])->name('quarters.index');
    Route::post('/quarters', [App\Http\Controllers\QuarterController::class, 'store'])->name('quarters.store');
    Route::get('/quarters/{id}', [App\Http\Controllers\QuarterController::class, 'show'])->name('quarters.show');
    Route::put('/quarters/{id}', [App\Http\Controllers\QuarterController::class, 'update'])->name('quarters.update');
    Route::patch('/quarters/{id}/status', [App\Http\Controllers\QuarterController::class, 'updateStatus'])->name('quarters.status');
    Route::delete('/quarters/{id}', [App\Http\Controllers\QuarterController::class, 'destroy'])->name('quarters.destroy');
    
    // Module Management Routes (top-level collection)
    Route::get('/modules', [App\Http\Controllers\ModuleController::class, 'index'])->name('modules.index');
    Route::post('/modules', [App\Http\Controllers\ModuleController::class, 'store'])->name('modules.store');
    Route::get('/modules/quarter/{quarterId}', [App\Http\Controllers\ModuleController::class, 'getByQuarter'])->name('modules.byQuarter');
    Route::get('/modules/{id}', [App\Http\Controllers\ModuleController::class, 'show'])->name('modules.show');
    Route::get('/modules/{id}/lessons/count', [App\Http\Controllers\ModuleController::class, 'getLessonsCount'])->name('modules.lessons.count');
    Route::put('/modules/{id}', [App\Http\Controllers\ModuleController::class, 'update'])->name('modules.update');
    Route::patch('/modules/{id}/status', [App\Http\Controllers\ModuleController::class, 'updateStatus'])->name('modules.status');
    Route::delete('/modules/{id}', [App\Http\Controllers\ModuleController::class, 'destroy'])->name('modules.destroy');
    
    // Lessons API
    Route::get('/modules/{moduleId}/lessons', [LessonController::class, 'getByModule'])->name('modules.lessons.index');
    Route::get('/lessons/{id}', [LessonController::class, 'show'])->name('lessons.show');
    Route::post('/lessons', [LessonController::class, 'store'])->name('lessons.store');
    Route::put('/lessons/{id}', [LessonController::class, 'update'])->name('lessons.update');
    Route::delete('/lessons/{id}', [LessonController::class, 'destroy'])->name('lessons.destroy');
});

// Removed: head pending modules & lessons endpoints
