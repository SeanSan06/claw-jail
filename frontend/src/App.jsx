import { Routes, Route } from 'react-router-dom'
// import { useState, useEffect } from 'react'; 

// import NavBar from './components/NavBar';

import HomePage from './pages/HomePage';

import './styles/styles.css'
import './styles/home-page.css';
import './styles/specific-components/nav-bar.css';
import './styles/specific-components/live-activity-log.css';
import './styles/specific-components/whisper-flow-chat.css';
import './styles/specific-components/security-mode-selected.css';


// Defines what Page Component appears for each of the webpages 
// based on the current path
function App() {
    return (
    <div>
        <Routes>
            <Route path="/" element={<HomePage />} />
        </Routes>
    </div>
    )
}

export default App