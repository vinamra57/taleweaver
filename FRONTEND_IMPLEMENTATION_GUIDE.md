# TaleWeaver Frontend Implementation Guide

## Overview

The backend now has a **simple authentication system** with:
- **Email/Password** signup and login
- **User profiles** and **child profiles**
- **Story history** and **sharing**
- **Change password** (when logged in)
- **JWT-based** authentication

All story generation endpoints work **with or without** authentication:
- **Without auth**: Stories work as before (anonymous)
- **With auth**: Stories can be saved to user account

---

## Backend Setup

### 1. Set JWT Secret

```bash
cd worker

# Generate JWT secret
echo "JWT_SECRET=$(openssl rand -base64 64)" >> .dev.vars
```

### 2. Run Locally

```bash
npm run dev
```

The API will be available at `http://localhost:8787`

---

## Authentication Flow

### Signup Flow
```
1. User fills form (name, email, password, confirm password)
2. Frontend → POST /api/auth/signup
3. Backend validates, creates user, returns JWT tokens
4. Frontend stores tokens and redirects to dashboard
```

### Login Flow
```
1. User fills form (email, password)
2. Frontend → POST /api/auth/login
3. Backend validates, returns JWT tokens
4. Frontend stores tokens and redirects to dashboard
```

### Authenticated Requests
```
1. Frontend includes: Authorization: Bearer <access_token>
2. Backend validates JWT and processes request
```

---

## API Endpoints

### Authentication

#### POST `/api/auth/signup`
Create new account

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "MyPassword123!",
  "confirm_password": "MyPassword123!"
}
```

**Password Requirements:**
- At least 8 characters
- Contains uppercase letter
- Contains lowercase letter
- Contains number
- Contains special character

**Response:** `201 Created`
```json
{
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "created_at": "2025-01-18T...",
    "updated_at": "2025-01-18T..."
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `400` - Validation error (passwords don't match, weak password, etc.)
- `409` - Email already exists

---

#### POST `/api/auth/login`
Login with email/password

**Request:**
```json
{
  "email": "john@example.com",
  "password": "MyPassword123!"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "created_at": "2025-01-18T...",
    "updated_at": "2025-01-18T..."
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `401` - Invalid credentials

---

#### POST `/api/auth/change-password`
Change password (requires authentication)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "current_password": "MyPassword123!",
  "new_password": "NewPassword456!",
  "confirm_new_password": "NewPassword456!"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password changed successfully"
}
```

**Errors:**
- `401` - Not authenticated or invalid current password
- `400` - Validation error (passwords don't match, weak password)

---

### User Profile

#### GET `/api/user/me`
Get current user (requires auth)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "created_at": "2025-01-18T...",
    "updated_at": "2025-01-18T..."
  }
}
```

---

#### PATCH `/api/user/me`
Update user profile (requires auth)

**Request:**
```json
{
  "name": "John Smith"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Smith",
    "created_at": "2025-01-18T...",
    "updated_at": "2025-01-18T..."
  }
}
```

---

### Child Profiles

#### GET `/api/profiles`
List child profiles (requires auth)

**Response:** `200 OK`
```json
{
  "profiles": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Emma",
      "gender": "female",
      "age_range": "7-9",
      "interests": "cats, reading, space",
      "context": "loves her cat Mittens",
      "created_at": "2025-01-18T...",
      "updated_at": "2025-01-18T..."
    }
  ]
}
```

---

#### POST `/api/profiles`
Create child profile (requires auth)

**Request:**
```json
{
  "name": "Emma",
  "gender": "female",
  "age_range": "7-9",
  "interests": "cats, reading, space",
  "context": "loves her cat Mittens"
}
```

**Response:** `201 Created`
```json
{
  "profile": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Emma",
    "gender": "female",
    "age_range": "7-9",
    "interests": "cats, reading, space",
    "context": "loves her cat Mittens",
    "created_at": "2025-01-18T...",
    "updated_at": "2025-01-18T..."
  }
}
```

---

#### PATCH `/api/profiles/:id`
Update profile (requires auth)

**Request:**
```json
{
  "interests": "cats, reading, space, dinosaurs"
}
```

**Response:** `200 OK`

---

#### DELETE `/api/profiles/:id`
Delete profile (requires auth)

**Response:** `200 OK`
```json
{
  "message": "Profile deleted successfully"
}
```

---

### Story History

#### GET `/api/stories`
List saved stories (requires auth)

**Response:** `200 OK`
```json
{
  "stories": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "session_id": "uuid",
      "title": "Emma's Space Adventure",
      "child_name": "Emma",
      "moral_focus": "kindness",
      "interactive": true,
      "is_shared": false,
      "created_at": "2025-01-18T...",
      "last_played_at": "2025-01-18T..."
    }
  ]
}
```

---

#### POST `/api/stories/save`
Save a story (requires auth)

**Request:**
```json
{
  "session_id": "uuid",
  "title": "Emma's Space Adventure"
}
```

**Response:** `201 Created`

---

#### POST `/api/stories/:id/share`
Generate share link (requires auth)

**Response:** `200 OK`
```json
{
  "share_id": "abc123XYZ",
  "share_url": "http://localhost:8787/api/stories/shared/abc123XYZ",
  "story": { ... }
}
```

---

#### GET `/api/stories/shared/:shareId`
Get shared story (public, no auth)

**Response:** `200 OK`
```json
{
  "story": {
    "title": "Emma's Space Adventure",
    "child_name": "Emma",
    "moral_focus": "kindness",
    "interactive": true,
    "created_at": "2025-01-18T..."
  },
  "session": { ... }
}
```

---

## Frontend Implementation

### 1. Create Auth Context

`src/contexts/AuthContext.tsx`:

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = 'http://localhost:8787';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setAccessToken(token);
      fetchUser(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUser = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/api/user/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Token invalid, clear it
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setAccessToken(null);
      }
    } catch (error) {
      console.error('Failed to fetch user', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    confirmPassword: string
  ) => {
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, confirm_password: confirmPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Signup failed');
    }

    const data = await response.json();
    setUser(data.user);
    setAccessToken(data.access_token);
    localStorage.setItem('access_token', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    setUser(data.user);
    setAccessToken(data.access_token);
    localStorage.setItem('access_token', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token);
    }
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

### 2. Wrap App with AuthProvider

`src/App.tsx`:

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Home } from './pages/Home';
import { Signup } from './pages/Signup';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Create } from './pages/Create';
import { Play } from './pages/Play';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/create" element={<Create />} />
          <Route path="/play" element={<Play />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
```

