import React from 'react';

const Navbar = () => {
  return (
    <header className="bg-[#0b1329] text-white shadow-lg border-b border-slate-800/80 w-full z-30 select-none">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          
          {/* LEFT: University Emblem & Title */}
          <div className="flex items-center space-x-3.5 sm:space-x-4">
            <div className="bg-white rounded-2xl p-1.5 shadow-md flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden ring-1 ring-slate-100/20">
              <img 
                src="/logos/curaj-logo.png"
                alt="CURAJ Emblem" 
                className="h-full w-full object-contain"
                onError={(e) => { 
                  e.target.onerror = null; 
                  e.target.src = "/images/curaj-logo.png"; 
                }}
              />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-white leading-snug">
                Central University of Rajasthan
              </h1>
              <p className="text-[10px] sm:text-[11px] font-extrabold text-sky-400 uppercase tracking-[0.14em] mt-0.5">
                Hostel Mess Feedback Portal
              </p>
            </div>
          </div>

          {/* RIGHT: Accreditations (NAAC, NIRF, NIC) */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* NAAC Badge */}
            <div className="bg-white rounded-xl p-1 shadow-sm flex items-center justify-center h-11 w-14 sm:h-12 sm:w-16 shrink-0 ring-1 ring-white/10 overflow-hidden">
              <img 
                src="/logos/naac.jpeg" 
                alt="NAAC A++" 
                className="max-h-full max-w-full object-contain"
                onError={(e) => { 
                  e.target.onerror = null; 
                  e.target.src = "/logos/naac.png"; 
                }}
              />
            </div>

            {/* NIRF Badge */}
            <div className="bg-white rounded-xl p-1 shadow-sm flex items-center justify-center h-11 w-14 sm:h-12 sm:w-16 shrink-0 ring-1 ring-white/10 overflow-hidden">
              <img 
                src="/logos/nirf.jpeg" 
                alt="NIRF Ranked" 
                className="max-h-full max-w-full object-contain"
                onError={(e) => { 
                  e.target.onerror = null; 
                  e.target.src = "/logos/nirf.png"; 
                }}
              />
            </div>

            {/* NIC Badge */}
            <div className="bg-white rounded-xl p-1 shadow-sm flex items-center justify-center h-11 w-14 sm:h-12 sm:w-16 shrink-0 ring-1 ring-white/10 overflow-hidden">
              <img 
                src="/logos/nic.png" 
                alt="NIC" 
                className="max-h-full max-w-full object-contain"
                onError={(e) => { 
                  e.target.onerror = null; 
                  e.target.src = "/logos/nic.png"; 
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