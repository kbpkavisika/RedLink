import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/home';
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
