import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  CalendarDays,
  CalendarPlus,
  Check,
  Clock,
  MapPin,
  Pencil,
  Play,
  Plus,
  Target,
  Trash2,
} from 'lucide-react';
import { useWorkspace } from '../../store/WorkspaceContext';
import {
  CalendarEvent,
  PlannerTask,
  TimeBlock,
} from '../../types/productivity';
import {
  formatLongDate,
  formatTimeRange,
  getRelativeDayLabel,
  getTodayISO,
  parseISODate,
} from '../../utils/date';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlowButton } from '../../components/ui/GlowButton';
import { PageTransition } from '../../components/ui/PageTransition';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TaskFormModal } from '../../components/planner/TaskFormModal';
import { TimeBlockFormModal } from '../../components/planner/TimeBlockFormModal';
import {
  EVENT_COLOR_MAP,
  EventFormModal,
} from '../../components/calendar/EventFormModal';
import {
  CalendarLayerFilter,
  MonthCalendarGrid,
} from '../../components/calendar/MonthCalendarGrid';
import { UpcomingDeadlinesPanel } from '../../components/calendar/UpcomingDeadlinesPanel';

const QUICK_SLOTS = [
  { label: '09:00', minute: 9 * 60 },
  { label: '11:00', minute: 11 * 60 },
  { label: '14:00', minute: 14 * 60 },
  { label: '16:00', minute: 16 * 60 },
];

