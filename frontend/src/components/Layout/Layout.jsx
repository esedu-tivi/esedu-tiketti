import React from 'react';
import Header from './Header';
import MobileNavBar from './MobileNavBar';
import FloatingActionButton from './FloatingActionButton';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 pt-0 pb-28 md:pb-8">
        {children}
      </div>
      <FloatingActionButton />
      <MobileNavBar />
    </div>
  );
};

export default Layout; 