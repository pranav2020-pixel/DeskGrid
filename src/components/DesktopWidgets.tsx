import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Filter,
  List,
  Plus,
  Search,
  Box,
  FolderPlus,
  Crop,
  FileText,
  LayoutGrid,
  RefreshCw,
  Move,
  Check,
  Trash2,
  Navigation,
} from 'lucide-react';
import { DesktopBlock, ScheduleEntry } from '../types';

interface WidgetProps {
  block: DesktopBlock;
  isActive: boolean;
  onStartMove: (e: React.MouseEvent, block: DesktopBlock) => void;
  onStartResize: (e: React.MouseEvent, block: DesktopBlock, dir: string) => void;
  schedules: ScheduleEntry[];
  onAddSchedule: (date: string, title: string, time: string) => void;
  onToggleSchedule: (id: string) => void;
  onDeleteSchedule: (id: string) => void;
  weatherCity: string;
  onChangeWeatherCity: (city: string) => void;
  onQuickToolAction: (action: string) => void;
  autoShiftOnOverlap: boolean;
}

export const DesktopWidgetBlock: React.FC<WidgetProps> = ({
  block,
  isActive,
  onStartMove,
  onStartResize,
  schedules,
  onAddSchedule,
  onToggleSchedule,
  onDeleteSchedule,
  weatherCity,
  onChangeWeatherCity,
  onQuickToolAction,
  autoShiftOnOverlap,
}) => {
  // Clock state
  const [now, setNow] = useState(() => new Date());

  // Calendar state
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTime, setTaskTime] = useState('09:00');

  // Weather state
  const [temperature, setTemperature] = useState<number>(20);
  const [isEditingCity, setIsEditingCity] = useState(false);
  const [cityDraft, setCityDraft] = useState(weatherCity || 'New York');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchWeather() {
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            weatherCity || 'New York'
          )}&count=1`
        );
        const geoJson = await geoRes.json();
        const loc = geoJson?.results?.[0];
        if (!loc) return;
        const wRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true`
        );
        const wJson = await wRes.json();
        const temp = wJson?.current_weather?.temperature;
        if (!cancelled && typeof temp === 'number') {
          setTemperature(Math.round(temp));
        }
      } catch (_) {
        // Fallback to 18°C if offline
      }
    }
    fetchWeather();
    return () => {
      cancelled = true;
    };
  }, [weatherCity]);

  const handleWidgetMouseDown = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).closest('input')
    ) {
      return;
    }
    onStartMove(e, block);
  };

  const renderResizeHandles = () => {
    if (block.locked) return null;
    return (
      <>
        <div className="resize-handle dir-n" onMouseDown={(e) => onStartResize(e, block, 'n')} />
        <div className="resize-handle dir-s" onMouseDown={(e) => onStartResize(e, block, 's')} />
        <div className="resize-handle dir-e" onMouseDown={(e) => onStartResize(e, block, 'e')} />
        <div className="resize-handle dir-w" onMouseDown={(e) => onStartResize(e, block, 'w')} />
        <div className="resize-handle dir-se" onMouseDown={(e) => onStartResize(e, block, 'se')} />
      </>
    );
  };

  // 1. CALENDAR & SCHEDULE WIDGET
  if (block.kind === 'widget-calendar') {
    const yearMonth = `${selectedDate.getFullYear()}-${String(
      selectedDate.getMonth() + 1
    ).padStart(2, '0')}`;
    const isoDate = `${yearMonth}-${String(selectedDate.getDate()).padStart(2, '0')}`;

    // Build week days (Sun..Sat) around selectedDate
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayTasks = schedules.filter((s) => s.date === isoDate);

    return (
      <div
        className={`desktop-widget calendar-widget ${isActive ? 'is-active-dragging' : ''}`}
        style={{
          left: block.x,
          top: block.y,
          width: block.width,
          height: block.height,
          zIndex: isActive ? 999 : block.zIndex,
        }}
        onMouseDown={handleWidgetMouseDown}
      >
        <div className="cal-top-bar">
          <div className="cal-nav-group">
            <button
              type="button"
              className="cal-nav-btn"
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 7);
                setSelectedDate(d);
              }}
              title="Previous Week"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              className="cal-nav-dot"
              onClick={() => setSelectedDate(new Date())}
              title="Jump to Today"
            >
              •
            </button>
            <button
              type="button"
              className="cal-nav-btn"
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 7);
                setSelectedDate(d);
              }}
              title="Next Week"
            >
              <ChevronRight size={13} />
            </button>
            <span className="cal-month-text">{yearMonth}</span>
          </div>
          <div className="cal-orb-badge" />
        </div>

        {/* Week strip */}
        <div className="cal-week-grid">
          {weekDays.map((d, idx) => {
            const isSelected = d.toDateString() === selectedDate.toDateString();
            return (
              <button
                key={idx}
                type="button"
                className={`cal-day-cell ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedDate(d)}
              >
                <span className="cal-day-name">{dayLabels[idx]}</span>
                <span className="cal-day-num">{d.getDate()}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Date Sub-bar */}
        <div className="cal-date-subbar">
          <span>{isoDate}</span>
          <div className="cal-sub-icons">
            <CalendarIcon size={12} />
            <Filter size={12} />
            <List size={12} />
          </div>
        </div>

        {/* Schedule List or Add Form */}
        <div className="cal-schedule-body">
          {isAddingTask ? (
            <form
              className="cal-add-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (taskTitle.trim()) {
                  onAddSchedule(isoDate, taskTitle.trim(), taskTime);
                  setTaskTitle('');
                  setIsAddingTask(false);
                }
              }}
            >
              <input
                type="text"
                placeholder="Schedule title..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                autoFocus
              />
              <div className="cal-form-row">
                <input
                  type="time"
                  value={taskTime}
                  onChange={(e) => setTaskTime(e.target.value)}
                />
                <button type="submit" className="cal-save-btn">
                  Add
                </button>
                <button
                  type="button"
                  className="cal-cancel-btn"
                  onClick={() => setIsAddingTask(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : dayTasks.length === 0 ? (
            <div className="cal-empty-msg">
              <p>No schedule.</p>
              <p>Click &ldquo;+&rdquo; to add a new schedule.</p>
            </div>
          ) : (
            <div className="cal-task-list">
              {dayTasks.map((t) => (
                <div
                  key={t.id}
                  className={`cal-task-item ${t.completed ? 'done' : ''}`}
                >
                  <button
                    type="button"
                    className="cal-check-btn"
                    onClick={() => onToggleSchedule(t.id)}
                  >
                    {t.completed && <Check size={10} />}
                  </button>
                  <div className="cal-task-info">
                    <span className="cal-task-time">{t.time}</span>
                    <span className="cal-task-title">{t.title}</span>
                  </div>
                  <button
                    type="button"
                    className="cal-del-btn"
                    onClick={() => onDeleteSchedule(t.id)}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="cal-fab-plus"
          title="Add Schedule"
          onClick={() => setIsAddingTask((v) => !v)}
        >
          <Plus size={18} />
        </button>

        {renderResizeHandles()}
      </div>
    );
  }

  // 2. QUICK TOOLS 2x4 WIDGET
  if (block.kind === 'widget-tools') {
    const tools = [
      { id: 'search', icon: <Search size={16} />, label: 'Search Desktop' },
      { id: 'add-drawer', icon: <Box size={16} />, label: 'New Drawer' },
      { id: 'add-portal', icon: <FolderPlus size={16} />, label: 'Add Folder Portal' },
      { id: 'rescan', icon: <RefreshCw size={16} />, label: 'Sync Windows Desktop' },
      { id: 'snip', icon: <Crop size={16} />, label: 'Windows Screen Snip' },
      { id: 'toggle-shift', icon: <Move size={16} />, label: `Auto-Shift Mode (${autoShiftOnOverlap ? 'ON' : 'OFF'})`, active: autoShiftOnOverlap },
      { id: 'export', icon: <FileText size={16} />, label: 'Reset to Default Layout' },
      { id: 'auto-align', icon: <LayoutGrid size={16} />, label: 'Auto-Level & Snap All' },
    ];

    return (
      <div
        className={`desktop-widget tools-widget ${isActive ? 'is-active-dragging' : ''}`}
        style={{
          left: block.x,
          top: block.y,
          width: block.width,
          height: block.height,
          zIndex: isActive ? 999 : block.zIndex,
        }}
        onMouseDown={handleWidgetMouseDown}
      >
        <div className="tools-2x4-grid">
          {tools.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tool-cell-btn ${t.active ? 'active-tool' : ''}`}
              title={t.label}
              onClick={() => onQuickToolAction(t.id)}
            >
              {t.icon}
            </button>
          ))}
        </div>
        {renderResizeHandles()}
      </div>
    );
  }

  // 3. DIGITAL CLOCK WIDGET
  if (block.kind === 'widget-clock') {
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return (
      <div
        className={`desktop-widget clock-widget ${isActive ? 'is-active-dragging' : ''}`}
        style={{
          left: block.x,
          top: block.y,
          width: block.width,
          height: block.height,
          zIndex: isActive ? 999 : block.zIndex,
        }}
        onMouseDown={handleWidgetMouseDown}
      >
        <div className="clock-time-display">
          {hh}:{mm}
        </div>
        {renderResizeHandles()}
      </div>
    );
  }

  // 4. WEATHER CARD WIDGET
  return (
    <div
      className={`desktop-widget weather-widget ${isActive ? 'is-active-dragging' : ''}`}
      style={{
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        zIndex: isActive ? 999 : block.zIndex,
      }}
      onMouseDown={handleWidgetMouseDown}
    >
      <div className="weather-top-icon">
        <svg width="32" height="24" viewBox="0 0 36 28" fill="none">
          <circle cx="13" cy="11" r="6" fill="#FACC15" />
          <path
            d="M13 22H27C30.3 22 33 19.5 33 16.5C33 13.7 30.7 11.4 27.8 11.1C26.8 7.6 23.5 5 19.5 5C14.8 5 11 8.8 11 13.5C11 13.9 11 14.3 11.1 14.7C8.8 15.3 7 17.4 7 20C7 21.1 9.7 22 13 22Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>
      <div className="weather-temp-row">
        <span className="weather-deg">{temperature}</span>
        <span className="weather-unit">°C</span>
      </div>
      {isEditingCity ? (
        <input
          type="text"
          className="weather-city-input"
          value={cityDraft}
          onChange={(e) => setCityDraft(e.target.value)}
          onBlur={() => {
            setIsEditingCity(false);
            if (cityDraft.trim()) onChangeWeatherCity(cityDraft.trim());
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setIsEditingCity(false);
              if (cityDraft.trim()) onChangeWeatherCity(cityDraft.trim());
            }
          }}
          autoFocus
        />
      ) : (
        <button
          type="button"
          className="weather-city-btn"
          title="Click to change city"
          onClick={() => setIsEditingCity(true)}
        >
          <span>{weatherCity}</span>
          <Navigation size={9} />
        </button>
      )}
      {renderResizeHandles()}
    </div>
  );
};
