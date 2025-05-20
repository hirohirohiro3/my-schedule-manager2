import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
// lucide-react からアイコンをインポート
// Search アイコンを追加
import { PlusCircle, Trash2, ChevronLeft, ChevronRight, CalendarDays, Clock, User, FileText, X, Ban, CheckCircle2, Briefcase, Download, Image as ImageIcon, AlertTriangle, Coffee, Zap, Calendar as CalendarIcon, Columns, Search } from 'lucide-react';
// 注意: html2canvas はグローバルに読み込まれている必要があります。
// 例: HTMLファイルの <head> 内に以下のスクリプトタグを追加します。
// <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

// Appointment Context
const AppointmentContext = createContext();

// 新しいカラースキームに合わせた予定の種類
const scheduleTypes = {
  counseling: { label: 'カウンセリング', color: 'pink', icon: <User className="w-4 h-4 mr-1.5" /> }, // ピンク系
  work: { label: '仕事', color: 'purple', icon: <Briefcase className="w-4 h-4 mr-1.5" /> },   // ラベンダー(紫)系
  private: { label: 'プライベート', color: 'red', icon: <Coffee className="w-4 h-4 mr-1.5" /> },  // コーラル(赤系ピンク)
};

const AppointmentProvider = ({ children }) => {
  const [appointments, setAppointments] = useState(() => {
    const localData = localStorage.getItem('appointments');
    return localData ? JSON.parse(localData) : [];
  });
  const [unavailableDates, setUnavailableDates] = useState(() => {
    const localData = localStorage.getItem('unavailableDates');
    return localData ? JSON.parse(localData) : [];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ type: 'form', data: null });
  const [lastSavedAppointment, setLastSavedAppointment] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); 
  const [searchTerm, setSearchTerm] = useState(''); // 検索キーワード用のstate

  useEffect(() => {
    localStorage.setItem('appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('unavailableDates', JSON.stringify(unavailableDates));
  }, [unavailableDates]);

  const addAppointment = (appointment) => {
    const newAppointment = { ...appointment, id: Date.now().toString() };
    setAppointments([...appointments, newAppointment].sort((a,b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)));
    setLastSavedAppointment(newAppointment);
    setModalContent({ type: 'confirmation', data: newAppointment });
    setIsModalOpen(true);
  };

  const updateAppointment = (updatedAppointment) => {
    setAppointments(
      appointments.map((app) =>
        app.id === updatedAppointment.id ? updatedAppointment : app
      ).sort((a,b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
    );
    setLastSavedAppointment(updatedAppointment);
    setModalContent({ type: 'confirmation', data: updatedAppointment });
    setIsModalOpen(true);
  };

  const deleteAppointment = (id) => {
    setAppointments(prevAppointments => prevAppointments.filter((app) => app.id !== id));
  };

  const toggleUnavailableDate = (dateString) => {
    setUnavailableDates(prev =>
      prev.includes(dateString)
        ? prev.filter(d => d !== dateString)
        : [...prev, dateString]
    );
  };

  const openModal = (type = 'form', data = null) => {
    let initialData = data;
    if (type === 'form' && !data?.id) { 
      const defaultDate = formatDate(selectedDate);
      const defaultHour = data?.hour || "09";
      const defaultMinute = data?.minute || "00";
      initialData = {
        isNew: true,
        date: data?.date || defaultDate,
        hour: defaultHour,
        minute: defaultMinute,
        time: `${defaultHour}:${defaultMinute}`,
        duration: '60', 
        scheduleType: data?.scheduleType || 'counseling', 
        title: '', 
        ...data
      };
    } else if (type === 'form' && data?.id && data.time) { 
        const [hour, minute] = data.time.split(':');
        initialData = {...data, hour, minute, scheduleType: data.scheduleType || 'counseling'};
    }
    setModalContent({ type, data: initialData || data });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };
  
  const showPhotoSaveInfo = () => {
    setModalContent({ type: 'photoSaveInfo', data: lastSavedAppointment });
    setIsModalOpen(true);
  }

  return (
    <AppointmentContext.Provider
      value={{
        appointments, addAppointment, updateAppointment, deleteAppointment,
        isModalOpen, openModal, closeModal, modalContent, setModalContent,
        lastSavedAppointment, setLastSavedAppointment,
        unavailableDates, toggleUnavailableDate,
        selectedDate, setSelectedDate,
        viewMode, setViewMode, 
        searchTerm, setSearchTerm, 
        showPhotoSaveInfo
      }}
    >
      {children}
    </AppointmentContext.Provider>
  );
};

const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  
  if (format === 'MM/DD') return `${month}/${day}`;
  if (format === 'YYYY年M月D日') return `${year}年${d.getMonth() + 1}月${d.getDate()}日`;
  return `${year}-${month}-${day}`;
};


const hourOptions = Array.from({ length: 12 }, (_, i) => (i + 9).toString().padStart(2, '0')); 
const minuteOptions = ['00', '30']; 

// Month View Calendar
const MonthViewCalendar = () => {
  const { appointments, unavailableDates, selectedDate, setSelectedDate, searchTerm, setSearchTerm } = useContext(AppointmentContext); 
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  useEffect(() => {
    // selectedDate が変わったら、カレンダーの表示月も合わせる (検索後に日付セルをクリックした場合など)
    if (selectedDate.getMonth() !== currentMonthDate.getMonth() || selectedDate.getFullYear() !== currentMonthDate.getFullYear()) {
      setCurrentMonthDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [selectedDate]);


  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const changeMonth = (offset) => {
    const newMonthDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + offset, 1);
    setCurrentMonthDate(newMonthDate);
    setSelectedDate(newMonthDate); // ★修正点: selectedDateも新しい月の1日に更新
    setSearchTerm(''); 
  };

  const handleDateClick = (day) => {
    const newSelectedDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), day);
    setSelectedDate(newSelectedDate);
    // setSearchTerm(''); // 日付クリック時は検索をリセットしない（ユーザーの意図による）
  };

  const renderCalendarDays = () => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const numDays = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);
    const daysArray = [];

    for (let i = 0; i < firstDay; i++) {
      daysArray.push(<div key={`empty-${i}`} className="border border-rose-100 p-1 h-20 sm:p-2 sm:h-24 md:h-28 bg-rose-50"></div>);
    }

    for (let day = 1; day <= numDays; day++) {
      const dateObj = new Date(year, month, day);
      const dateStr = formatDate(dateObj);
      const dayAppointments = appointments.filter(app => {
        const matchDate = app.date === dateStr;
        if (!searchTerm) return matchDate;
        const searchTermLower = searchTerm.toLowerCase();
        const titleMatch = (app.title || '').toLowerCase().includes(searchTermLower);
        const clientNameMatch = (app.clientName || '').toLowerCase().includes(searchTermLower);
        const notesMatch = (app.notes || '').toLowerCase().includes(searchTermLower);
        return matchDate && (titleMatch || clientNameMatch || notesMatch);
      });
      const isTodayDate = dateStr === formatDate(today);
      const isSelectedDate = dateStr === formatDate(selectedDate);
      const isUnavailable = unavailableDates.includes(dateStr);
      
      let dotColorClass = '';
      if (dayAppointments.length > 0) {
          const typesToday = new Set(dayAppointments.map(a => a.scheduleType || 'counseling'));
          if (typesToday.has('counseling')) dotColorClass = `bg-${scheduleTypes.counseling.color}-500`;
          else if (typesToday.has('work')) dotColorClass = `bg-${scheduleTypes.work.color}-500`;
          else if (typesToday.has('private')) dotColorClass = `bg-${scheduleTypes.private.color}-500`;
          else dotColorClass = 'bg-gray-400';
      }

      daysArray.push(
        <div
          key={day}
          className={`border border-rose-100 p-1 h-20 sm:p-2 sm:h-24 md:h-28 cursor-pointer transition-all duration-150 ease-in-out relative
            ${isUnavailable ? 'bg-gray-200 text-gray-400 line-through hover:bg-gray-300' : 'hover:bg-pink-50'}
            ${isSelectedDate && !isUnavailable ? 'bg-pink-200 ring-2 ring-pink-500 shadow-md' : ''}
            ${isSelectedDate && isUnavailable ? 'bg-gray-300 ring-2 ring-gray-500 shadow-md' : ''}
            ${isTodayDate && !isUnavailable ? 'font-bold text-rose-600 bg-rose-100' : ''}
            ${isTodayDate && isUnavailable ? 'font-bold text-gray-500' : ''}
            ${searchTerm && dayAppointments.length > 0 ? 'ring-2 ring-yellow-500 bg-yellow-100' : ''}
          `}
          onClick={() => handleDateClick(day)}
        >
          <div className={`text-xs sm:text-sm ${isTodayDate && !isUnavailable ? 'text-rose-700' : 'text-gray-600'}`}>{day}</div>
          {dotColorClass && (
            <div className={`absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${dotColorClass}`}></div>
          )}
          <div className="mt-0.5 sm:mt-1 space-y-0.5 overflow-y-auto max-h-10 sm:max-h-12 text-[8px] sm:text-xs">
            {dayAppointments.slice(0,1).map(app => (
              <div key={app.id} className={`p-0.5 rounded truncate ${ 
                scheduleTypes[app.scheduleType || 'counseling']?.color ? 
                `bg-${scheduleTypes[app.scheduleType || 'counseling'].color}-500 text-${scheduleTypes[app.scheduleType || 'counseling'].color}-50` 
                : 'bg-gray-400 text-gray-800' 
              }`}>
                {app.title || app.clientName}
              </div>
            ))}
             {isUnavailable && dayAppointments.length === 0 && <span className="text-slate-500 text-[9px] sm:text-[10px]">(不可)</span>}
          </div>
        </div>
      );
    }
    return daysArray;
  };
  const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <>
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <button onClick={() => changeMonth(-1)} className="p-1.5 sm:p-2 rounded-full hover:bg-pink-100 transition-colors" aria-label="前の月へ">
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500" />
        </button>
        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-rose-700">
          {currentMonthDate.getFullYear()}年 {currentMonthDate.toLocaleString('ja-JP', { month: 'long' })}
        </h2>
        <button onClick={() => changeMonth(1)} className="p-1.5 sm:p-2 rounded-full hover:bg-pink-100 transition-colors" aria-label="次の月へ">
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px sm:gap-1 text-center font-medium text-rose-600 mb-1 sm:mb-2 text-xs sm:text-sm md:text-base">
        {dayLabels.map(label => <div key={label}>{label}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px sm:gap-1 border border-rose-100 rounded-md overflow-hidden">{renderCalendarDays()}</div>
    </>
  );
};

