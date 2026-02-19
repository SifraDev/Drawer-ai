import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CalendarDays, Receipt, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  type: "bill" | "reminder";
  details?: string;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${getDaysInMonth(year, month)}`;

  const { data: events, isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar", `?start=${startDate}&end=${endDate}`],
  });

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    if (events) {
      for (const event of events) {
        if (!map[event.date]) map[event.date] = [];
        map[event.date].push(event);
      }
    }
    return map;
  }, [events]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date().toISOString().split("T")[0];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View bill due dates and reminders
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="overflow-visible">
            <div className="flex items-center justify-between gap-2 p-4 border-b flex-wrap">
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" onClick={prevMonth} data-testid="button-prev-month">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-sm font-semibold min-w-[140px] text-center">
                  {monthNames[month]} {year}
                </h2>
                <Button size="icon" variant="ghost" onClick={nextMonth} data-testid="button-next-month">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button size="sm" variant="secondary" onClick={goToToday} data-testid="button-today">
                Today
              </Button>
            </div>

            {isLoading ? (
              <div className="p-4">
                <Skeleton className="h-[400px] w-full" />
              </div>
            ) : (
              <div className="p-4">
                <div className="grid grid-cols-7 gap-px mb-2">
                  {dayNames.map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-px">
                  {calendarDays.map((day, idx) => {
                    if (day === null) {
                      return <div key={`empty-${idx}`} className="p-2 min-h-[80px]" />;
                    }

                    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const dayEvents = eventsByDate[dateStr] || [];
                    const isToday = dateStr === today;
                    const isSelected = dateStr === selectedDate;

                    return (
                      <div
                        key={dateStr}
                        className={`p-1.5 min-h-[80px] rounded-md cursor-pointer transition-colors ${
                          isSelected ? "bg-accent" : "hover-elevate"
                        } ${isToday ? "ring-1 ring-primary/40" : ""}`}
                        onClick={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)}
                        data-testid={`calendar-day-${dateStr}`}
                      >
                        <div className={`text-xs font-medium mb-1 ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                          {day}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 2).map((evt) => (
                            <div
                              key={evt.id}
                              className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${
                                evt.type === "bill"
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-chart-4/10 text-chart-4"
                              }`}
                            >
                              {evt.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 2} more</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="overflow-visible p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">
                {selectedDate
                  ? new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                  : "Select a date"}
              </h3>
            </div>

            {selectedDate && selectedEvents.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">No events on this date</p>
            )}

            {selectedEvents.map((evt) => (
              <div
                key={evt.id}
                className={`flex items-start gap-2 rounded-md p-3 ${
                  evt.type === "bill" ? "bg-destructive/10" : "bg-chart-4/10"
                }`}
                data-testid={`calendar-event-${evt.id}`}
              >
                {evt.type === "bill" ? (
                  <Receipt className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                ) : (
                  <Bell className="h-4 w-4 mt-0.5 shrink-0 text-chart-4" />
                )}
                <div className="min-w-0">
                  <p className={`text-xs font-semibold ${evt.type === "bill" ? "text-destructive" : "text-chart-4"}`}>
                    {evt.title}
                  </p>
                  {evt.details && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{evt.details}</p>
                  )}
                  <Badge variant="secondary" className="mt-1.5 text-[10px]">
                    {evt.type === "bill" ? "Bill Due" : "Reminder"}
                  </Badge>
                </div>
              </div>
            ))}

            {!selectedDate && (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Click on a date to see its events
              </p>
            )}
          </Card>

          <Card className="overflow-visible p-4 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Legend</h3>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm bg-destructive/20" />
              <span className="text-xs">Bill Due Date</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm bg-chart-4/20" />
              <span className="text-xs">Reminder</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
