// Mock data and utilities for DevMind

export type ProjectStatus = "active" | "completed" | "paused" | "abandoned";
export type ProjectType = "personal" | "work" | "freelance" | "opensource";
export type Motivation = "learning" | "money" | "portfolio" | "passion" | "obligation";

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  type: ProjectType;
  daysSinceLastEntry: number;
  progress: number;
  moodData: number[];
  techStack: string[];
  solo: boolean;
  hasDeadline: boolean;
  energy: number;
  confidence: number;
  tiedToIncome: boolean;
  motivation: Motivation;
  createdAt: Date;
}

export interface JournalEntry {
  id: string;
  projectId: string;
  date: Date;
  energy: number;
  confidence: number;
  blocked: boolean;
  blockDescription?: string;
  oneWord: string;
  stillMotivated: boolean | null;
  reflection?: string;
}

export interface AIInsight {
  id: string;
  insight: string;
  confidence: number;
  category: "pattern" | "recommendation" | "warning" | "success";
  createdAt: Date;
}

// Generate sample project data
export function generateMockProjects(): Project[] {
  return [
    {
      id: "1",
      name: "Lumos API",
      description: "RESTful API for lighting control system",
      status: "active",
      type: "work",
      daysSinceLastEntry: 0,
      progress: 65,
      moodData: [7, 8, 7, 6, 7, 8, 9],
      techStack: ["Node.js", "Express", "PostgreSQL"],
      solo: false,
      hasDeadline: true,
      energy: 8,
      confidence: 7,
      tiedToIncome: true,
      motivation: "money",
      createdAt: new Date("2024-01-15"),
    },
    {
      id: "2",
      name: "Portfolio Redesign",
      status: "active",
      type: "personal",
      daysSinceLastEntry: 2,
      progress: 40,
      moodData: [6, 7, 8, 7, 6, 5, 6],
      techStack: ["React", "Next.js", "Tailwind"],
      solo: true,
      hasDeadline: false,
      energy: 7,
      confidence: 8,
      tiedToIncome: false,
      motivation: "portfolio",
      createdAt: new Date("2024-02-01"),
    },
  ];
}

// Generate sample insights
export function generateMockInsights(): AIInsight[] {
  return [
    {
      id: "1",
      insight: "You tend to disengage in week 3 of solo projects. Consider adding accountability checkpoints during this period.",
      confidence: 87,
      category: "pattern",
      createdAt: new Date(),
    },
    {
      id: "2",
      insight: "Your best work happens when energy score is above 7 at session start.",
      confidence: 92,
      category: "recommendation",
      createdAt: new Date(),
    },
  ];
}

// Calculate completion rate
export function calculateCompletionRate(projects: Project[]): number {
  if (projects.length === 0) return 0;
  const completed = projects.filter(p => p.status === "completed").length;
  return Math.round((completed / projects.length) * 100);
}

// Get current streak
export function calculateStreak(entries: JournalEntry[]): number {
  // Mock implementation - in real app, this would check consecutive days
  return 12;
}

// Format project day count
export function formatDaysSince(days: number): string {
  if (days === 0) return "Logged today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}
