import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './components/home';
import About from './components/about';
import Login from './components/login';
import Register from './components/register';
import NotFound from './components/notFound';
import './style.css';

function App() {
  return (
    <Router>
      <div className="App">
        <nav>
          <ul className="flex mb-10">
            <li className="mr-5">
              <Link to="/">Главная</Link>
            </li>
            <li className="mr-5">
              <Link to="/about">О нас</Link>
            </li>
            <li className="mr-5">
              <Link to="/login">Логин</Link>
            </li>
            <li className="mr-5">
              <Link to="/register">Регистрация</Link>
            </li>
          </ul>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
