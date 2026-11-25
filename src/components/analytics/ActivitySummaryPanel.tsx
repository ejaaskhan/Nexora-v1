import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Flag,
  Search,
  Target,
  Timer,
  X,
} from 'lucide-react';
import { ActivityEventType, ActivityItem } from '../../types/productivity';
import {
  ActivityAnalyticsSummary,
  ActivityDomain,
  classifyActivityDomain,
} from '../../utils/analytics';
import { formatRelativeTime } from '../../utils/date';
import { GlassCard } from '../ui/GlassCard';

interface ActivitySummaryPanelProps {
  activities: ActivityItem[];
  summary: ActivityAnalyticsSummary;
}

const DOMAIN_ICONS: Record<ActivityDomain, React.FC<{ className?: string }>> = {
  Focus: Timer,
  Tasks: CheckCircle2,
  Goals: Target,
  Schedule: CalendarDays,
  Notes: FileText,
};

const EVENT_ICON_MAP: Record<ActivityEventType, React.FC<{ className?: string }>> = {
  task_created: CheckCircle2,
  task_completed: CheckCircle2,
  block_scheduled: Clock,
  block_completed: Clock,
  session_logged: Timer,
  goal_created: Target,
  goal_progress: Target,
  goal_completed: Target,
  milestone_completed: Flag,
  note_created: FileText,
  event_created: CalendarDays,
};

export const ActivitySummaryPanel: React.FC<ActivitySummaryPanelProps> = ({
  activities,
  summary,
}) => {
  const navigate = useNavigate();
  const [domainFilter, setDomainFilter] = useState<'All' | ActivityDomain>('All');
  const [query, setQuery] = useState('');

  const filteredActivities = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activities.filter((item) => {
      if (domainFilter !== 'All' && classifyActivityDomain(item.type) !== domainFilter) {
        return false;
      }
      if (q) {
        return (
          item.title.toLowerCase().includes(q) || item.detail.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activities, domainFilter, query]);

  return (
    <GlassCard as="section" className="p-5 sm:p-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b nx-divider">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-600 dark:text-cyan-400" />
            <span>Workspace Activity Summary</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real audit trail across focus sprints, completed tasks, goals, calendar, and notes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Today </span>
            <span className="font-mono tabular-nums font-semibold text-slate-950 dark:text-white">
              {summary.todayCount}
            </span>
          </div>
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
            ·
          </span>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Last 7d </span>
            <span className="font-mono tabular-nums font-semibold text-purple-600 dark:text-cyan-300">
              {summary.last7DaysCount}
            </span>
          </div>
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
            ·
          </span>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Recorded </span>
            <span className="font-mono tabular-nums font-semibold text-slate-950 dark:text-white">
              {summary.total}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Domain Volume Breakdown (Click to Filter) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Activity by Area
            </span>
            {domainFilter !== 'All' && (
              <button
                type="button"
                onClick={() => setDomainFilter('All')}
                className="text-purple-600 dark:text-cyan-400 hover:underline font-medium"
              >
                Show all
              </button>
            )}
          </div>

          <div className="space-y-2">
            {summary.byDomain.map((row) => {
              const Icon = DOMAIN_ICONS[row.domain];
              const isSelected = domainFilter === row.domain;
              return (
                <button
                  key={row.domain}
                  type="button"
                  onClick={() =>
                    setDomainFilter((prev) => (prev === row.domain ? 'All' : row.domain))
                  }
                  className={`w-full text-left rounded-xl p-2.5 border transition-colors ${
                    isSelected
                      ? 'border-purple-500/45 dark:border-cyan-400/45 bg-purple-500/8 dark:bg-cyan-400/8'
                      : 'border-transparent hover:bg-slate-900/[0.03] dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="inline-flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                      <Icon className="w-3.5 h-3.5 text-purple-600 dark:text-cyan-400" />
                      <span>{row.domain}</span>
                    </span>
                    <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {row.count} · {row.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-900/8 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full nx-gradient-primary transition-all duration-300"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Searchable Activity Feed */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search recorded activity..."
              aria-label="Search recorded activity"
              className="w-full min-h-[42px] pl-10 pr-9 py-2 text-xs sm:text-sm rounded-xl nx-input placeholder:text-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear activity search"
                className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {filteredActivities.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400 rounded-xl border nx-divider bg-slate-900/[0.02] dark:bg-white/[0.02]">
              No matching activity recorded yet. Complete a task, log a focus session, or update a
              goal to populate this feed.
            </div>
          ) : (
            <ul className="divide-y divide-slate-200/60 dark:divide-slate-800/70 max-h-[280px] overflow-y-auto rounded-xl border nx-divider">
              {filteredActivities.slice(0, 24).map((item) => {
                const Icon = EVENT_ICON_MAP[item.type] ?? Activity;
                const domain = classifyActivityDomain(item.type);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => navigate(item.route)}
                      className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-900/[0.03] dark:hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="mt-0.5 w-7 h-7 rounded-lg bg-slate-900/5 dark:bg-white/[0.06] flex items-center justify-center text-purple-600 dark:text-cyan-400 shrink-0">
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {domain} · {item.detail}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-[11px] tabular-nums text-slate-400 dark:text-slate-500 shrink-0">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </GlassCard>
  );
};
