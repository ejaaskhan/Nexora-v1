import React, { useEffect, useState } from 'react';
import { MapPin, Trash2 } from 'lucide-react';
import {
  CalendarEvent,
  CalendarEventColor,
  CreateEventInput,
  TaskCategory,
} from '../../types/productivity';
import { formatMinuteOfDay } from '../../utils/date';
import { DrawerModal } from '../ui/DrawerModal';
import { GlowButton } from '../ui/GlowButton';

interface EventFormModalProps {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
  editingEvent: CalendarEvent | null;
  onSave: (input: CreateEventInput, existingId?: string) => void;
  onDelete?: (id: string) => void;
}

const CATEGORIES: TaskCategory[] = ['Planning', 'Deep Work', 'Admin', 'Personal'];
const DURATION_PRESETS = [30, 45, 60, 90, 120];

export const EVENT_COLORS: Array<{
  key: CalendarEventColor;
  label: string;
  hex: string;
  barClass: string;
  textClass: string;
}> = [
  {
    key: 'cyan',
    label: 'Cyan',
    hex: '#06B6D4',
    barClass: 'bg-cyan-500',
    textClass: 'text-cyan-700 dark:text-cyan-300',
  },
  {
    key: 'violet',
    label: 'Violet',
    hex: '#8B5CF6',
    barClass: 'bg-purple-500',
    textClass: 'text-purple-600 dark:text-purple-300',
  },
  {
    key: 'emerald',
    label: 'Emerald',
    hex: '#10B981',
    barClass: 'bg-emerald-500',
    textClass: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    key: 'amber',
    label: 'Amber',
    hex: '#F59E0B',
    barClass: 'bg-amber-500',
    textClass: 'text-amber-700 dark:text-amber-300',
  },
  {
    key: 'rose',
    label: 'Rose',
    hex: '#F43F5E',
    barClass: 'bg-rose-500',
    textClass: 'text-rose-600 dark:text-rose-300',
  },
];

export const EVENT_COLOR_MAP = EVENT_COLORS.reduce(
  (acc, item) => {
    acc[item.key] = item;
    return acc;
  },
  {} as Record<CalendarEventColor, (typeof EVENT_COLORS)[number]>
);

function parseTimeStringToMinute(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 9 * 60;
  return Math.max(0, Math.min(23 * 60 + 45, h * 60 + m));
}