---

### 3. Create Protected Route

`src/components/ProtectedRoute.tsx`:

```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-bedtime-purple">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
```

---

### 4. Create Signup Page

`src/pages/Signup.tsx`:

```typescript
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signup(name, email, password, confirmPassword);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container-bedtime min-h-screen flex items-center justify-center">
      <div className="bedtime-card max-w-md w-full">
        <h1 className="text-4xl text-bedtime-purple font-display font-semibold mb-6 text-center">
          Create Account
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-bedtime-purple-dark font-body mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-bedtime-purple/30 rounded-lg focus:outline-none focus:border-bedtime-purple"
              required
            />
          </div>

          <div>
            <label className="block text-bedtime-purple-dark font-body mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-bedtime-purple/30 rounded-lg focus:outline-none focus:border-bedtime-purple"
              required
            />
          </div>

          <div>
            <label className="block text-bedtime-purple-dark font-body mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-bedtime-purple/30 rounded-lg focus:outline-none focus:border-bedtime-purple"
              required
            />
            <p className="text-xs text-bedtime-purple/60 mt-1">
              Min 8 characters, must include uppercase, lowercase, number, and special character
            </p>
          </div>

          <div>
            <label className="block text-bedtime-purple-dark font-body mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-bedtime-purple/30 rounded-lg focus:outline-none focus:border-bedtime-purple"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full"
          >
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-6 text-center text-bedtime-purple-dark font-body">
          Already have an account?{' '}
          <Link to="/login" className="text-bedtime-purple hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
```

---

### 5. Create Login Page

`src/pages/Login.tsx`:

