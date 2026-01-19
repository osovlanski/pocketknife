/**
 * ToDoAgent Component
 * 
 * ToDo agent UI with separated concerns:
 * - Uses useTodo hook for business logic
 * - Uses CSS modules for styling
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Calendar,
  Clock,
  Brain,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Flag,
  Tag,
  Sparkles,
  Check,
  X,
  Loader2,
  ExternalLink,
  CalendarDays,
  Download
} from 'lucide-react';
import useTodo from '../hooks/useTodo';
import type { Task, RoutinePattern, TaskData, CalendarEvent } from '../services/todoApi';
import styles from '../styles/todo.module.css';

// =============================================================================
// PRIORITY & CATEGORY MAPPINGS
// =============================================================================

const PRIORITY_CLASSES: Record<string, string> = {
  low: styles.badgeLow,
  medium: styles.badgeMedium,
  high: styles.badgeHigh,
  urgent: styles.badgeUrgent
};

const CATEGORY_CLASSES: Record<string, string> = {
  work: styles.badgeWork,
  personal: styles.badgePersonal,
  health: styles.badgeHealth,
  learning: styles.badgeLearning,
  errands: styles.badgeErrands
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface TaskCardProps {
  task: Task;
  onComplete: (id: string, status: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  isRoutine?: boolean;
  isSuggested?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onComplete, 
  onEdit,
  onDelete, 
  isRoutine, 
  isSuggested 
}) => {
  const isCompleted = task.status === 'completed';

  const cardClass = [
    styles.taskCard,
    isCompleted && styles.taskCardCompleted,
    isRoutine && styles.taskCardRoutine,
    isSuggested && styles.taskCardSuggested
  ].filter(Boolean).join(' ');

  const titleClass = [
    styles.taskTitle,
    isCompleted && styles.taskTitleCompleted
  ].filter(Boolean).join(' ');

  const toggleClass = isCompleted 
    ? `${styles.toggleButton} ${styles.toggleButtonCompleted}`
    : `${styles.toggleButton} ${styles.toggleButtonPending}`;

  return (
    <div className={cardClass}>
      <div className={styles.taskContent}>
        {/* Toggle Button */}
        <button
          onClick={() => onComplete(task.id, task.status)}
          className={toggleClass}
          title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {isCompleted ? (
            <Check className={styles.iconSmall} />
          ) : (
            <Circle className={styles.iconSmall} />
          )}
        </button>

        {/* Task Details */}
        <div className={styles.taskDetails}>
          <div className={styles.taskHeader}>
            <h3 className={titleClass}>{task.title}</h3>
            {isRoutine && (
              <span className={`${styles.badge} ${styles.badgeRoutine}`}>
                <Repeat className={styles.iconXSmall} />
                Routine
              </span>
            )}
            {isSuggested && (
              <span className={`${styles.badge} ${styles.badgeSuggested}`}>
                <Sparkles className={styles.iconXSmall} />
                Suggested ({Math.round((task.confidence || 0) * 100)}%)
              </span>
            )}
          </div>

          {task.description && (
            <p className={styles.taskDescription}>{task.description}</p>
          )}

          <div className={styles.taskMeta}>
            <span className={`${styles.badge} ${styles.badgePriority} ${PRIORITY_CLASSES[task.priority]}`}>
              <Flag className={styles.iconXSmall} />
              {task.priority}
            </span>
            
            {task.category && (
              <span className={`${styles.badge} ${styles.badgeCategory} ${CATEGORY_CLASSES[task.category] || styles.badgePersonal}`}>
                {task.category}
              </span>
            )}

            {task.dueTime && (
              <span className={styles.metaItem}>
                <Clock className={styles.iconXSmall} />
                {task.dueTime}
              </span>
            )}

            {task.duration && (
              <span className={styles.metaItem}>
                {task.duration}min
              </span>
            )}

            {task.isRecurring && (
              <span className={styles.metaItem}>
                <Repeat className={styles.iconXSmall} />
                {task.recurrenceRule}
              </span>
            )}
          </div>

          {task.tags && task.tags.length > 0 && (
            <div className={styles.taskTags}>
              {task.tags.map((tag, i) => (
                <span key={i} className={styles.tagBadge}>
                  <Tag className={styles.iconXSmall} />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className={styles.taskActions}>
          <button 
            onClick={() => onEdit(task)} 
            className={styles.editButton}
            title="Edit task"
          >
            <Pencil className={styles.icon} />
          </button>
          <button 
            onClick={() => onDelete(task.id)} 
            className={styles.deleteButton}
            title="Delete task"
          >
            <Trash2 className={styles.icon} />
          </button>
        </div>
      </div>
    </div>
  );
};

interface RoutinesPanelProps {
  routines: RoutinePattern[];
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
}

const RoutinesPanel: React.FC<RoutinesPanelProps> = ({ routines, onApprove, onDismiss }) => (
  <div className={styles.routinesPanel}>
    <h3 className={styles.routinesTitle}>
      <Sparkles className={`${styles.icon} ${styles.routinesTitleIcon}`} />
      AI Suggested Routines
    </h3>
    <div className={styles.routinesList}>
      {routines.map((routine) => (
        <div key={routine.id} className={styles.routineCard}>
          <div className={styles.routineInfo}>
            <h4>{routine.patternName}</h4>
            <p>{routine.description}</p>
            <div className={styles.routineDays}>
              {routine.dayOfWeek.map((day) => (
                <span key={day} className={styles.routineDay}>
                  {day.substring(0, 3)}
                </span>
              ))}
              {routine.preferredTime && (
                <span className={styles.routineTime}>
                  <Clock className={styles.iconXSmall} />
                  {routine.preferredTime}
                </span>
              )}
            </div>
            <div className={styles.routineConfidence}>
              Confidence: {Math.round(routine.confidence * 100)}%
            </div>
          </div>
          <div className={styles.routineActions}>
            <button
              onClick={() => onApprove(routine.id)}
              className={`${styles.routineActionButton} ${styles.routineApprove}`}
              title="Approve"
            >
              <Check className={styles.icon} />
            </button>
            <button
              onClick={() => onDismiss(routine.id)}
              className={`${styles.routineActionButton} ${styles.routineDismiss}`}
              title="Dismiss"
            >
              <X className={styles.icon} />
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

interface CalendarPanelProps {
  events: CalendarEvent[];
  date: string;
  onImportEvent?: (event: CalendarEvent) => void;
}

const CalendarPanel: React.FC<CalendarPanelProps> = ({ events, date, onImportEvent }) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className={styles.calendarPanel}>
      <h3 className={styles.calendarPanelTitle}>
        <CalendarDays className={`${styles.icon} ${styles.calendarPanelTitleIcon}`} />
        Google Calendar
      </h3>
      
      {events.length === 0 ? (
        <p className={styles.calendarEmpty}>No events scheduled</p>
      ) : (
        <div className={styles.calendarEventsList}>
          {events.map((event) => (
            <div 
              key={event.id} 
              className={`${styles.calendarEventCard} ${event.isPocketknifeTask ? styles.calendarEventPocketknife : ''}`}
            >
              <div className={styles.calendarEventTime}>
                {event.isAllDay ? (
                  <span className={styles.calendarEventAllDay}>All day</span>
                ) : (
                  <>
                    <span>{formatTime(event.start)}</span>
                    <span className={styles.calendarEventDuration}>
                      {formatDuration(event.start, event.end)}
                    </span>
                  </>
                )}
              </div>
              <div className={styles.calendarEventDetails}>
                <h4 className={styles.calendarEventTitle}>
                  {event.title}
                  {event.isPocketknifeTask && (
                    <span className={styles.calendarEventPocketknifeBadge}>Task</span>
                  )}
                </h4>
                {event.description && (
                  <p className={styles.calendarEventDescription}>
                    {event.description.substring(0, 60)}{event.description.length > 60 ? '...' : ''}
                  </p>
                )}
              </div>
              <div className={styles.calendarEventActions}>
                {/* Import as Task button - only show for non-Pocketknife events */}
                {!event.isPocketknifeTask && onImportEvent && (
                  <button
                    onClick={() => onImportEvent(event)}
                    className={styles.calendarImportButton}
                    title="Import as Task"
                  >
                    <Download className={styles.iconSmall} />
                  </button>
                )}
                {event.htmlLink && (
                  <a 
                    href={event.htmlLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.calendarEventLink}
                    title="Open in Google Calendar"
                  >
                    <ExternalLink className={styles.iconSmall} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// RECURRING DAYS HELPER
// =============================================================================

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getRecurringDaysForRule = (rule: string): string[] => {
  switch (rule) {
    case 'daily':
      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    case 'weekdays':
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    case 'weekly':
      // Current day of week
      const today = new Date();
      return [DAYS_OF_WEEK[today.getDay()]];
    case 'monthly':
      return []; // Monthly doesn't use day of week
    default:
      return [];
  }
};

interface AddTaskModalProps {
  isOpen: boolean;
  newTask: TaskData;
  onTaskChange: (task: TaskData) => void;
  onCreate: () => void;
  onClose: () => void;
  isSyncing?: boolean;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ 
  isOpen, 
  newTask, 
  onTaskChange, 
  onCreate, 
  onClose,
  isSyncing = false
}) => {
  // Auto-update recurring days when recurrence rule changes
  const handleRecurrenceRuleChange = (rule: string) => {
    onTaskChange({ 
      ...newTask, 
      recurrenceRule: rule
    });
  };

  // Handle recurring toggle
  const handleRecurringToggle = (checked: boolean) => {
    onTaskChange({ 
      ...newTask, 
      isRecurring: checked,
      recurrenceRule: checked ? (newTask.recurrenceRule || 'daily') : undefined
    });
  };

  const recurringDays = newTask.recurrenceRule 
    ? getRecurringDaysForRule(newTask.recurrenceRule)
    : [];

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3 className={styles.modalTitle}>Add New Task</h3>
        
        <div className={styles.modalForm}>
          <input
            type="text"
            placeholder="Task title..."
            value={newTask.title}
            onChange={(e) => onTaskChange({ ...newTask, title: e.target.value })}
            className={styles.formInput}
            autoFocus
          />
          
          <textarea
            placeholder="Description (optional)"
            value={newTask.description || ''}
            onChange={(e) => onTaskChange({ ...newTask, description: e.target.value })}
            className={`${styles.formInput} ${styles.formTextarea}`}
          />
          
          <div className={styles.formGrid}>
            <div>
              <label className={styles.formLabel}>Priority</label>
              <select
                value={newTask.priority}
                onChange={(e) => onTaskChange({ ...newTask, priority: e.target.value as any })}
                className={styles.formSelect}
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🔵 Medium</option>
                <option value="high">🟠 High</option>
                <option value="urgent">🔴 Urgent</option>
              </select>
            </div>
            <div>
              <label className={styles.formLabel}>Category</label>
              <select
                value={newTask.category}
                onChange={(e) => onTaskChange({ ...newTask, category: e.target.value })}
                className={styles.formSelect}
              >
                <option value="work">💼 Work</option>
                <option value="personal">🏠 Personal</option>
                <option value="health">💪 Health</option>
                <option value="learning">📚 Learning</option>
                <option value="errands">🛒 Errands</option>
              </select>
            </div>
          </div>
          
          <div className={styles.formGrid}>
            <div>
              <label className={styles.formLabel}>Due Time</label>
              <input
                type="time"
                value={newTask.dueTime || ''}
                onChange={(e) => onTaskChange({ ...newTask, dueTime: e.target.value })}
                className={styles.formInput}
              />
            </div>
            <div>
              <label className={styles.formLabel}>Duration (min)</label>
              <input
                type="number"
                placeholder="30"
                value={newTask.duration || ''}
                onChange={(e) => onTaskChange({ ...newTask, duration: parseInt(e.target.value) || undefined })}
                className={styles.formInput}
              />
            </div>
          </div>
          
          {/* Recurring Task Section */}
          <div className={styles.formSection}>
            <div className={styles.formRow}>
              <label className={styles.formCheckbox}>
                <input
                  type="checkbox"
                  checked={newTask.isRecurring}
                  onChange={(e) => handleRecurringToggle(e.target.checked)}
                />
                <Repeat className={styles.iconSmall} />
                Recurring Task
              </label>
              {newTask.isRecurring && (
                <select
                  value={newTask.recurrenceRule || 'daily'}
                  onChange={(e) => handleRecurrenceRuleChange(e.target.value)}
                  className={styles.formSelect}
                  style={{ width: 'auto' }}
                >
                  <option value="daily">Daily</option>
                  <option value="weekdays">Weekdays</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              )}
            </div>
            
            {/* Show recurring days when recurring is enabled */}
            {newTask.isRecurring && newTask.recurrenceRule !== 'monthly' && (
              <div className={styles.recurringDaysDisplay}>
                {DAYS_OF_WEEK.map((day) => (
                  <span
                    key={day}
                    className={`${styles.dayBadge} ${recurringDays.includes(day) ? styles.dayBadgeActive : styles.dayBadgeInactive}`}
                  >
                    {day}
                  </span>
                ))}
              </div>
            )}
            
            {/* Monthly info */}
            {newTask.isRecurring && newTask.recurrenceRule === 'monthly' && (
              <p className={styles.formHint}>
                📅 Task will repeat on the same day each month
              </p>
            )}
          </div>
          
          {/* Google Calendar Sync Checkbox */}
          <div className={styles.formRow}>
            <label className={styles.formCheckbox}>
              <input
                type="checkbox"
                checked={newTask.syncEnabled !== false}
                onChange={(e) => onTaskChange({ ...newTask, syncEnabled: e.target.checked })}
              />
              <Calendar className={styles.iconSmall} />
              Sync to Google Calendar
            </label>
            {isSyncing && (
              <span className={styles.syncingIndicator}>
                <Loader2 className={`${styles.iconSmall} ${styles.spinner}`} />
                Syncing...
              </span>
            )}
          </div>
          
          <p className={styles.formHint}>
            💡 Tasks will auto-sync and AI will learn your patterns in the background
          </p>
        </div>
        
        <div className={styles.modalActions}>
          <button onClick={onClose} className={`${styles.modalButton} ${styles.modalButtonSecondary}`}>
            Cancel
          </button>
          <button onClick={onCreate} className={`${styles.modalButton} ${styles.modalButtonPrimary}`}>
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
};

interface EditTaskModalProps {
  isOpen: boolean;
  task: Task | null;
  onUpdate: (taskData: TaskData) => void;
  onClose: () => void;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ 
  isOpen, 
  task, 
  onUpdate, 
  onClose 
}) => {
  const [editData, setEditData] = useState<TaskData>({
    title: '',
    priority: 'medium',
    category: 'personal'
  });

  // Update form when task changes
  useEffect(() => {
    if (task) {
      setEditData({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        category: task.category || 'personal',
        dueTime: task.dueTime || '',
        duration: task.duration,
        isRecurring: task.isRecurring,
        recurrenceRule: task.recurrenceRule,
        syncEnabled: task.syncEnabled
      });
    }
  }, [task]);

  // Handle recurring toggle
  const handleRecurringToggle = (checked: boolean) => {
    setEditData({ 
      ...editData, 
      isRecurring: checked,
      recurrenceRule: checked ? (editData.recurrenceRule || 'daily') : undefined
    });
  };

  const recurringDays = editData.recurrenceRule 
    ? getRecurringDaysForRule(editData.recurrenceRule)
    : [];

  if (!isOpen || !task) return null;

  const handleSubmit = () => {
    if (!editData.title.trim()) return;
    onUpdate(editData);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3 className={styles.modalTitle}>Edit Task</h3>
        
        <div className={styles.modalForm}>
          <input
            type="text"
            placeholder="Task title..."
            value={editData.title}
            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            className={styles.formInput}
            autoFocus
          />
          
          <textarea
            placeholder="Description (optional)"
            value={editData.description || ''}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            className={`${styles.formInput} ${styles.formTextarea}`}
          />
          
          <div className={styles.formGrid}>
            <div>
              <label className={styles.formLabel}>Priority</label>
              <select
                value={editData.priority}
                onChange={(e) => setEditData({ ...editData, priority: e.target.value as any })}
                className={styles.formSelect}
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🔵 Medium</option>
                <option value="high">🟠 High</option>
                <option value="urgent">🔴 Urgent</option>
              </select>
            </div>
            <div>
              <label className={styles.formLabel}>Category</label>
              <select
                value={editData.category}
                onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                className={styles.formSelect}
              >
                <option value="work">💼 Work</option>
                <option value="personal">🏠 Personal</option>
                <option value="health">💪 Health</option>
                <option value="learning">📚 Learning</option>
                <option value="errands">🛒 Errands</option>
              </select>
            </div>
          </div>
          
          <div className={styles.formGrid}>
            <div>
              <label className={styles.formLabel}>Due Time</label>
              <input
                type="time"
                value={editData.dueTime || ''}
                onChange={(e) => setEditData({ ...editData, dueTime: e.target.value })}
                className={styles.formInput}
              />
            </div>
            <div>
              <label className={styles.formLabel}>Duration (min)</label>
              <input
                type="number"
                placeholder="30"
                value={editData.duration || ''}
                onChange={(e) => setEditData({ ...editData, duration: parseInt(e.target.value) || undefined })}
                className={styles.formInput}
              />
            </div>
          </div>
          
          {/* Recurring Task Section */}
          <div className={styles.formSection}>
            <div className={styles.formRow}>
              <label className={styles.formCheckbox}>
                <input
                  type="checkbox"
                  checked={editData.isRecurring}
                  onChange={(e) => handleRecurringToggle(e.target.checked)}
                />
                <Repeat className={styles.iconSmall} />
                Recurring Task
              </label>
              {editData.isRecurring && (
                <select
                  value={editData.recurrenceRule || 'daily'}
                  onChange={(e) => setEditData({ ...editData, recurrenceRule: e.target.value })}
                  className={styles.formSelect}
                  style={{ width: 'auto' }}
                >
                  <option value="daily">Daily</option>
                  <option value="weekdays">Weekdays</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              )}
            </div>
            
            {/* Show recurring days when recurring is enabled */}
            {editData.isRecurring && editData.recurrenceRule !== 'monthly' && (
              <div className={styles.recurringDaysDisplay}>
                {DAYS_OF_WEEK.map((day) => (
                  <span
                    key={day}
                    className={`${styles.dayBadge} ${recurringDays.includes(day) ? styles.dayBadgeActive : styles.dayBadgeInactive}`}
                  >
                    {day}
                  </span>
                ))}
              </div>
            )}
            
            {/* Monthly info */}
            {editData.isRecurring && editData.recurrenceRule === 'monthly' && (
              <p className={styles.formHint}>
                📅 Task will repeat on the same day each month
              </p>
            )}
          </div>
          
          {/* Sync toggle */}
          <div className={styles.formRow}>
            <label className={styles.formCheckbox}>
              <input
                type="checkbox"
                checked={editData.syncEnabled !== false}
                onChange={(e) => setEditData({ ...editData, syncEnabled: e.target.checked })}
              />
              <Calendar className={styles.iconSmall} />
              Sync to Google Calendar
            </label>
          </div>
        </div>
        
        <div className={styles.modalActions}>
          <button onClick={onClose} className={`${styles.modalButton} ${styles.modalButtonSecondary}`}>
            Cancel
          </button>
          <button onClick={handleSubmit} className={`${styles.modalButton} ${styles.modalButtonPrimary}`}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const ToDoAgent: React.FC = () => {
  const todo = useTodo();
  const calendarEvents = todo.agenda?.calendarEvents || [];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>✅ ToDo Agent</h1>
        <p className={styles.subtitle}>Manage tasks, learn your routines, sync with Google Calendar</p>
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        <button
          onClick={() => todo.setShowAddTask(true)}
          className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
        >
          <Plus className={styles.icon} />
          Add Task
        </button>
        <button
          onClick={() => todo.setShowRoutines(!todo.showRoutines)}
          className={`${styles.actionButton} ${todo.showRoutines ? styles.actionButtonActive : styles.actionButtonSecondary}`}
        >
          <Sparkles className={styles.icon} />
          Routines {todo.routines.length > 0 && `(${todo.routines.length})`}
        </button>
        {/* Manual sync button - secondary, since auto-sync is enabled by default */}
        <button
          onClick={todo.handleSyncCalendar}
          disabled={todo.syncing}
          className={`${styles.actionButton} ${todo.lastSyncAt ? styles.actionButtonSuccess : styles.actionButtonSecondary}`}
          title={todo.lastSyncAt ? `Last synced: ${new Date(todo.lastSyncAt).toLocaleTimeString()}` : 'Manually sync all tasks to Google Calendar'}
        >
          {todo.syncing ? (
            <Loader2 className={`${styles.icon} ${styles.spinner}`} />
          ) : todo.lastSyncAt ? (
            <Check className={styles.icon} />
          ) : (
            <Calendar className={styles.icon} />
          )}
          {todo.syncing ? 'Syncing...' : todo.lastSyncAt ? 'Synced ✓' : 'Sync All'}
        </button>
        {/* Manual learn patterns button - secondary, since auto-learn happens after task creation */}
        <button
          onClick={todo.handleLearnPatterns}
          disabled={todo.learningPatterns}
          className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
          title="Manually analyze your task history to find patterns"
        >
          {todo.learningPatterns ? <Loader2 className={`${styles.icon} ${styles.spinner}`} /> : <Brain className={styles.icon} />}
          {todo.learningPatterns ? 'Learning...' : 'Learn Patterns'}
        </button>
      </div>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={todo.showAddTask}
        newTask={todo.newTask}
        onTaskChange={todo.setNewTask}
        onCreate={todo.handleCreateTask}
        onClose={() => todo.setShowAddTask(false)}
        isSyncing={todo.syncing}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={todo.showEditTask}
        task={todo.editingTask}
        onUpdate={todo.handleUpdateTask}
        onClose={() => {
          todo.setShowEditTask(false);
          todo.setEditingTask(null);
        }}
      />

      {/* Suggested Routines Panel */}
      {todo.showRoutines && todo.routines.length > 0 && (
        <RoutinesPanel
          routines={todo.routines}
          onApprove={todo.handleApproveRoutine}
          onDismiss={todo.handleDismissRoutine}
        />
      )}

      {/* Date Navigation */}
      <div className={styles.dateNav}>
        <button onClick={() => todo.navigateDate(-1)} className={styles.dateNavButton}>
          <ChevronLeft className={styles.icon} />
        </button>
        <h2 className={styles.dateTitle}>{todo.formattedDate}</h2>
        <button onClick={() => todo.navigateDate(1)} className={styles.dateNavButton}>
          <ChevronRight className={styles.icon} />
        </button>
      </div>

      {/* Progress Bar */}
      {todo.allTasks.length > 0 && (
        <div className={styles.progressCard}>
          <div className={styles.progressHeader}>
            <span>{todo.completedCount} of {todo.allTasks.length} tasks completed</span>
            <span>{Math.round(todo.progress)}%</span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${todo.progress}%` }} />
          </div>
          {todo.agenda && todo.agenda.totalDuration > 0 && (
            <div className={styles.progressDuration}>
              <Clock className={styles.iconSmall} />
              Total estimated time: {Math.round(todo.agenda.totalDuration / 60)}h {todo.agenda.totalDuration % 60}m
            </div>
          )}
        </div>
      )}

      {/* Main content with task list and calendar panel */}
      <div className={styles.mainContent}>
        {/* Task List */}
        {todo.loading ? (
          <div className={styles.loadingContainer}>
            <Loader2 className={`${styles.icon} ${styles.spinner}`} style={{ width: '2rem', height: '2rem' }} />
          </div>
        ) : (
          <div className={styles.taskList}>
            {/* Manual Tasks */}
            {todo.agenda?.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={todo.handleCompleteTask}
                onEdit={todo.handleEditTask}
                onDelete={todo.handleDeleteTask}
              />
            ))}

            {/* Routine Tasks */}
            {todo.agenda?.routineTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={todo.handleCompleteTask}
                onEdit={todo.handleEditTask}
                onDelete={todo.handleDeleteTask}
                isRoutine
              />
            ))}

            {/* Suggested Tasks */}
            {todo.agenda?.suggestedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={todo.handleCompleteTask}
                onEdit={todo.handleEditTask}
                onDelete={todo.handleDeleteTask}
                isSuggested
              />
            ))}

            {/* Empty State */}
            {todo.allTasks.length === 0 && !todo.agenda?.suggestedTasks.length && (
              <div className={styles.emptyState}>
                <CheckCircle2 className={styles.emptyIcon} />
                <p className={styles.emptyTitle}>No tasks for {todo.formattedDate}</p>
                <p className={styles.emptyHint}>Click "Add Task" to create one!</p>
              </div>
            )}
          </div>
        )}

        {/* Calendar Panel (Right Side) */}
        <CalendarPanel 
          events={calendarEvents} 
          date={todo.formattedDate} 
          onImportEvent={todo.handleImportCalendarEvent}
        />
      </div>
    </div>
  );
};

export default ToDoAgent;