export const EventFormModal: React.FC<EventFormModalProps> = ({
  open,
  onClose,
  defaultDate,
  editingEvent,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [allDay, setAllDay] = useState(false);
  const [startTimeStr, setStartTimeStr] = useState('10:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [category, setCategory] = useState<TaskCategory>('Planning');
  const [color, setColor] = useState<CalendarEventColor>('cyan');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (editingEvent) {
      setTitle(editingEvent.title);
      setDate(editingEvent.date);
      setAllDay(editingEvent.allDay);
      setStartTimeStr(formatMinuteOfDay(editingEvent.startMinute));
      setDurationMinutes(editingEvent.durationMinutes);
      setCategory(editingEvent.category);
      setColor(editingEvent.color);
      setLocation(editingEvent.location);
      setNotes(editingEvent.notes);
    } else {
      setTitle('');
      setDate(defaultDate);
      setAllDay(false);
      setStartTimeStr('10:00');
      setDurationMinutes(60);
      setCategory('Planning');
      setColor('cyan');
      setLocation('');
      setNotes('');
    }
  }, [open, editingEvent, defaultDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (trimmed.length < 2) {
      setError('Enter an event title (at least 2 characters).');
      return;
    }

    onSave(
      {
        title: trimmed,
        date: date || defaultDate,
        allDay,
        startMinute: parseTimeStringToMinute(startTimeStr),
        durationMinutes: Math.max(15, Math.min(720, Math.round(Number(durationMinutes) || 60))),
        category,
        color,
        location: location.trim(),
        notes: notes.trim(),
      },
      editingEvent?.id
    );
    onClose();
  };

  return (
    <DrawerModal
      open={open}
      onClose={onClose}
      title={editingEvent ? 'Edit Calendar Event' : 'New Calendar Event'}
      subtitle="Schedule meetings, milestones, reviews, or all-day commitments"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="event-title-input"
            className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
          >
            Event Title
          </label>
          <input
            id="event-title-input"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g. Q4 Architecture Review"
            className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl nx-input placeholder:text-slate-400"
            autoFocus
          />
          {error && <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="event-date-input"
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
            >
              Date
            </label>
            <input
              id="event-date-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums rounded-xl nx-input"
            />
          </div>

          <div>
            <label
              htmlFor="event-category-select"
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
            >
              Category
            </label>
            <select
              id="event-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as TaskCategory)}
              className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl nx-input"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-white dark:bg-slate-900">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* All-day Switch */}
        <div className="flex items-center justify-between gap-3 py-2 px-3.5 rounded-xl bg-slate-900/[0.03] dark:bg-white/[0.03] border border-slate-200/60 dark:border-slate-800/70">
          <div>
            <p className="text-xs font-medium text-slate-900 dark:text-white">All-day event</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Pin to the top of the day without a specific time slot
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={allDay}
            onClick={() => setAllDay((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
              allDay ? 'nx-gradient-primary' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                allDay ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {!allDay && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="event-start-input"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                >
                  Start Time
                </label>
                <input
                  id="event-start-input"
                  type="time"
                  value={startTimeStr}
                  onChange={(e) => setStartTimeStr(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums rounded-xl nx-input"
                />
              </div>

              <div>
                <label
                  htmlFor="event-duration-input"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                >
                  Duration (min)
                </label>
                <input
                  id="event-duration-input"
                  type="number"
                  min={15}
                  max={720}
                  step={15}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums rounded-xl nx-input"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {DURATION_PRESETS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  className={`min-h-[32px] px-2.5 rounded-lg text-xs font-mono tabular-nums transition-colors ${
                    durationMinutes === mins
                      ? 'bg-purple-500/15 dark:bg-cyan-400/15 text-purple-700 dark:text-cyan-300 border border-purple-500/35 dark:border-cyan-400/35'
                      : 'nx-input text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Color Accent Picker */}
        <div>
          <span className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
            Accent Color
          </span>
          <div className="flex items-center gap-2.5">
            {EVENT_COLORS.map((swatch) => {
              const active = color === swatch.key;
              return (
                <button
                  key={swatch.key}
                  type="button"
                  onClick={() => setColor(swatch.key)}
                  aria-label={`Color ${swatch.label}`}
                  aria-pressed={active}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                    active
                      ? 'scale-110 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#0D152D] ring-cyan-400'
                      : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full block"
                    style={{ backgroundColor: swatch.hex }}
                  />
                </button>
              );
            })}
            <span className={`text-xs font-medium ml-1 ${EVENT_COLOR_MAP[color].textClass}`}>
              {EVENT_COLOR_MAP[color].label}
            </span>
          </div>
        </div>

        <div>
          <label
            htmlFor="event-location-input"
            className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
          >
            Location or Link <span className="text-slate-400">(optional)</span>
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="event-location-input"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Room, office, or meeting link"
              className="w-full min-h-[44px] pl-9 pr-3.5 py-2 text-sm rounded-xl nx-input placeholder:text-slate-400"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="event-notes-input"
            className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
          >
            Agenda &amp; Notes <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            id="event-notes-input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Key discussion items or preparation reminders..."
            className="w-full px-3.5 py-2.5 text-sm rounded-xl nx-input placeholder:text-slate-400 resize-none"
          />
        </div>

        <div className="pt-3 border-t nx-divider flex items-center justify-between gap-3">
          {editingEvent && onDelete ? (
            <GlowButton
              type="button"
              variant="danger"
              size="sm"
              onClick={() => {
                onDelete(editingEvent.id);
                onClose();
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </GlowButton>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <GlowButton type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </GlowButton>
            <GlowButton type="submit" variant="primary" size="sm">
              {editingEvent ? 'Save Event' : 'Create Event'}
            </GlowButton>
          </div>
        </div>
      </form>
    </DrawerModal>
  );
};
