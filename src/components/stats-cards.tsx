import { useState } from "react";
import { ArrowDownUp, HardDrive, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Stats {
  totalExpenses: number;
  totalIncome: number;
  totalDocuments: number;
  topCategory: string | null;
  totalStorageBytes: number;
}

interface MonthlyFlow {
  date: string;
  expenses: number;
  income: number;
}

interface CategoryStorage {
  category: string;
  count: number;
  totalBytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function CashFlowExpanded() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: flowData, isLoading } = useQuery<MonthlyFlow[]>({
    queryKey: [`/api/stats/monthly-flow?year=${year}&month=${month}`],
  });

  if (isLoading) {
    return <Skeleton className="h-48 w-full mt-3" />;
  }

  const chartData = (flowData || [])
    .filter(d => d.expenses > 0 || d.income > 0)
    .map(d => ({
      day: parseInt(d.date.split("-")[2]),
      expenses: d.expenses,
      income: d.income,
    }));

  const hasData = chartData.length > 0;

  return (
    <div className="mt-3 pt-3 border-t" data-testid="cash-flow-expanded">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        {MONTH_NAMES[month - 1]} {year}
      </p>
      {hasData ? (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barGap={1}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10 }}
              className="fill-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              className="fill-muted-foreground"
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v}`}
              width={50}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
              contentStyle={{
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--popover))",
                color: "hsl(var(--popover-foreground))",
              }}
              formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name === "income" ? "Income" : "Expenses"]}
              labelFormatter={(label) => `${MONTH_NAMES[month - 1]} ${label}`}
            />
            <Bar dataKey="income" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} maxBarSize={16} />
            <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} maxBarSize={16} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          No transactions this month
        </div>
      )}
    </div>
  );
}

function StorageExpanded() {
  const { data: categories, isLoading } = useQuery<CategoryStorage[]>({
    queryKey: ["/api/stats/storage"],
  });

  if (isLoading) {
    return <Skeleton className="h-32 w-full mt-3" />;
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="mt-3 pt-3 border-t">
        <p className="text-sm text-muted-foreground text-center py-4">No documents yet</p>
      </div>
    );
  }

  const maxBytes = Math.max(...categories.map(c => c.totalBytes), 1);

  return (
    <div className="mt-3 pt-3 border-t space-y-2" data-testid="storage-expanded">
      <p className="text-xs font-medium text-muted-foreground">All Categories</p>
      {categories.map((cat) => (
        <div key={cat.category} className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium truncate">{cat.category}</span>
            <span className="text-muted-foreground whitespace-nowrap">
              {cat.count} {cat.count === 1 ? "doc" : "docs"} &middot; {formatBytes(cat.totalBytes)}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-chart-3 transition-all"
              style={{ width: `${Math.max((cat.totalBytes / maxBytes) * 100, 2)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatsCards() {
  const [cashFlowOpen, setCashFlowOpen] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-32" />
          </Card>
        ))}
      </div>
    );
  }

  const expenses = stats?.totalExpenses ?? 0;
  const income = stats?.totalIncome ?? 0;
  const net = income - expenses;
  const CashChevron = cashFlowOpen ? ChevronUp : ChevronDown;
  const StorageChevron = storageOpen ? ChevronUp : ChevronDown;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card className="p-4" data-testid="stat-card-cash-flow">
        <button
          type="button"
          className="w-full text-left space-y-2"
          onClick={() => setCashFlowOpen(!cashFlowOpen)}
          data-testid="button-toggle-cash-flow"
        >
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <p className="text-xs font-medium text-muted-foreground">All Time Balance</p>
            <div className="flex items-center gap-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-chart-1/10">
                <ArrowDownUp className="h-3.5 w-3.5 text-chart-1" />
              </div>
              <CashChevron className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
          <p
            className={`font-semibold leading-snug text-xl tabular-nums ${net >= 0 ? "text-chart-2" : "text-destructive"}`}
            data-testid="text-stat-cash-flow"
          >
            {net >= 0 ? "+" : "-"}${Math.abs(net).toFixed(2)}
          </p>
          <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-chart-2" />
              <span data-testid="text-stat-income">${income.toFixed(2)} in</span>
            </span>
            <span className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-destructive" />
              <span data-testid="text-stat-expenses">${expenses.toFixed(2)} out</span>
            </span>
          </div>
        </button>
        {cashFlowOpen && <CashFlowExpanded />}
      </Card>

      <Card className="p-4" data-testid="stat-card-storage">
        <button
          type="button"
          className="w-full text-left space-y-2"
          onClick={() => setStorageOpen(!storageOpen)}
          data-testid="button-toggle-storage"
        >
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <p className="text-xs font-medium text-muted-foreground">Storage</p>
            <div className="flex items-center gap-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-chart-3/10">
                <HardDrive className="h-3.5 w-3.5 text-chart-3" />
              </div>
              <StorageChevron className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <p className="font-semibold leading-snug text-xl tabular-nums" data-testid="text-stat-documents">
                {stats?.totalDocuments ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Documents</p>
            </div>
            <div>
              <p className="font-semibold leading-snug text-xl tabular-nums" data-testid="text-stat-top-category">
                {stats?.topCategory ?? "None"}
              </p>
              <p className="text-xs text-muted-foreground">Top Category</p>
            </div>
            <div>
              <p className="font-semibold leading-snug text-xl tabular-nums" data-testid="text-stat-total-storage">
                {formatBytes(stats?.totalStorageBytes ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Size</p>
            </div>
          </div>
        </button>
        {storageOpen && <StorageExpanded />}
      </Card>
    </div>
  );
}
