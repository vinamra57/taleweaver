import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Create } from './pages/Create';
import { Play } from './pages/Play';
import './styles/globals.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<Create />} />
        <Route path="/play" element={<Play />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
