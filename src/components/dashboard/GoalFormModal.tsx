import React, { useEffect, useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import {
  CreateGoalInput,
  GoalMilestone,
  GoalProgressMode,
  ProductivityGoal,
  TaskCategory,
} from '../../types/productivity';
import { addDaysISO, generateId, getTodayISO } from '../../utils/date';
import { DrawerModal } from '../ui/DrawerModal';
import { GlowButton } from '../ui/GlowButton';

interface GoalFormModalProps {
  open: boolean;
  onClose: () => void;
  editingGoal: ProductivityGoal | null;
  onSave: (input: CreateGoalInput, existingId?: string) => void;
  onDelete?: (id: string) => void;
}

const CATEGORIES: TaskCategory[] = ['Deep Work', 'Planning', 'Admin', 'Personal'];
const UNIT_PRESETS = ['cycles', 'milestones', 'tasks', 'hours', 'chapters'];

export const GoalFormModal: React.FC<GoalFormModalProps> = ({
  open,
  onClose,
  editingGoal,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Deep Work');
  const [progressMode, setProgressMode] = useState<GoalProgressMode>('numeric');
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [targetValue, setTargetValue] = useState<number>(5);
  const [unit, setUnit] = useState('milestones');
  const [deadline, setDeadline] = useState(() => addDaysISO(getTodayISO(), 7));
  const [milestones, setMilestones] = useState<GoalMilestone[]>([]);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setNewMilestoneTitle('');
    setNewMilestoneDate('');
    if (editingGoal) {
      setTitle(editingGoal.title);
      setDescription(editingGoal.description ?? '');
      setCategory(editingGoal.category);
      setProgressMode(editingGoal.progressMode ?? 'numeric');
      setCurrentValue(editingGoal.currentValue);
      setTargetValue(editingGoal.targetValue);
      setUnit(editingGoal.unit);
      setDeadline(editingGoal.deadline);
      setMilestones(editingGoal.milestones ?? []);
    } else {
      setTitle('');
      setDescription('');
      setCategory('Deep Work');
      setProgressMode('numeric');
      setCurrentValue(0);
      setTargetValue(5);
      setUnit('milestones');
      setDeadline(addDaysISO(getTodayISO(), 7));
      setMilestones([]);
    }
  }, [open, editingGoal]);

  const handleAddMilestoneDraft = () => {
    const clean = newMilestoneTitle.trim();
    if (!clean) return;
    setMilestones((prev) => [
      ...prev,
      {
        id: generateId('ms'),
        title: clean,
        completed: false,
        targetDate: newMilestoneDate || null,
      },
    ]);
    setNewMilestoneTitle('');
    setNewMilestoneDate('');
  };

  const handleToggleMilestoneDraft = (id: string) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, completed: !m.completed } : m))
    );
  };

  const handleRemoveMilestoneDraft = (id: string) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (trimmed.length < 2) {
      setError('Enter a clear goal title (at least 2 characters).');
      return;
    }

    const effectiveMode: GoalProgressMode =
      progressMode === 'milestones' && milestones.length > 0 ? 'milestones' : 'numeric';
    const safeTarget =
      effectiveMode === 'milestones'
        ? milestones.length
        : Math.max(1, Math.min(10000, Math.round(Number(targetValue) || 1)));
    const safeCurrent =
      effectiveMode === 'milestones'
        ? milestones.filter((m) => m.completed).length
        : Math.max(0, Math.min(safeTarget, Math.round(Number(currentValue) || 0)));
    const cleanUnit = effectiveMode === 'milestones' ? 'milestones' : unit.trim() || 'milestones';

    onSave(
      {
        title: trimmed,
        description: description.trim(),
        category,
        progressMode: effectiveMode,
        currentValue: safeCurrent,
        targetValue: safeTarget,
        unit: cleanUnit,
        deadline: deadline || addDaysISO(getTodayISO(), 7),
        milestones,
      },
      editingGoal?.id
    );
    onClose();
  };

  return (
    <DrawerModal
      open={open}
      onClose={onClose}
      title={editingGoal ? 'Edit Goal' : 'New Goal'}
      subtitle="Define target dates, measurable progress, and actionable milestones"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="goal-title-input"
            className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
          >
            Goal Title
          </label>
          <input
            id="goal-title-input"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g. Ship mobile v1.0 release candidate"
            className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl nx-input placeholder:text-slate-400"
            autoFocus
          />
          {error && <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        </div>

        <div>
          <label
            htmlFor="goal-desc-input"
            className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
          >
            Description <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            id="goal-desc-input"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Why this goal matters and what success looks like..."
            className="w-full px-3.5 py-2.5 text-sm rounded-xl nx-input placeholder:text-slate-400 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="goal-category-select"
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
            >
              Category
            </label>
            <select
              id="goal-category-select"
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

          <div>
            <label
              htmlFor="goal-deadline-input"
              className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
            >
              Target Date
            </label>
            <input
              id="goal-deadline-input"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums rounded-xl nx-input"
            />
          </div>
        </div>

        {/* Progress Tracking Mode Selector */}
        <div>
          <span className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
            Progress Ring Driver
          </span>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: 'numeric', label: 'Numeric Target', hint: 'Slider & step count' },
                { value: 'milestones', label: 'Milestone Checklist', hint: 'Auto-computed %' },
              ] as const
            ).map((opt) => {
              const active = progressMode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setProgressMode(opt.value)}
                  aria-pressed={active}
                  className={`text-left px-3 py-2.5 rounded-xl border transition-colors ${
                    active
                      ? 'border-purple-500/50 dark:border-cyan-400/50 bg-purple-500/10 dark:bg-cyan-400/10'
                      : 'nx-input hover:border-cyan-400/40'
                  }`}
                >
                  <p className="text-xs font-semibold text-slate-950 dark:text-white">
                    {opt.label}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{opt.hint}</p>
                </button>
              );
            })}
          </div>
        </div>

        {progressMode === 'numeric' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="goal-current-input"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                >
                  Current Progress
                </label>
                <input
                  id="goal-current-input"
                  type="number"
                  min={0}
                  max={Math.max(1, targetValue)}
                  value={currentValue}
                  onChange={(e) => setCurrentValue(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums rounded-xl nx-input"
                />
              </div>

              <div>
                <label
                  htmlFor="goal-target-input"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
                >
                  Target Value
                </label>
                <input
                  id="goal-target-input"
                  type="number"
                  min={1}
                  max={10000}
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3 py-2 text-sm font-mono tabular-nums rounded-xl nx-input"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="goal-unit-input"
                className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
              >
                Measurement Unit
              </label>
              <input
                id="goal-unit-input"
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                maxLength={24}
                placeholder="cycles, milestones, tasks..."
                className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl nx-input placeholder:text-slate-400"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {UNIT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setUnit(preset)}
                    className={`min-h-[32px] px-2.5 rounded-lg text-xs font-medium transition-colors ${
                      unit === preset
                        ? 'bg-purple-500/15 dark:bg-cyan-400/15 text-purple-700 dark:text-cyan-300 border border-purple-500/35 dark:border-cyan-400/35'
                        : 'nx-input text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Milestones Checklist Builder */}
        <div className="space-y-2.5 pt-2 border-t nx-divider">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Milestones Checklist
            </span>
            <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
              {milestones.filter((m) => m.completed).length}/{milestones.length} done
            </span>
          </div>

          {milestones.length > 0 && (
            <ul className="space-y-1.5">
              {milestones.map((ms) => (
                <li
                  key={ms.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900/[0.03] dark:bg-white/[0.04] border border-slate-200/60 dark:border-slate-800/80"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleMilestoneDraft(ms.id)}
                    className="flex items-center gap-2.5 min-w-0 text-left flex-1"
                  >
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        ms.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {ms.completed && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </span>
                    <span
                      className={`text-xs truncate ${
                        ms.completed
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {ms.title}
                    </span>
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {ms.targetDate && (
                      <span className="font-mono text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
                        {ms.targetDate}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveMilestoneDraft(ms.id)}
                      aria-label={`Remove milestone ${ms.title}`}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newMilestoneTitle}
              onChange={(e) => setNewMilestoneTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddMilestoneDraft();
                }
              }}
              placeholder="Add milestone step..."
              aria-label="New milestone title"
              className="flex-1 min-h-[40px] px-3 py-1.5 text-xs rounded-xl nx-input placeholder:text-slate-400"
            />
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={newMilestoneDate}
                onChange={(e) => setNewMilestoneDate(e.target.value)}
                aria-label="Optional milestone target date"
                className="min-h-[40px] px-2.5 py-1.5 text-xs font-mono tabular-nums rounded-xl nx-input"
              />
              <button
                type="button"
                onClick={handleAddMilestoneDraft}
                disabled={!newMilestoneTitle.trim()}
                aria-label="Add milestone"
                className="min-h-[40px] px-3 rounded-xl nx-glass text-xs font-medium text-purple-700 dark:text-cyan-300 hover:border-cyan-400/50 disabled:opacity-40 inline-flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {progressMode === 'milestones' && milestones.length === 0 && (
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              Add at least one milestone to compute progress automatically (otherwise defaults to Numeric Target).
            </p>
          )}
        </div>

        <div className="pt-3 border-t nx-divider flex items-center justify-between gap-3">
          {editingGoal && onDelete ? (
            <GlowButton
              type="button"
              variant="danger"
              size="sm"
              onClick={() => {
                onDelete(editingGoal.id);
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
              {editingGoal ? 'Save Changes' : 'Create Goal'}
            </GlowButton>
          </div>
        </div>
      </form>
    </DrawerModal>
  );
};
