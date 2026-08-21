import React from 'react';

const Navbar = () => {
  return (
    <header className="bg-[#0f172a] text-white shadow-md border-b border-slate-800 w-full z-30">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          
          {/* LEFT: University Logo & Portal Name */}
          <div className="flex items-center space-x-3.5">
            <div className="bg-white p-1.5 rounded-xl shadow-sm flex items-center justify-center h-12 w-12 shrink-0">
              <img 
                src="/logos/curaj-logo.png"
                alt="CURAJ Logo" 
                className="h-full w-full object-contain"
                onError={(e) => { 
                  e.target.onerror = null; 
                  e.target.src = "/images/curaj-logo.png"; 
                }}
              />
            </div>
            <div>
              <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-white leading-tight">
                Central University of Rajasthan
              </h1>
              <p className="text-[10px] sm:text-xs text-sky-400 font-bold uppercase tracking-wider">
                Hostel Mess Feedback Portal
              </p>
            </div>
          </div>

          {/* RIGHT: NAAC, NIRF, and NIC Logos */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* NAAC Badge */}
            <div className="bg-white p-1 rounded-lg shadow-sm flex items-center justify-center h-10 w-12 sm:h-11 sm:w-14 shrink-0">
              <img 
                src="/logos/naac.jpeg" 
                alt="NAAC" 
                className="max-h-full max-w-full object-contain"
                onError={(e) => { 
                  e.target.onerror = null; 
                  e.target.src = "/logos/naac.png"; 
                }}
              />
            </div>

            {/* NIRF Badge */}
            <div className="bg-white p-1 rounded-lg shadow-sm flex items-center justify-center h-10 w-12 sm:h-11 sm:w-14 shrink-0">
              <img 
                src="/logos/nirf.jpeg" 
                alt="NIRF" 
                className="max-h-full max-w-full object-contain"
                onError={(e) => { 
                  e.target.onerror = null; 
                  e.target.src = "/logos/nirf.png"; 
                }}
              />
            </div>

            {/* NIC Badge */}
            <div className="bg-white p-1 rounded-lg shadow-sm flex items-center justify-center h-10 w-12 sm:h-11 sm:w-14 shrink-0">
              <img 
                src="/logos/nic.png" 
                alt="NIC" 
                className="max-h-full max-w-full object-contain"
                onError={(e) => { 
                  e.target.onerror = null; 
                  e.target.src = "/logos/nic.jpeg"; 
                }}
              />
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};

export default Navbar;