// Week View Calendar
const WeekViewCalendar = () => {
  const { appointments, unavailableDates, selectedDate, setSelectedDate, searchTerm, setSearchTerm } = useContext(AppointmentContext); 
  const [currentWeekStartDate, setCurrentWeekStartDate] = useState(() => {
    const today = new Date(selectedDate);
    const dayOfWeek = today.getDay(); 
    const startDate = new Date(today.setDate(today.getDate() - dayOfWeek));
    startDate.setHours(0,0,0,0);
    return startDate;
  });

  useEffect(() => {
    // selectedDate が変わったら、カレンダーの表示週も合わせる
    const currentSelectedWeekStart = new Date(selectedDate);
    currentSelectedWeekStart.setDate(currentSelectedWeekStart.getDate() - currentSelectedWeekStart.getDay());
    currentSelectedWeekStart.setHours(0,0,0,0);
    if (currentSelectedWeekStart.getTime() !== currentWeekStartDate.getTime()){
        setCurrentWeekStartDate(currentSelectedWeekStart);
    }
  }, [selectedDate]);


  const changeWeek = (offset) => {
    const newWeekStartDate = new Date(currentWeekStartDate);
    newWeekStartDate.setDate(newWeekStartDate.getDate() + (offset * 7));
    setCurrentWeekStartDate(newWeekStartDate);
    setSelectedDate(newWeekStartDate); // ★修正点: selectedDateも新しい週の初日に更新
    setSearchTerm(''); 
  };

  const handleDateClick = (date) => {
    setSelectedDate(new Date(date));
    // setSearchTerm(''); 
  };
  
  const today = new Date();
  today.setHours(0,0,0,0);

  const daysOfWeek = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(currentWeekStartDate);
    day.setDate(currentWeekStartDate.getDate() + i);
    daysOfWeek.push(day);
  }
  
  const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <>
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <button onClick={() => changeWeek(-1)} className="p-1.5 sm:p-2 rounded-full hover:bg-pink-100 transition-colors" aria-label="前の週へ">
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500" />
        </button>
        <h2 className="text-base sm:text-lg md:text-xl font-semibold text-rose-700 text-center">
          {formatDate(daysOfWeek[0], 'YYYY年M月D日')} - {formatDate(daysOfWeek[6], 'M月D日')}
        </h2>
        <button onClick={() => changeWeek(1)} className="p-1.5 sm:p-2 rounded-full hover:bg-pink-100 transition-colors" aria-label="次の月へ">
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px sm:gap-1 text-center font-medium text-rose-600 mb-1 sm:mb-2 text-xs sm:text-sm md:text-base">
        {dayLabels.map(label => <div key={label}>{label}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px sm:gap-1 border border-rose-100 rounded-md overflow-hidden">
        {daysOfWeek.map((day, index) => {
          const dateStr = formatDate(day);
          const dayAppointments = appointments.filter(app => {
            const matchDate = app.date === dateStr;
            if (!searchTerm) return matchDate;
            const searchTermLower = searchTerm.toLowerCase();
            const titleMatch = (app.title || '').toLowerCase().includes(searchTermLower);
            const clientNameMatch = (app.clientName || '').toLowerCase().includes(searchTermLower);
            const notesMatch = (app.notes || '').toLowerCase().includes(searchTermLower);
            return matchDate && (titleMatch || clientNameMatch || notesMatch);
          });
          const isTodayDate = dateStr === formatDate(today);
          const isSelectedDate = dateStr === formatDate(selectedDate);
          const isUnavailable = unavailableDates.includes(dateStr);
          
          let dotColorClass = '';
          if (dayAppointments.length > 0) {
              const typesToday = new Set(dayAppointments.map(a => a.scheduleType || 'counseling'));
              if (typesToday.has('counseling')) dotColorClass = `bg-${scheduleTypes.counseling.color}-500`;
              else if (typesToday.has('work')) dotColorClass = `bg-${scheduleTypes.work.color}-500`;
              else if (typesToday.has('private')) dotColorClass = `bg-${scheduleTypes.private.color}-500`;
              else dotColorClass = 'bg-gray-400';
          }

          return (
            <div
              key={index}
              className={`border border-rose-100 p-1 h-24 sm:p-2 sm:h-28 md:h-32 cursor-pointer transition-colors relative
                ${isUnavailable ? 'bg-gray-200 text-gray-400 line-through hover:bg-gray-300' : 'hover:bg-pink-50'}
                ${isSelectedDate && !isUnavailable ? 'bg-pink-200 ring-2 ring-pink-500 shadow-md' : ''}
                ${isSelectedDate && isUnavailable ? 'bg-gray-300 ring-2 ring-gray-500 shadow-md' : ''}
                ${isTodayDate && !isUnavailable ? 'font-bold text-rose-600 bg-rose-100' : ''}
                ${isTodayDate && isUnavailable ? 'font-bold text-gray-500' : ''}
                ${searchTerm && dayAppointments.length > 0 ? 'ring-2 ring-yellow-500 bg-yellow-100' : ''}
              `}
              onClick={() => handleDateClick(day)}
            >
              <div className={`text-xs sm:text-sm ${isTodayDate && !isUnavailable ? 'text-rose-700' : 'text-gray-600'}`}>{day.getDate()}</div>
              {dotColorClass && (
                <div className={`absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${dotColorClass}`}></div>
              )}
              <div className="mt-0.5 sm:mt-1 space-y-0.5 overflow-y-auto max-h-12 sm:max-h-16 text-[8px] sm:text-xs">
                {dayAppointments.slice(0,2).map(app => ( 
                  <div key={app.id} className={`p-0.5 rounded truncate ${ 
                    scheduleTypes[app.scheduleType || 'counseling']?.color ? 
                    `bg-${scheduleTypes[app.scheduleType || 'counseling'].color}-500 text-${scheduleTypes[app.scheduleType || 'counseling'].color}-50`
                    : 'bg-gray-400 text-gray-800'
                  }`}>
                    {app.title || app.clientName}
                  </div>
                ))}
                {isUnavailable && dayAppointments.length === 0 && <span className="text-slate-500 text-[9px] sm:text-[10px]">(不可)</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};


// Main Calendar Container
const Calendar = () => {
  const { viewMode, setViewMode, openModal, selectedDate, unavailableDates, searchTerm, setSearchTerm } = useContext(AppointmentContext);

  return (
    <div className="bg-white p-2 sm:p-4 md:p-6 rounded-lg shadow-xl w-full max-w-5xl mx-auto border border-rose-200">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-3 sm:mb-4 space-y-2 sm:space-y-0">
        <div className="relative w-full sm:w-auto">
          <input
            type="text"
            placeholder="予定を検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 p-2 pl-8 border border-rose-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 text-xs sm:text-sm"
          />
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
        <div className="space-x-1 sm:space-x-2">
          <button
            onClick={() => setViewMode('month')}
            className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs md:text-sm font-medium transition-colors shadow-sm
              ${viewMode === 'month' ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-pink-100 text-rose-700 hover:bg-pink-200'}`}
          >
            <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-1.5" />月表示
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs md:text-sm font-medium transition-colors shadow-sm
            ${viewMode === 'week' ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-pink-100 text-rose-700 hover:bg-pink-200'}`}
          >
            <Columns className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-1.5" />週表示
          </button>
        </div>
      </div>

      {viewMode === 'month' ? <MonthViewCalendar /> : <WeekViewCalendar />}
      
      <div className="mt-4 sm:mt-6 text-center">
        <button
          onClick={() => {
            const formattedCurrentSelectedDate = formatDate(selectedDate);
            if (unavailableDates.includes(formattedCurrentSelectedDate)) {
              alert('この日は予約不可日です。予定を追加するには、まず予約可能日に変更してください。');
              return;
            }
            openModal('form', { date: formattedCurrentSelectedDate });
          }}
          className="bg-rose-500 hover:bg-rose-600 text-white font-semibold py-2 px-3 sm:py-2.5 sm:px-5 md:px-6 rounded-lg shadow-md transition-transform transform hover:scale-105 flex items-center justify-center mx-auto text-xs sm:text-sm md:text-base"
        >
          <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
          <span>新しい予定を追加</span>
        </button>
      </div>
      <AppointmentList />
    </div>
  );
};


// DWS-style Day View (30-min slots)
const AppointmentList = () => {
  const { appointments, openModal, deleteAppointment, unavailableDates, toggleUnavailableDate, selectedDate, searchTerm } = useContext(AppointmentContext); 
  const formattedSelectedDate = formatDate(selectedDate);
  const isSelectedDateUnavailable = unavailableDates.includes(formattedSelectedDate);

  const filteredAppointments = appointments.filter(app => {
    if (!searchTerm) return app.date === formattedSelectedDate; 
    const searchTermLower = searchTerm.toLowerCase();
    const titleMatch = (app.title || '').toLowerCase().includes(searchTermLower);
    const clientNameMatch = (app.clientName || '').toLowerCase().includes(searchTermLower);
    const notesMatch = (app.notes || '').toLowerCase().includes(searchTermLower);
    return titleMatch || clientNameMatch || notesMatch;
  });

  const dailyAppointments = searchTerm ? filteredAppointments : appointments
    .filter(app => app.date === formattedSelectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  const workingHoursStartStr = "09:00";
  const workingHoursEndStr = "18:00";
  const slotIntervalMinutes = 30; 

  const dayStart = new Date(`${formattedSelectedDate}T${workingHoursStartStr}`);
  const dayEnd = new Date(`${formattedSelectedDate}T${workingHoursEndStr}`);
  
  const timeSlots = [];
  if (!isSelectedDateUnavailable && dayStart < dayEnd && !searchTerm) { 
    let slotIteratorTime = new Date(dayStart.getTime());
    const now = new Date();
    const isToday = formatDate(now) === formattedSelectedDate;

    while (slotIteratorTime < dayEnd) {
      const currentSlotStartStr = slotIteratorTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });
      const currentSlotStartObj = new Date(slotIteratorTime.getTime());

      let slotData = {
        time: currentSlotStartStr,
        status: 'available', 
        appointment: null,
        isContinuation: false, 
        durationDisplay: null, 
        onClick: null,
        scheduleType: null,
      };

      if (isToday && currentSlotStartObj < now && !(currentSlotStartObj.getHours() === now.getHours() && currentSlotStartObj.getMinutes() === now.getMinutes())) {
        slotData.status = 'past';
      }

      if (slotData.status !== 'past') {
        let bookedByThisApp = null;
        const appointmentsForSlot = appointments.filter(app => app.date === formattedSelectedDate);
        for (const app of appointmentsForSlot) {
          const appStart = new Date(`${app.date}T${app.time}`);
          const appEnd = new Date(appStart.getTime() + parseInt(app.duration) * 60000);

          if (currentSlotStartObj >= appStart && currentSlotStartObj < appEnd) {
            slotData.status = 'booked';
            slotData.appointment = app;
            slotData.scheduleType = app.scheduleType || 'counseling'; 
            bookedByThisApp = app;
            if (currentSlotStartStr === app.time) {
              slotData.durationDisplay = app.duration;
            } else {
              slotData.isContinuation = true;
            }
            break; 
          }
        }
        if (slotData.status === 'available') {
          const [hour, minute] = currentSlotStartStr.split(':');
          slotData.onClick = () => openModal('form', { date: formattedSelectedDate, hour, minute });
        } else if (slotData.status === 'booked' && bookedByThisApp) {
          slotData.onClick = () => openModal('form', bookedByThisApp);
        }
      }
      timeSlots.push(slotData);
      slotIteratorTime.setMinutes(slotIteratorTime.getMinutes() + slotIntervalMinutes);
    }
  }
  
  return (
    <div className="mt-6 sm:mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-rose-200">
        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-rose-700 mb-2 sm:mb-0">
          {searchTerm ? '検索結果' : `${formatDate(selectedDate, 'YYYY年M月D日')} (${dayLabels[selectedDate.getDay()]}) のスケジュール`}
        </h3>
        {!searchTerm && ( 
          <button
            onClick={() => toggleUnavailableDate(formattedSelectedDate)}
            className={`font-semibold py-1.5 px-3 sm:py-2 sm:px-4 rounded-lg shadow-sm text-xs sm:text-sm flex items-center transition-colors
              ${isSelectedDateUnavailable ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
          >
            {isSelectedDateUnavailable ? <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" /> : <Ban className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />}
            {isSelectedDateUnavailable ? '予約可能にする' : '予約不可にする'}
          </button>
        )}
      </div>

      {searchTerm && dailyAppointments.length === 0 && (
        <div className="p-3 sm:p-4 bg-yellow-100 border border-yellow-300 rounded-lg text-center text-yellow-800 mb-4">
          <p className="font-semibold text-sm sm:text-base">「{searchTerm}」に一致する予定は見つかりませんでした。</p>
        </div>
      )}

      {(searchTerm || !isSelectedDateUnavailable) && dailyAppointments.length > 0 && (
         <div className="mb-4 sm:mb-6">
          <h4 className="text-sm sm:text-md md:text-lg font-semibold text-gray-700 mb-1.5 sm:mb-2">
            {searchTerm ? `「${searchTerm}」の検索結果 (${dailyAppointments.length}件)` : '今日の予定 (クリックで編集)'}
          </h4>
          <ul className="space-y-1.5 sm:space-y-2">
            {dailyAppointments.map(app => {
              const typeInfo = scheduleTypes[app.scheduleType || 'counseling'];
              return (
                <li key={app.id} 
                    onClick={() => openModal('form', app)}
                    className={`p-2 sm:p-3 rounded-lg shadow hover:shadow-md transition-shadow border cursor-pointer 
                                border-${typeInfo.color}-300 hover:border-${typeInfo.color}-500 bg-${typeInfo.color}-50`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      {React.cloneElement(typeInfo.icon, { className: `w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 text-${typeInfo.color}-600` })}
                      <div>
                        <p className={`font-semibold text-${typeInfo.color}-700 text-xs sm:text-sm`}>
                          {searchTerm && <span className="text-gray-500 text-[10px] mr-2">{formatDate(app.date, 'MM/DD')}</span>}
                          {app.title || app.clientName}
                        </p>
                        <p className="text-gray-600 text-[10px] sm:text-xs flex items-center mt-0.5">
                          <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 sm:mr-1.5 text-gray-400" /> {app.time} ({app.duration}分)
                        </p>
                      </div>
                    </div>
                    <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (window.confirm(`${app.title || app.clientName} の予定を削除しますか？`)) { 
                            deleteAppointment(app.id); 
                          }
                        }}
                        className={`p-1 sm:p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors`} aria-label="削除"
                      > <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" /> </button>
                  </div>
                   {app.notes && (
                        <p className="text-gray-500 text-[10px] sm:text-xs mt-1.5 sm:mt-2 border-t border-gray-200 pt-1.5 sm:pt-2 pl-6 sm:pl-7 flex items-start">
                          <FileText className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 sm:mr-1.5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span className="whitespace-pre-wrap break-all">{app.notes}</span>
                        </p>
                      )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      
      {!searchTerm && !isSelectedDateUnavailable && (
        <div className={`mt-4 sm:mt-6 ${dailyAppointments.length > 0 ? 'pt-4 sm:pt-6 border-t border-rose-200' : ''}`}>
          <h4 className="text-sm sm:text-md md:text-lg font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 text-gray-500"/> タイムスケジュール (30分単位)
          </h4>
          {dayStart >= dayEnd ? (
               <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center bg-rose-50 rounded-lg border border-rose-200 shadow-inner" style={{ minHeight: '150px' }}>
                  <Clock className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-rose-400 mb-2 sm:mb-3" />
                  <p className="text-md sm:text-lg font-semibold text-rose-600">稼働時間が正しく設定されていません</p>
                  <p className="text-xs sm:text-sm text-rose-500 mt-1">開始時間と終了時間を確認してください。</p>
              </div>
          ) : timeSlots.length > 0 ? (
            <div className="border border-rose-200 rounded-lg shadow-sm overflow-hidden">
              {timeSlots.map((slot, index) => {
                let bgColor, textColor, iconToShow, slotText, timeTextColor;

                if (slot.status === 'available') {
                  bgColor = 'bg-pink-100 hover:bg-pink-200';
                  textColor = 'text-pink-700'; 
                  iconToShow = <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600 opacity-80"/>;
                  slotText = "(空き)";
                  timeTextColor = 'text-pink-700';
                } else if (slot.status === 'booked') {
                  bgColor = slot.isContinuation ? 'bg-emerald-100' : 'bg-emerald-200 hover:bg-emerald-300';
                  textColor = 'text-emerald-800'; 
                  const typeInfo = scheduleTypes[slot.scheduleType || 'counseling'];
                  iconToShow = !slot.isContinuation ? React.cloneElement(typeInfo.icon, { className: `w-3 h-3 sm:w-4 sm:h-4 ${textColor} opacity-90`}) : null;
                  slotText = slot.isContinuation ? "〃" : `${slot.appointment.title || slot.appointment.clientName} (${slot.durationDisplay}分)`;
                  if (slot.isContinuation) { 
                      textColor = 'text-emerald-600'; 
                  }
                  timeTextColor = 'text-emerald-800'; 
                } else { // past
                  bgColor = 'bg-gray-100';
                  textColor = 'text-gray-400';
                  iconToShow = null;
                  slotText = "(過去)";
                  timeTextColor = 'text-gray-500';
                }

                return (
                  <button
                    key={index}
                    onClick={slot.onClick}
                    disabled={!slot.onClick}
                    className={`w-full flex items-center justify-between p-2 sm:p-3 text-left border-b border-rose-100 last:border-b-0 transition-colors
                      ${bgColor} ${slot.status === 'past' ? 'cursor-not-allowed' : ''}`}
                    title={slot.status === 'available' ? `${slot.time} から予定追加` : (slot.appointment ? `${slot.appointment.title || slot.appointment.clientName} ${slot.time} (${slot.appointment.duration}分)` : '')}
                  >
                    <span className={`text-sm sm:text-base font-medium ${timeTextColor}`}>
                      {slot.time}
                    </span>
                    <div className="flex-grow text-right px-2 sm:px-4">
                        <span className={`text-xs sm:text-base ${textColor} truncate`}>{slotText}</span>
                    </div>
                    {iconToShow}
                  </button>
                );
              })}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center bg-rose-50 rounded-lg border border-rose-200 shadow-inner" style={{ minHeight: `150px` }}>
              <Zap className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-rose-400 mb-3 sm:mb-4" />
              <p className="text-lg sm:text-xl font-semibold text-rose-700">本日は予定がありません</p>
              <p className="text-xs sm:text-sm text-rose-500 mt-1.5 sm:mt-2">新しい予定はカレンダー上部のボタンから追加できます。</p>
            </div>
          )}
        </div>
      )}
      {isSelectedDateUnavailable && !searchTerm && dailyAppointments.length === 0 && (
         <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center bg-rose-50 rounded-lg border border-rose-200 shadow-inner mt-4" style={{ minHeight: `150px` }}>
            <Zap className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-rose-400 mb-3 sm:mb-4" />
            <p className="text-lg sm:text-xl font-semibold text-rose-700">本日は予定がありません</p>
            <p className="text-xs sm:text-sm text-rose-500 mt-1.5 sm:mt-2">予約不可日に設定されています。</p>
          </div>
      )}
    </div>
  );
};
const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];

// Appointment Confirmation Image Component
const AppointmentConfirmationImage = ({ appointment }) => {
  const imageRef = useRef(null);
  const { showPhotoSaveInfo } = useContext(AppointmentContext);

  const downloadImage = () => {
    if (imageRef.current) {
      if (typeof window.html2canvas === 'function') {
        window.html2canvas(imageRef.current, { useCORS: true, backgroundColor: '#ffffff', scale: 2 })
          .then(canvas => {
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            link.download = `予約確認_${appointment.title || appointment.clientName}_${appointment.date}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showPhotoSaveInfo();
          }).catch(err => {
            console.error("画像のエクスポートに失敗しました:", err);
            alert("画像の生成に失敗しました。コンソールを確認してください。");
          });
      } else {
        console.error("html2canvas is not loaded.");
        alert("画像生成ライブラリ(html2canvas)が読み込まれていません。");
      }
    }
  };
  
  if (!appointment) return null;
  const formatDateForDisplay = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    return `${year}年${month}月${day}日`;
  };
  const typeInfo = scheduleTypes[appointment.scheduleType || 'counseling'];

  return (
    <div className="mt-4 sm:mt-6 p-3 sm:p-4 border border-rose-200 rounded-lg bg-white">
        <h3 className="text-md sm:text-lg font-semibold text-rose-700 mb-2 sm:mb-3 flex items-center">
            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 text-purple-500" /> 予定完了メッセージ
        </h3>
        <div ref={imageRef} className={`p-4 sm:p-6 bg-gradient-to-br from-${typeInfo.color}-100 via-${typeInfo.color}-50 to-white rounded-md shadow text-gray-800 w-full max-w-[300px] sm:max-w-[340px] mx-auto border border-${typeInfo.color}-200`}>
            <p className={`text-center text-lg sm:text-xl font-bold mb-1 text-${typeInfo.color}-700`}>{appointment.title || appointment.clientName}</p>
            <p className="text-xs sm:text-sm text-center mb-2 sm:mb-3 text-gray-600">({typeInfo.label}) のご予定、承りました。</p>
            
            <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
                <p className="text-sm sm:text-md font-semibold mb-0.5 sm:mb-1">日時:</p>
                <p className={`text-md sm:text-lg text-center py-1 sm:py-1.5 bg-${typeInfo.color}-50 rounded`}>
                    {formatDateForDisplay(appointment.date)} {appointment.time}
                </p>
            </div>
            <p className="text-[10px] sm:text-xs text-center mt-3 sm:mt-5 text-gray-500">ご確認ありがとうございます。</p>
        </div>
        <button
            onClick={downloadImage}
            className="mt-3 sm:mt-4 w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg shadow-md transition-transform transform hover:scale-105 flex items-center justify-center text-xs sm:text-sm"
        >
            <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            画像をダウンロード (ファイルアプリへ)
        </button>
    </div>
  );
};

// Modal Component
const AppointmentFormModal = () => {
  const { 
    isModalOpen, closeModal, addAppointment, updateAppointment, 
    modalContent, unavailableDates, selectedDate: contextSelectedDate,
    lastSavedAppointment, 
    setLastSavedAppointment 
  } = useContext(AppointmentContext);
  
  const [title, setTitle] = useState(''); 
  const [date, setDate] = useState('');
  const [hour, setHour] = useState(hourOptions[0]);
  const [minute, setMinute] = useState(minuteOptions[0]);
  const [duration, setDuration] = useState('60');
  const [notes, setNotes] = useState('');
  const [scheduleType, setScheduleType] = useState('counseling'); 

  useEffect(() => {
    if (isModalOpen && modalContent.type === 'form') {
      const appointmentData = modalContent.data;
      if (appointmentData?.id) { 
        setTitle(appointmentData.title || appointmentData.clientName || '');
        setDate(appointmentData.date);
        const [h, m] = appointmentData.time ? appointmentData.time.split(':') : [hourOptions[0], minuteOptions[0]];
        setHour(h || hourOptions[0]);
        setMinute(m || minuteOptions[0]);
        setDuration(appointmentData.duration?.toString() || '60');
        setNotes(appointmentData.notes || '');
        setScheduleType(appointmentData.scheduleType || 'counseling');
      } else { 
        setTitle('');
        setDate(appointmentData?.date || formatDate(contextSelectedDate));
        setHour(appointmentData?.hour || hourOptions[0]);
        setMinute(appointmentData?.minute || minuteOptions[0]);
        setDuration(appointmentData?.duration?.toString() || '60');
        setNotes('');
        setScheduleType(appointmentData?.scheduleType || 'counseling');
      }
    }
  }, [modalContent, isModalOpen, contextSelectedDate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const combinedTime = `${hour}:${minute}`;
    if (unavailableDates.includes(date) && (!modalContent.data || !modalContent.data.id)) {
        alert('選択された日付は予約不可日です。別の日付を選択するか、予約可能日に変更してください。');
        return;
    }
    
    const appointmentDetails = scheduleType === 'counseling' 
        ? { clientName: title, title: '' } 
        : { title: title, clientName: '' }; 

    const appointmentData = { 
        ...appointmentDetails,
        date, 
        time: combinedTime, 
        duration: parseInt(duration), 
        notes, 
        scheduleType 
    };

    if (modalContent.data && modalContent.data.id) {
      updateAppointment({ ...appointmentData, id: modalContent.data.id });
    } else {
      addAppointment(appointmentData);
    }
  };

  if (!isModalOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-2 sm:p-4 z-50 backdrop-blur-sm">
      <div className="bg-rose-50 p-4 sm:p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-md sm:max-w-lg relative border border-rose-200">
        <button onClick={closeModal} className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1 sm:p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-full transition-colors" aria-label="閉じる">
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        
        {modalContent.type === 'form' && (
          <>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-rose-700 mb-4 sm:mb-6">
              {modalContent.data && modalContent.data.id ? '予定を編集' : '新しい予定'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label htmlFor="scheduleType" className="block text-xs sm:text-sm font-medium text-rose-700 mb-0.5 sm:mb-1">予定の種類</label>
                <select 
                  id="scheduleType" 
                  value={scheduleType} 
                  onChange={(e) => setScheduleType(e.target.value)} 
                  className="w-full p-2 sm:p-2.5 border border-rose-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 bg-white text-xs sm:text-sm"
                >
                  {Object.entries(scheduleTypes).map(([key, value]) => (
                    <option key={key} value={key}>{value.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="title" className="block text-xs sm:text-sm font-medium text-rose-700 mb-0.5 sm:mb-1">
                  {scheduleType === 'counseling' ? 'クライアント名' : 'タイトル/件名'}
                </label>
                <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 sm:p-2.5 border border-rose-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 text-xs sm:text-sm" required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                <div>
                  <label htmlFor="date" className="block text-xs sm:text-sm font-medium text-rose-700 mb-0.5 sm:mb-1">日付</label>
                  <input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2 sm:p-2.5 border border-rose-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 text-xs sm:text-sm" required />
                </div>
                <div className="flex space-x-1.5 sm:space-x-2">
                  <div className="flex-1">
                    <label htmlFor="hour" className="block text-xs sm:text-sm font-medium text-rose-700 mb-0.5 sm:mb-1">時</label>
                    <select id="hour" value={hour} onChange={(e) => setHour(e.target.value)} className="w-full p-2 sm:p-2.5 border border-rose-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 bg-white text-xs sm:text-sm">
                      {hourOptions.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label htmlFor="minute" className="block text-xs sm:text-sm font-medium text-rose-700 mb-0.5 sm:mb-1">分</label>
                    <select id="minute" value={minute} onChange={(e) => setMinute(e.target.value)} className="w-full p-2 sm:p-2.5 border border-rose-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 bg-white text-xs sm:text-sm">
                      {minuteOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="duration" className="block text-xs sm:text-sm font-medium text-rose-700 mb-0.5 sm:mb-1">所要時間（分）</label>
                <select id="duration" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full p-2 sm:p-2.5 border border-rose-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 bg-white text-xs sm:text-sm">
                  {[30, 60, 90, 120, 150, 180].map(d => <option key={d} value={d.toString()}>{d}分</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="notes" className="block text-xs sm:text-sm font-medium text-rose-700 mb-0.5 sm:mb-1">メモ (任意)</label>
                <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows="2" className="w-full p-2 sm:p-2.5 border border-rose-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 text-xs sm:text-sm"></textarea>
              </div>
              <div className="flex justify-end space-x-2 sm:space-x-3 pt-1 sm:pt-2">
                <button type="button" onClick={closeModal} className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-md border border-rose-300 transition-colors">
                  キャンセル
                </button>
                <button type="submit" className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-md shadow-sm transition-colors">
                  {modalContent.data && modalContent.data.id ? '更新して確認へ' : '保存して確認へ'}
                </button>
              </div>
            </form>
          </>
        )}

        {modalContent.type === 'confirmation' && lastSavedAppointment && (
          <>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-rose-700 mb-3 sm:mb-4 text-center">
              予定を保存しました！
            </h2>
            <AppointmentConfirmationImage appointment={lastSavedAppointment} />
            <div className="mt-4 sm:mt-6 flex flex-col items-center space-y-2 sm:space-y-3">
              <button type="button" onClick={() => { setLastSavedAppointment(null); closeModal();}} className="w-full max-w-xs px-4 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-md shadow-sm transition-colors">
                閉じる
              </button>
            </div>
          </>
        )}
        
        {modalContent.type === 'photoSaveInfo' && (
          <>
            <h2 className="text-md sm:text-xl md:text-2xl font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 mr-1.5 sm:mr-2 text-orange-500" /> iPadの写真アプリへの保存方法
            </h2>
            <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-700">
                <p>画像はiPadの「ファイル」アプリ内の「ダウンロード」フォルダに保存されました。</p>
                <p>「写真」アプリに保存するには、以下の手順で操作してください：</p>
                <ol className="list-decimal list-inside space-y-0.5 sm:space-y-1 pl-1 sm:pl-2">
                    <li>iPadのホーム画面から「ファイル」アプリを開きます。</li>
                    <li>「ダウンロード」フォルダを開き、先ほどダウンロードした画像ファイル (例: 予約確認_〇〇様_日付.png) を見つけます。</li>
                    <li>画像ファイルを長押しするか、選択して共有アイコン (四角から上矢印が出ているアイコン) をタップします。</li>
                    <li>表示されたメニューから「画像を保存」を選択します。</li>
                </ol>
                <p>これで画像が「写真」アプリに保存されます。</p>
            </div>
            <div className="mt-4 sm:mt-6 flex justify-center">
                <button type="button" onClick={() => { setLastSavedAppointment(null); closeModal(); }} className="px-4 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-md shadow-sm transition-colors">
                    確認しました
                </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Main App Component
export default function App() {
  return (
    <AppointmentProvider>
      <div className="min-h-screen bg-rose-50 py-4 sm:py-8 px-2 sm:px-4 lg:px-8 font-sans text-gray-800">
        <header className="mb-6 sm:mb-10 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-rose-700 flex items-center justify-center">
            <CalendarDays className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 mr-2 sm:mr-3 text-rose-500" /> <span>スケジュール管理</span>
          </h1>
        </header>
        <main>
          <Calendar />
          <AppointmentFormModal />
        </main>
        <footer className="mt-8 sm:mt-12 text-center text-xs sm:text-sm text-rose-500">
          <p>&copy; {new Date().getFullYear()} スケジュール管理アプリ. All rights reserved.</p>
        </footer>
      </div>
    </AppointmentProvider>
  );
}
