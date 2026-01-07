import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter, Route, Routes } from 'react-router-dom'; 

import Login from "./Pages/login";
import AddDevice from './Pages/addDevice';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<Login />} />
        <Route path="/add-device" element={<AddDevice />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();
