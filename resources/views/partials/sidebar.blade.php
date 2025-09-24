<div class="sidebar" id="sidebar">
    <div class="sidebar-toggle no-select" id="sidebar-toggle">
        <i class="fas fa-chevron-left fa-lg"></i>
    </div>
    <div class="sidebar-header">
        <div class="mb-4">
            <img src="{{ asset('assets/images/physica_logo.png') }}" alt="Physica Logo" class="sidebar-logo">
        </div>
        <h5 class="sidebar-title">Physica</h5>
    </div>
    
    <!-- Add divider here -->
    <div class="sidebar-divider"></div>
    
    <ul class="sidebar-nav">
        <!-- Common Dashboard for all users -->
        <li class="nav-item">
            <a href="{{ route('dashboard') }}" class="sidebar-link {{ request()->routeIs('dashboard') || request()->routeIs('*.dashboard') ? 'active' : '' }}">
                <i class="fas fa-home mr-3"></i> <span>Dashboard</span>
            </a>
        </li>

        @php
            // Fallback to prevent undefined variable errors
            $currentRole = $userRole ?? (Session::has('user') ? Session::get('user.role', 'guest') : 'guest');
        @endphp

        @if(Session::has('user'))
            @if($currentRole == 'Principal')
                <!-- Principal-specific navigation -->
                <li class="nav-item">
                    <a href="{{ route('principal.assign.teachers') }}" class="sidebar-link {{ request()->routeIs('principal.assign.teachers') ? 'active' : '' }}">
                        <i class="fas fa-user-tie mr-3"></i> <span>Assign Teachers</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="{{ route('principal.students_list') }}" class="sidebar-link {{ request()->routeIs('principal.students_list') ? 'active' : '' }}">
                        <i class="fas fa-users mr-3"></i> <span>Students</span>
                    </a>
                </li>
            @elseif($currentRole == 'Head Teacher')
                <!-- Head Teacher-specific navigation (pending workflow removed) -->
            @elseif($currentRole == 'Science Teacher')
                <!-- Science Teacher-specific navigation -->
                <li class="nav-item">
                    <a href="{{ route('science.create_lesson') }}" class="sidebar-link {{ request()->routeIs('science.create_lesson') ? 'active' : '' }}">
                        <i class="fas fa-tasks mr-3"></i> <span>Create Lesson</span>
                    </a>
                </li>
               
            @endif
        @endif
    </ul>
    
    <div class="sidebar-footer">
        <div class="sidebar-role">{{ strtoupper($currentRole) }}</div>
        @if(Session::has('user'))
            <form action="{{ route('logout') }}" method="POST" class="logout-btn">
                @csrf
                <button type="submit" class="sidebar-logout">Log Out</button>
            </form>
        @else
            <a href="{{ route('login') }}" class="sidebar-logout">Log In</a>
        @endif
    </div>
</div>