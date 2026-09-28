import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Donors from './pages/Donors';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/donors" element={<Donors />} />
      </Routes>
    </BrowserRouter>
  );
}
