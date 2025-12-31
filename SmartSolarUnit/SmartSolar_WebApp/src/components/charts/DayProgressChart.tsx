import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock } from "lucide-react";

interface DayProgressChartProps {
  startDate: Date;
  endDate: Date;
  completedDays: number;
  remainingDays: number;
  totalDays: number;
  className?: string;
}

export const DayProgressChart: React.FC<DayProgressChartProps> = ({
  startDate,
  endDate,
  completedDays,
  remainingDays,
  totalDays,
  className,
}) => {
  // Generate array of all 30 days
  const days = Array.from({ length: totalDays }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(date);
    dayDate.setHours(0, 0, 0, 0);
    const isCompleted = dayDate < today;
    const isToday = dayDate.getTime() === today.getTime();
    
    return {
      day: i + 1,
      date: dayDate,
      isCompleted,
      isToday,
    };
  });

  return (
    <div className={cn("p-6 rounded-xl bg-card border border-border", className)}>
      <h4 className="text-sm font-medium text-foreground mb-4">Day-by-Day Progress</h4>
      
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-success" />
          <span className="text-muted-foreground">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-warning/30 border-2 border-warning" />
          <span className="text-muted-foreground">Remaining</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-accent border-2 border-accent-foreground" />
          <span className="text-muted-foreground">Today</span>
        </div>
      </div>

      {/* Day Grid - 2 rows of 15 boxes */}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
        {days.map((day) => (
          <div
            key={day.day}
            className={cn(
              "aspect-square rounded flex items-center justify-center transition-all",
              "w-16 h-16",
              day.isCompleted
                ? "bg-success text-success-foreground"
                : day.isToday
                ? "bg-accent text-accent-foreground border-2 border-accent-foreground"
                : "bg-warning/30 text-warning-foreground border border-warning/50"
            )}
            title={`Day ${day.day} - ${day.date.toLocaleDateString()}`}
          >
            {day.isCompleted ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : day.isToday ? (
              <Clock className="w-4 h-4" />
            ) : (
              <span className="text-xs font-medium">{day.day}</span>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <span className="text-muted-foreground">
            {completedDays} days completed
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-warning" />
          <span className="text-muted-foreground">
            {remainingDays} days remaining
          </span>
        </div>
      </div>
    </div>
  );
};