```typescript
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container-bedtime min-h-screen flex items-center justify-center">
      <div className="bedtime-card max-w-md w-full">
        <h1 className="text-4xl text-bedtime-purple font-display font-semibold mb-6 text-center">
          Sign In
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-bedtime-purple-dark font-body mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-bedtime-purple/30 rounded-lg focus:outline-none focus:border-bedtime-purple"
              required
            />
          </div>

          <div>
            <label className="block text-bedtime-purple-dark font-body mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-bedtime-purple/30 rounded-lg focus:outline-none focus:border-bedtime-purple"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-bedtime-purple-dark font-body">
          Don't have an account?{' '}
          <Link to="/signup" className="text-bedtime-purple hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};
```

---

### 6. Create Dashboard

`src/pages/Dashboard.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface SavedStory {
  id: string;
  title: string;
  child_name: string;
  moral_focus: string;
  interactive: boolean;
  is_shared: boolean;
  created_at: string;
}

export const Dashboard: React.FC = () => {
  const { user, accessToken, logout } = useAuth();
  const [stories, setStories] = useState<SavedStory[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const response = await fetch('http://localhost:8787/api/stories', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStories(data.stories);
      }
    } catch (error) {
      console.error('Failed to fetch stories', error);
    }
  };

  return (
    <div className="container-bedtime min-h-screen">
      <div className="pt-8 pb-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl text-bedtime-purple font-display font-semibold">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-bedtime-purple-dark mt-2">
              {user?.email}
            </p>
          </div>
          <button onClick={logout} className="btn-secondary">
            Sign Out
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => navigate('/create')}
            className="bedtime-card hover:shadow-xl transition-shadow text-left"
          >
            <h3 className="text-2xl text-bedtime-purple font-display font-medium mb-2">
              Create New Story
            </h3>
            <p className="text-bedtime-purple-dark">
              Generate a magical bedtime story
            </p>
          </button>

          <button
            onClick={() => navigate('/profiles')}
            className="bedtime-card hover:shadow-xl transition-shadow text-left"
          >
            <h3 className="text-2xl text-bedtime-purple font-display font-medium mb-2">
              Manage Child Profiles
            </h3>
            <p className="text-bedtime-purple-dark">
              Save profiles for quick story creation
            </p>
          </button>
        </div>

        <div>
          <h2 className="text-3xl text-bedtime-purple font-display font-medium mb-6">
            Your Stories
          </h2>

          {stories.length === 0 ? (
            <p className="text-bedtime-purple-dark">
              No saved stories yet. Create your first story!
            </p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stories.map((story) => (
                <div key={story.id} className="bedtime-card">
                  <h3 className="text-xl text-bedtime-purple font-display font-medium mb-2">
                    {story.title}
                  </h3>
                  <p className="text-sm text-bedtime-purple-dark mb-4">
                    {story.child_name} • {story.moral_focus}
                    {story.interactive && ' • Interactive'}
                  </p>
                  <button
                    onClick={() => navigate(`/play?storyId=${story.id}`)}
                    className="btn-secondary w-full"
                  >
                    Play Story
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

---

### 7. Update Home Page

Add "Sign Up" and "Login" buttons to your existing Home page:

```typescript
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Add auth buttons to header */}
      <div className="container-bedtime pt-4 flex justify-end gap-4">
        {isAuthenticated ? (
          <>
            <span className="text-bedtime-purple">Hello, {user?.name}</span>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-secondary"
            >
              Dashboard
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate('/login')}
              className="btn-secondary"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="btn-primary"
            >
              Sign Up
            </button>
          </>
        )}
      </div>

      {/* Rest of your home page... */}
    </div>
  );
};
```

---

## Testing

### Test Signup
```bash
curl -X POST http://localhost:8787/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Test1234!",
    "confirm_password": "Test1234!"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!"
  }'
```

### Test Protected Route
```bash
# Use token from login response
curl http://localhost:8787/api/user/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Summary

You now have:
- ✅ Simple email/password authentication
- ✅ JWT-based sessions
- ✅ User profiles and child profiles
- ✅ Story history and sharing
- ✅ Change password functionality
- ✅ Complete backend API ready for frontend integration

No OAuth, no email verification, no forgot password - just clean, simple authentication! 🎉
