/**
 * ToDoAgent Component
 * 
 * ToDo agent UI with separated concerns:
 * - Uses useTodo hook for business logic
 * - Uses CSS modules for styling
 */

import React from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Calendar,
  Clock,
  Brain,
  Trash2,
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
  CalendarDays
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
  onDelete: (id: string) => void;
  isRoutine?: boolean;
  isSuggested?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onComplete, 
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

        {/* Delete Button */}
        <button onClick={() => onDelete(task.id)} className={styles.deleteButton}>
          <Trash2 className={styles.icon} />
        </button>
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
}

const CalendarPanel: React.FC<CalendarPanelProps> = ({ events, date }) => {
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
          ))}
        </div>
      )}
    </div>
  );
};

interface AddTaskModalProps {
  isOpen: boolean;
  newTask: TaskData;
  onTaskChange: (task: TaskData) => void;
  onCreate: () => void;
  onClose: () => void;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ 
  isOpen, 
  newTask, 
  onTaskChange, 
  onCreate, 
  onClose 
}) => {
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
          
          <div className={styles.formRow}>
            <label className={styles.formCheckbox}>
              <input
                type="checkbox"
                checked={newTask.isRecurring}
                onChange={(e) => onTaskChange({ ...newTask, isRecurring: e.target.checked })}
              />
              <Repeat className={styles.iconSmall} />
              Recurring
            </label>
            {newTask.isRecurring && (
              <select
                value={newTask.recurrenceRule || 'daily'}
                onChange={(e) => onTaskChange({ ...newTask, recurrenceRule: e.target.value })}
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
          
          <p className={styles.formHint}>
            💡 Use "Sync Calendar" button to sync all tasks to Google Calendar
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
          onClick={todo.handleSyncCalendar}
          disabled={todo.syncing}
          className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
        >
          {todo.syncing ? <Loader2 className={`${styles.icon} ${styles.spinner}`} /> : <Calendar className={styles.icon} />}
          Sync Calendar
        </button>
        <button
          onClick={todo.handleLearnPatterns}
          disabled={todo.learningPatterns}
          className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
        >
          {todo.learningPatterns ? <Loader2 className={`${styles.icon} ${styles.spinner}`} /> : <Brain className={styles.icon} />}
          Learn Patterns
        </button>
        <button
          onClick={() => todo.setShowRoutines(!todo.showRoutines)}
          className={`${styles.actionButton} ${todo.showRoutines ? styles.actionButtonActive : styles.actionButtonSecondary}`}
        >
          <Sparkles className={styles.icon} />
          Routines {todo.routines.length > 0 && `(${todo.routines.length})`}
        </button>
      </div>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={todo.showAddTask}
        newTask={todo.newTask}
        onTaskChange={todo.setNewTask}
        onCreate={todo.handleCreateTask}
        onClose={() => todo.setShowAddTask(false)}
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
                onDelete={todo.handleDeleteTask}
              />
            ))}

            {/* Routine Tasks */}
            {todo.agenda?.routineTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={todo.handleCompleteTask}
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
        <CalendarPanel events={calendarEvents} date={todo.formattedDate} />
      </div>
    </div>
  );
};

export default ToDoAgent;
