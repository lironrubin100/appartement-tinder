import { Header } from "@/components/Header";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden">
      <Header />
      
      {/* Content Area (Placeholder for Map) */}
      <div className="flex-1 relative bg-gray-100 flex items-center justify-center overflow-hidden">
        
        {/* Placeholder Map Background */}
        <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=31.252973,34.791462&zoom=14&size=1920x1080&maptype=roadmap&style=feature:poi|visibility:off&client=gme-airbnbinc&channel=monorail-prod&signature=dummy')] bg-cover bg-center opacity-40"></div>
        
        <div className="relative z-10 flex flex-col items-center justify-center p-8 text-center bg-white/80 backdrop-blur-md rounded-2xl shadow-xl max-w-lg mx-auto border border-white/50">
          <div className="w-16 h-16 bg-orange rounded-full flex items-center justify-center mb-6 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">המפה נטענת...</h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            כאן תופיע המפה עם כל הדירות הפנויות בבאר שבע. כרגע אנחנו מכינים את השטח.
          </p>
          <div className="flex gap-4">
            <button className="px-6 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors shadow-md">
              הצג רשימה
            </button>
            <button className="px-6 py-3 bg-white text-gray-900 border border-gray-200 font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
              סנן תוצאות
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}
