import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { Create } from './pages/Create';
import { Play } from './pages/Play';
import { Signup } from './pages/Signup';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Profiles } from './pages/Profiles';
import { CreateSong } from './pages/CreateSong';
import { PlaySong } from './pages/PlaySong';
import './styles/globals.css';

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

          <Route path="/profiles" element={
            <ProtectedRoute>
              <Profiles />
            </ProtectedRoute>
          } />

          <Route path="/create" element={<Create />} />
          <Route path="/play" element={<Play />} />
          <Route path="/create-song" element={<CreateSong />} />
          <Route path="/play-song" element={<PlaySong />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
