import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { BlockchainProvider } from './contexts/BlockchainContext';
import WalletConnect from './components/WalletConnect';
import Register from './pages/Register';
import Documents from './pages/Documents';

function App() {
  return (
    <BlockchainProvider>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <nav className="bg-white shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex">
                  <div className="flex-shrink-0 flex items-center">
                    <h1 className="text-xl font-bold text-gray-800">CarbonXReserve</h1>
                  </div>
                  <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                    <Link
                      to="/"
                      className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                    >
                      Registration
                    </Link>
                    <Link
                      to="/documents"
                      className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                    >
                      Documents
                    </Link>
                  </div>
                </div>
                <div className="flex items-center">
                  <WalletConnect />
                </div>
              </div>
            </div>
          </nav>

          <Routes>
            <Route path="/" element={<Register />} />
            <Route path="/documents" element={<Documents />} />
          </Routes>
        </div>
      </Router>
    </BlockchainProvider>
  );
}

export default App;
