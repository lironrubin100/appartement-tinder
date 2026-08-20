import { Search, Globe, Menu, User, Home, Sparkles, Map, Users } from "lucide-react";

export function Header() {
  return (
    <header className="bg-white sticky top-0 z-50">
      <div className="border-b border-gray-200">
        <div className="max-w-[1440px] mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo (renders at the start edge of the locale — right in RTL, left in LTR) */}
          <div className="flex items-center gap-2 text-orange font-bold text-2xl tracking-tight cursor-pointer">
            <Sparkles className="w-8 h-8 fill-current" />
            <span className="hidden md:block">Shutaf</span>
          </div>

          {/* Center: Tabs */}
          <div className="hidden md:flex items-center gap-8 h-full">
            <button className="flex items-center gap-2 text-gray-900 font-semibold border-b-2 border-black h-full px-2">
              <span className="text-sm">הכול</span>
              <Globe className="w-5 h-5 text-gray-700" />
            </button>
            <button className="flex items-center gap-2 text-gray-500 hover:text-gray-900 hover:border-b-2 hover:border-gray-300 transition-all h-full px-2 border-b-2 border-transparent">
              <span className="text-sm">דירות</span>
              <Home className="w-5 h-5 text-gray-500" />
            </button>
            <button className="flex items-center gap-2 text-gray-500 hover:text-gray-900 hover:border-b-2 hover:border-gray-300 transition-all h-full px-2 border-b-2 border-transparent">
              <span className="text-sm">שותפים</span>
              <Users className="w-5 h-5 text-gray-500" />
            </button>
            <button className="flex items-center gap-2 text-gray-500 hover:text-gray-900 hover:border-b-2 hover:border-gray-300 transition-all h-full px-2 border-b-2 border-transparent">
              <span className="text-sm">מפה</span>
              <Map className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Left Side: Actions */}
          <div className="flex items-center gap-2">
            <button className="hidden md:block text-sm font-semibold hover:bg-gray-100 rounded-full px-4 py-2.5 transition-colors">
              אני רוצה להשכיר
            </button>
            <button className="p-2.5 hover:bg-gray-100 rounded-full transition-colors">
              <Globe className="w-5 h-5 text-gray-700" />
            </button>
            
            <button className="flex items-center gap-3 border border-gray-300 rounded-full py-1.5 px-2 hover:shadow-md transition-shadow bg-white ms-1">
              <Menu className="w-5 h-5 text-gray-600 me-2" />
              <div className="bg-gray-500 text-white rounded-full p-1.5">
                <User className="w-5 h-5" />
              </div>
            </button>
          </div>

        </div>
      </div>

      {/* Bottom Search Pill */}
      <div className="w-full bg-white pb-6 pt-4 px-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border-b border-gray-100">
        <div className="max-w-[850px] mx-auto bg-white border border-gray-200 shadow-md rounded-full flex items-center h-16 divide-x divide-x-reverse divide-gray-200">
          
          <button className="flex-1 px-8 flex flex-col justify-center text-start hover:bg-gray-100 rounded-s-full h-full transition-colors group relative cursor-pointer">
            <span className="text-xs font-bold text-gray-900">איפה</span>
            <span className="text-sm text-gray-500 group-hover:text-gray-700 truncate">חיפוש יעדים</span>
          </button>

          <button className="flex-1 px-8 flex flex-col justify-center text-start hover:bg-gray-100 h-full transition-colors group cursor-pointer">
            <span className="text-xs font-bold text-gray-900">מתי</span>
            <span className="text-sm text-gray-500 group-hover:text-gray-700">הוספת תאריכים</span>
          </button>

          <button className="flex-[1.2] ps-2 pe-8 flex items-center justify-between hover:bg-gray-100 rounded-e-full h-full transition-colors group cursor-pointer">
            <div className="flex flex-col text-start">
              <span className="text-xs font-bold text-gray-900">מי</span>
              <span className="text-sm text-gray-500 group-hover:text-gray-700">הוספת אורחים</span>
            </div>

            <div className="bg-orange hover:bg-orange-dark text-white p-3.5 rounded-full transition-colors flex items-center gap-2">
              <Search className="w-5 h-5" strokeWidth={3} />
            </div>
          </button>

        </div>
      </div>
    </header>
  );
}