export const CalendarPage: React.FC = () => {
  const {
    tasks,
    timeBlocks,
    events,
    goals,
    addTask,
    updateTask,
    toggleTaskComplete,
    deleteTask,
    addTimeBlock,
    updateTimeBlock,
    setTimeBlockStatus,
    deleteTimeBlock,
    addEvent,
    updateEvent,
    deleteEvent,
    launchFocusForItem,
  } = useWorkspace();

  const navigate = useNavigate();
  const todayISO = getTodayISO();
  const initialDate = parseISODate(todayISO);

  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());
  const [layerFilter, setLayerFilter] = useState<CalendarLayerFilter>('all');

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [eventPendingDelete, setEventPendingDelete] = useState<CalendarEvent | null>(null);

  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);
  const [presetStartMinute, setPresetStartMinute] = useState<number>(9 * 60);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PlannerTask | null>(null);

  const handleSelectDate = (isoDate: string) => {
    setSelectedDate(isoDate);
    const parsed = parseISODate(isoDate);
    setViewYear(parsed.getFullYear());
    setViewMonth(parsed.getMonth());
  };

  const handleChangeMonth = (deltaMonths: number) => {
    const next = new Date(viewYear, viewMonth + deltaMonths, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const handleJumpToday = () => {
    handleSelectDate(todayISO);
  };

  const dayEvents = useMemo(
    () =>
      events
        .filter((ev) => ev.date === selectedDate)
        .sort((a, b) => {
          if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
          return a.startMinute - b.startMinute;
        }),
    [events, selectedDate]
  );

  const dayBlocks = useMemo(
    () =>
      timeBlocks
        .filter((b) => b.date === selectedDate)
        .sort((a, b) => a.startMinute - b.startMinute),
    [timeBlocks, selectedDate]
  );

  const dayTasks = useMemo(() => {
    const order = { high: 0, medium: 1, low: 2 };
    return tasks
      .filter((t) => t.date === selectedDate)
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return order[a.priority] - order[b.priority];
      });
  }, [tasks, selectedDate]);

  const dayGoalDeadlines = useMemo(() => {
    const items: Array<{ id: string; title: string; subtitle: string; completed: boolean }> = [];
    goals.forEach((g) => {
      if (g.deadline === selectedDate) {
        const pct = Math.min(100, Math.round((g.currentValue / Math.max(1, g.targetValue)) * 100));
        items.push({
          id: `goal_${g.id}`,
          title: g.title,
          subtitle: `Goal target · ${pct}% (${g.currentValue}/${g.targetValue} ${g.unit})`,
          completed: g.completed,
        });
      }
      g.milestones.forEach((ms) => {
        if (ms.targetDate === selectedDate) {
          items.push({
            id: `ms_${ms.id}`,
            title: ms.title,
            subtitle: `Milestone · ${g.title}`,
            completed: ms.completed,
          });
        }
      });
    });
    return items;
  }, [goals, selectedDate]);

  const totalScheduledMinutes = useMemo(
    () => dayBlocks.reduce((sum, b) => sum + b.durationMinutes, 0),
    [dayBlocks]
  );

  const openScheduleForSlot = (minute: number) => {
    setEditingBlock(null);
    setPresetStartMinute(minute);
    setBlockModalOpen(true);
  };

  const openScheduleFromTask = (task: PlannerTask) => {
    setEditingBlock({
      id: '',
      date: selectedDate,
      title: task.title,
      category: task.category,
      startMinute: 10 * 60,
      durationMinutes: Math.max(15, Math.min(120, task.estimatedMinutes)),
      linkedTaskId: task.id,
      status: 'scheduled',
      notes: task.notes,
    });
    setBlockModalOpen(true);
  };

  return (
    <PageTransition className="space-y-6">
      {/* Header & Quick Creation Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-purple-600 dark:text-cyan-400">
            {getRelativeDayLabel(selectedDate)} · {formatLongDate(selectedDate)}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white mt-1">
            Calendar &amp; Schedule
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <GlowButton
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingEvent(null);
              setEventModalOpen(true);
            }}
          >
            <Calendar className="w-4 h-4" />
            <span>New Event</span>
          </GlowButton>

          <GlowButton
            variant="secondary"
            size="sm"
            onClick={() => openScheduleForSlot(9 * 60)}
          >
            <CalendarPlus className="w-4 h-4 text-purple-600 dark:text-cyan-400" />
            <span>Time Block</span>
          </GlowButton>

          <GlowButton
            variant="secondary"
            size="sm"
            onClick={() => {
              setEditingTask(null);
              setTaskModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 text-purple-600 dark:text-cyan-400" />
            <span>New Task</span>
          </GlowButton>
        </div>
      </div>

      {/* Interactive Monthly Calendar Grid */}
      <MonthCalendarGrid
        year={viewYear}
        monthIndex={viewMonth}
        selectedDate={selectedDate}
        layerFilter={layerFilter}
        events={events}
        timeBlocks={timeBlocks}
        tasks={tasks}
        goals={goals}
        onSelectDate={handleSelectDate}
        onChangeMonth={handleChangeMonth}
        onJumpToday={handleJumpToday}
        onChangeLayer={setLayerFilter}
        onQuickAddEvent={(iso) => {
          handleSelectDate(iso);
          setEditingEvent(null);
          setEventModalOpen(true);
        }}
      />

      {/* Selected Day Schedule + Upcoming Deadlines Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 cols: Selected Day Events + Time-Blocked Schedule */}
        <div className="lg:col-span-7 space-y-6">
          {/* Calendar Events for Selected Day */}
          <GlassCard as="section" className="overflow-hidden">
            <div className="px-5 py-4 border-b nx-divider flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
                  Events · {getRelativeDayLabel(selectedDate)}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {formatLongDate(selectedDate)}
                </p>
              </div>
              <GlowButton
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditingEvent(null);
                  setEventModalOpen(true);
                }}
              >
                <Plus className="w-3.5 h-3.5 text-purple-600 dark:text-cyan-400" />
                <span>Add Event</span>
              </GlowButton>
            </div>

            {dayEvents.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <CalendarDays className="w-5 h-5 mx-auto text-slate-400 dark:text-slate-500" />
                <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                  No calendar events on {getRelativeDayLabel(selectedDate).toLowerCase()}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Add a meeting, review, or all-day milestone to this date.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-200/60 dark:divide-slate-800/70">
                {dayEvents.map((ev) => {
                  const swatch = EVENT_COLOR_MAP[ev.color];
                  return (
                    <li
                      key={ev.id}
                      className="px-5 py-3.5 flex items-start justify-between gap-3 hover:bg-white/50 dark:hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${swatch.barClass}`}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-mono tabular-nums font-medium text-slate-800 dark:text-cyan-300">
                              {ev.allDay
                                ? 'All day'
                                : formatTimeRange(ev.startMinute, ev.durationMinutes)}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{ev.category}</span>
                            {ev.location && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="inline-flex items-center gap-1 truncate">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  {ev.location}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm font-semibold text-slate-950 dark:text-white">
                            {ev.title}
                          </p>
                          {ev.notes && (
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                              {ev.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEvent(ev);
                            setEventModalOpen(true);
                          }}
                          aria-label={`Edit event ${ev.title}`}
                          className="min-h-[38px] min-w-[38px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEventPendingDelete(ev)}
                          aria-label={`Delete event ${ev.title}`}
                          className="min-h-[38px] min-w-[38px] rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </GlassCard>

          {/* Daily Time-Blocked Schedule */}
          <GlassCard as="section" className="overflow-hidden">
            <div className="px-5 py-4 border-b nx-divider flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
                  Daily Time-Blocked Schedule
                </h2>
                <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                  {totalScheduledMinutes} min reserved on {getRelativeDayLabel(selectedDate)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {QUICK_SLOTS.map((slot) => (
                  <button
                    key={slot.label}
                    type="button"
                    onClick={() => openScheduleForSlot(slot.minute)}
                    className="min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-cyan-300 hover:bg-purple-500/10 dark:hover:bg-cyan-400/10 transition-colors"
                  >
                    +{slot.label}
                  </button>
                ))}
              </div>
            </div>

            {dayBlocks.length === 0 ? (
              <div className="px-5 py-9 text-center">
                <Clock className="w-5 h-5 mx-auto text-slate-400 dark:text-slate-500" />
                <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                  No focus blocks scheduled for this day
                </p>
                <div className="mt-3">
                  <GlowButton
                    variant="secondary"
                    size="sm"
                    onClick={() => openScheduleForSlot(9 * 60)}
                  >
                    Schedule Time Block
                  </GlowButton>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-slate-200/60 dark:divide-slate-800/70">
                {dayBlocks.map((block) => {
                  const done = block.status === 'completed';
                  return (
                    <li
                      key={block.id}
                      className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/50 dark:hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() =>
                            setTimeBlockStatus(block.id, done ? 'scheduled' : 'completed')
                          }
                          aria-label={
                            done ? `Reopen ${block.title}` : `Mark ${block.title} completed`
                          }
                          className="min-h-[40px] min-w-[40px] -ml-2 -my-1.5 flex items-center justify-center shrink-0"
                        >
                          <span
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                              done
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : block.status === 'in-progress'
                                  ? 'border-cyan-500 bg-cyan-500/15'
                                  : 'border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-900/70'
                            }`}
                          >
                            {done && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </span>
                        </button>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-mono tabular-nums font-medium text-slate-800 dark:text-cyan-300">
                              {formatTimeRange(block.startMinute, block.durationMinutes)}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{block.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{block.durationMinutes}m</span>
                          </div>
                          <p
                            className={`text-sm font-semibold mt-0.5 ${
                              done
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-950 dark:text-white'
                            }`}
                          >
                            {block.title}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                        {!done && (
                          <button
                            type="button"
                            onClick={() => {
                              launchFocusForItem({
                                blockId: block.id,
                                taskId: block.linkedTaskId,
                                minutes: Math.min(block.durationMinutes, 60),
                                intention: block.notes || block.title,
                              });
                              navigate('/focus');
                            }}
                            className="min-h-[36px] px-2.5 rounded-xl text-xs font-medium text-purple-600 dark:text-cyan-300 hover:bg-purple-500/10 dark:hover:bg-cyan-400/10 inline-flex items-center gap-1 whitespace-nowrap transition-colors"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Focus</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBlock(block);
                            setBlockModalOpen(true);
                          }}
                          aria-label={`Edit ${block.title}`}
                          className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </GlassCard>

          {/* Tasks & Goal Deadlines Due on Selected Day */}
          <GlassCard as="section" className="overflow-hidden">
            <div className="px-5 py-4 border-b nx-divider flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
                  Due on {getRelativeDayLabel(selectedDate)}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tasks, goal target dates, and milestones landing on this date
                </p>
              </div>
              <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {dayTasks.length + dayGoalDeadlines.length} items
              </span>
            </div>

            {dayTasks.length === 0 && dayGoalDeadlines.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  No tasks or goal deadlines due this day
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-200/60 dark:divide-slate-800/70">
                {dayGoalDeadlines.map((dl) => (
                  <li
                    key={dl.id}
                    className="px-5 py-3 flex items-center justify-between gap-3 bg-amber-500/[0.04]"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <Target className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            dl.completed
                              ? 'line-through text-slate-400'
                              : 'text-slate-950 dark:text-white'
                          }`}
                        >
                          {dl.title}
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 truncate">
                          {dl.subtitle}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/goals')}
                      className="text-xs font-medium text-purple-600 dark:text-cyan-400 hover:underline shrink-0"
                    >
                      Open
                    </button>
                  </li>
                ))}

                {dayTasks.map((task) => (
                  <li
                    key={task.id}
                    className="px-4 py-3 flex items-center justify-between gap-2 hover:bg-white/50 dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleTaskComplete(task.id)}
                        aria-label={
                          task.completed
                            ? `Mark ${task.title} incomplete`
                            : `Mark ${task.title} complete`
                        }
                        className="min-h-[40px] min-w-[40px] -ml-1.5 -my-1.5 flex items-center justify-center shrink-0"
                      >
                        <span
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            task.completed
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-900/70'
                          }`}
                        >
                          {task.completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingTask(task);
                          setTaskModalOpen(true);
                        }}
                        className="text-left min-w-0 py-0.5"
                      >
                        <p
                          className={`text-sm font-medium leading-snug ${
                            task.completed
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-950 dark:text-slate-100'
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Task · {task.category} · {task.estimatedMinutes}m
                        </p>
                      </button>
                    </div>

                    {!task.completed && (
                      <button
                        type="button"
                        onClick={() => openScheduleFromTask(task)}
                        title="Schedule onto timeline"
                        aria-label={`Schedule ${task.title} onto timeline`}
                        className="min-h-[38px] min-w-[38px] rounded-xl flex items-center justify-center text-slate-400 hover:text-purple-600 dark:hover:text-cyan-300 hover:bg-purple-500/10 dark:hover:bg-cyan-400/10 transition-colors shrink-0"
                      >
                        <CalendarPlus className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </div>

        {/* Right 5 cols: Upcoming Deadlines Radar */}
        <div className="lg:col-span-5">
          <UpcomingDeadlinesPanel
            goals={goals}
            tasks={tasks}
            events={events}
            onJumpToDate={handleSelectDate}
            onOpenGoals={() => navigate('/goals')}
            onOpenTasks={() => navigate('/tasks')}
          />
        </div>
      </div>

      {/* Connected Modals */}
      <EventFormModal
        open={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        defaultDate={selectedDate}
        editingEvent={editingEvent}
        onSave={(input, existingId) => {
          if (existingId) {
            updateEvent(existingId, input);
          } else {
            addEvent(input);
          }
        }}
        onDelete={(id) => {
          const target = events.find((e) => e.id === id) ?? null;
          setEventModalOpen(false);
          if (target) setEventPendingDelete(target);
        }}
      />

      <TaskFormModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        defaultDate={selectedDate}
        editingTask={editingTask}
        onSave={(input, existingId) => {
          if (existingId) {
            updateTask(existingId, input);
          } else {
            addTask(input);
          }
        }}
        onDelete={deleteTask}
      />

      <TimeBlockFormModal
        open={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        defaultDate={selectedDate}
        defaultStartMinute={presetStartMinute}
        editingBlock={editingBlock}
        availableTasks={tasks.filter((t) => !t.completed)}
        existingBlocks={timeBlocks}
        onSave={(input, existingId) => {
          if (existingId) {
            updateTimeBlock(existingId, input);
          } else {
            addTimeBlock(input);
          }
        }}
        onDelete={(id) => {
          if (id) deleteTimeBlock(id);
        }}
      />

      <ConfirmDialog
        open={Boolean(eventPendingDelete)}
        title="Delete this calendar event?"
        description={
          eventPendingDelete
            ? `"${eventPendingDelete.title}" on ${eventPendingDelete.date} will be removed from your calendar.`
            : ''
        }
        confirmLabel="Delete Event"
        cancelLabel="Cancel"
        tone="danger"
        onConfirm={() => {
          if (eventPendingDelete) {
            deleteEvent(eventPendingDelete.id);
            setEventPendingDelete(null);
          }
        }}
        onCancel={() => setEventPendingDelete(null)}
      />
    </PageTransition>
  );
};
