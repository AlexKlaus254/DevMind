import { 
  Users, 
  AlertCircle, 
  TrendingUp,
  BarChart3
} from "lucide-react";
import { StatCard } from "../components/devmind/stat-card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";

const completionData = [
  { month: "Nov", rate: 62 },
  { month: "Dec", rate: 65 },
  { month: "Jan", rate: 70 },
  { month: "Feb", rate: 68 },
];

const dropOffData = [
  { stage: "Week 1", projects: 100 },
  { stage: "Week 2", projects: 85 },
  { stage: "Week 3", projects: 60 },
  { stage: "Week 4", projects: 55 },
  { stage: "Week 5", projects: 52 },
  { stage: "Complete", projects: 48 },
];

const energyDistribution = [
  { range: "1-3", count: 8, color: "#F85149" },
  { range: "4-6", count: 15, color: "#D29922" },
  { range: "7-10", count: 22, color: "#3FB950" },
];

const confidenceDistribution = [
  { range: "1-3", count: 5, color: "#F85149" },
  { range: "4-6", count: 12, color: "#D29922" },
  { range: "7-10", count: 28, color: "#3FB950" },
];

const teamAlerts = [
  {
    message: "3 team members show sustained low energy in weeks 2-3",
    severity: "warning"
  },
  {
    message: "Completion rate decreased 2% this month",
    severity: "info"
  },
  {
    message: "5 projects approaching the critical week-3 period",
    severity: "warning"
  },
];

export function TeamView() {
  return (
    <div className="min-h-screen pb-20 md:pb-8 bg-[#161B22]">
      {/* Header with Banner */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="bg-primary/10 border-b border-primary/30 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              All data on this page is anonymised. No individual entries or
              names are visible. You are seeing team-level patterns only.
            </span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Team Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Aggregated patterns and insights across your organization
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Team Members"
            value="24"
            icon={Users}
            subtitle="Active this month"
          />
          <StatCard
            title="Team Completion Rate"
            value="68%"
            icon={TrendingUp}
            trend={{ value: "−2% vs last month", positive: false }}
          />
          <StatCard
            title="Active Projects"
            value="38"
            subtitle="Across all members"
          />
          <StatCard
            title="Avg Check-in Frequency"
            value="3.2"
            subtitle="days between entries"
          />
        </div>

        {/* Alerts Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Team Signals</h2>
          <div className="space-y-3">
            {teamAlerts.map((alert, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 flex items-start gap-3 ${
                  alert.severity === "warning"
                    ? "bg-warning/5 border-warning/30"
                    : "bg-card border-border"
                }`}
              >
                <AlertCircle
                  className={`w-5 h-5 mt-0.5 ${
                    alert.severity === "warning" ? "text-warning" : "text-muted-foreground"
                  }`}
                />
                <p className="text-sm">{alert.message}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Completion Rate Trend */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-6">Team Completion Rate Over Time</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={completionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                <XAxis 
                  dataKey="month" 
                  stroke="#7D8590"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#7D8590"
                  style={{ fontSize: '12px' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#161B22', 
                    border: '1px solid #30363D',
                    borderRadius: '8px',
                    color: '#E6EDF3'
                  }}
                  formatter={(value) => `${value}%`}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#6C63FF"
                  strokeWidth={2}
                  name="Completion Rate"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Drop-off Funnel */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-6">Common Drop-off Points</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dropOffData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                <XAxis 
                  type="number"
                  stroke="#7D8590"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  type="category"
                  dataKey="stage"
                  stroke="#7D8590"
                  style={{ fontSize: '12px' }}
                  width={80}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#161B22', 
                    border: '1px solid #30363D',
                    borderRadius: '8px',
                    color: '#E6EDF3'
                  }}
                />
                <Bar
                  dataKey="projects"
                  fill="#6C63FF"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-sm text-muted-foreground mt-4">
              ⚠️ Largest drop-off occurs between Week 2 and Week 3
            </p>
          </div>
        </div>

        {/* Energy and Confidence Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Energy Distribution */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-6">Energy Score Distribution</h3>
            <div className="flex items-center justify-between">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={energyDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="count"
                  >
                    {energyDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#161B22', 
                      border: '1px solid #30363D',
                      borderRadius: '8px',
                      color: '#E6EDF3'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {energyDistribution.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <div className="text-sm">
                      <span className="font-mono">{item.range}</span>
                      <span className="text-muted-foreground ml-2">({item.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Confidence Distribution */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-6">Confidence Score Distribution</h3>
            <div className="flex items-center justify-between">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={confidenceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="count"
                  >
                    {confidenceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#161B22', 
                      border: '1px solid #30363D',
                      borderRadius: '8px',
                      color: '#E6EDF3'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {confidenceDistribution.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <div className="text-sm">
                      <span className="font-mono">{item.range}</span>
                      <span className="text-muted-foreground ml-2">({item.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="bg-gradient-to-br from-primary/10 via-card to-card border border-primary/30 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold mb-2">Team Pattern Insight</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your team shows consistently strong starts (85% active in Week 1-2) but experiences a 
                critical drop in Week 3 (29% abandonment rate). Teams with similar patterns benefit 
                from implementing mid-project check-ins and peer accountability systems during this period.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
