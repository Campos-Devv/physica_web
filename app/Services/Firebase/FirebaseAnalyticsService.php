<?php

namespace App\Services\Firebase;

use Exception;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class FirebaseAnalyticsService extends BaseFirebaseService
{
    /**
     * Get student registration counts by time period
     *
     * @return array
     */
    public function getStudentRegistrationStats()
    {
        if (!$this->firestore) {
            throw new Exception('Firestore is not initialized.');
        }
        
        try {
            // Prepare data structure
            $now = Carbon::now();
            $currentMonth = $now->month;
            $currentYear = $now->year;
            $daysInMonth = $now->daysInMonth;
            
            // Initialize counters
            $hourlyData = array_fill(0, 24, 0);
            $dailyData = array_fill(1, $daysInMonth, 0);
            $monthlyData = array_fill(1, 12, 0);
            
            $todayTotal = 0;
            $monthTotal = 0;
            $yearTotal = 0;
            
            // Check if collection exists and has documents
            try {
                $studentsRef = $this->firestore->database()->collection('student_accounts');
                
                // Verify collection exists by attempting to get documents
                $students = $studentsRef->documents();
                $hasDocuments = false;
                
                // Process each student document
                foreach ($students as $student) {
                    $hasDocuments = true;
                    
                    if (!$student->exists()) {
                        continue;
                    }
                    
                    $data = $student->data();
                    
                    // Skip if no creation timestamp
                    if (!isset($data['created_at'])) {
                        Log::info('Student account missing created_at timestamp', [
                            'id' => $student->id()
                        ]);
                        continue;
                    }
                    
                    // Convert timestamp to Carbon
                    $createdAt = $this->parseTimestamp($data['created_at']);
                    if (!$createdAt) {
                        Log::info('Failed to parse created_at timestamp', [
                            'id' => $student->id(),
                            'created_at' => $data['created_at']
                        ]);
                        continue;
                    }
                    
                    // Increment appropriate counters
                    $createdYear = $createdAt->year;
                    $createdMonth = $createdAt->month;
                    $createdDay = $createdAt->day;
                    $createdHour = $createdAt->hour;
                    
                    // Increment yearly counter (monthly chart)
                    if ($createdYear === $currentYear) {
                        // Make sure index exists before incrementing
                        if (isset($monthlyData[$createdMonth])) {
                            $monthlyData[$createdMonth]++;
                            $yearTotal++;
                        }
                    }
                    
                    // Increment monthly counter (daily chart)
                    if ($createdYear === $currentYear && $createdMonth === $currentMonth) {
                        // Make sure index exists before incrementing
                        if (isset($dailyData[$createdDay])) {
                            $dailyData[$createdDay]++;
                            $monthTotal++;
                        }
                    }
                    
                    // Increment today's counter (hourly chart)
                    if ($createdAt->isToday()) {
                        // Make sure index exists before incrementing
                        if (isset($hourlyData[$createdHour])) {
                            $hourlyData[$createdHour]++;
                            $todayTotal++;
                        }
                    }
                }
                
                // Log if collection is empty
                if (!$hasDocuments) {
                    Log::info('No documents found in student_accounts collection');
                }
                
            } catch (\Google\Cloud\Core\Exception\NotFoundException $e) {
                // Collection doesn't exist
                Log::warning('student_accounts collection does not exist: ' . $e->getMessage());
            }
            
            // Format the data for the chart
            return [
                'today' => [
                    'labels' => $this->getHourLabels(),
                    'values' => array_values($hourlyData),
                    'total' => $todayTotal
                ],
                'daily' => [
                    'labels' => array_map('strval', range(1, $daysInMonth)),
                    'values' => array_values($dailyData),
                    'total' => $monthTotal
                ],
                'monthly' => [
                    'labels' => $this->getMonthLabels(),
                    'values' => array_values($monthlyData),
                    'total' => $yearTotal
                ]
            ];
            
        } catch (Exception $e) {
            Log::error('Error fetching student registration stats: ' . $e->getMessage(), [
                'exception' => $e
            ]);
            return $this->getEmptyChartData();
        }
    }
    
    /**
     * Get empty chart data structure when there's an error
     * 
     * @return array
     */
    public function getEmptyChartData()
    {
        $now = Carbon::now();
        $daysInMonth = $now->daysInMonth;
        
        return [
            'today' => [
                'labels' => $this->getHourLabels(),
                'values' => array_fill(0, 24, 0),
                'total' => 0
            ],
            'daily' => [
                'labels' => array_map('strval', range(1, $daysInMonth)),
                'values' => array_fill(0, $daysInMonth, 0),
                'total' => 0
            ],
            'monthly' => [
                'labels' => $this->getMonthLabels(),
                'values' => array_fill(0, 12, 0),
                'total' => 0
            ]
        ];
    }
    
    /**
     * Get hour labels for chart (12AM-11PM)
     * 
     * @return array
     */
    private function getHourLabels()
    {
        return [
            '12AM', '1AM', '2AM', '3AM', '4AM', '5AM', 
            '6AM', '7AM', '8AM', '9AM', '10AM', '11AM',
            '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', 
            '6PM', '7PM', '8PM', '9PM', '10PM', '11PM'
        ];
    }
    
    /**
     * Get month labels for chart (Jan-Dec)
     * 
     * @return array
     */
    private function getMonthLabels()
    {
        $months = [];
        for ($i = 1; $i <= 12; $i++) {
            $months[] = Carbon::create(null, $i, 1)->format('M');
        }
        return $months;
    }
}