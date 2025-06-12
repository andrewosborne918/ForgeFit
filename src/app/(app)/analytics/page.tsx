"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // Corrected import path
import { Activity, Clock, CalendarDays, TrendingUp, Brain, Zap, Award } from "lucide-react"; // Added Brain, Zap, Award icons
import { useAppContext } from "@/context/AppContext";
import { getFirestore, collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { app, isFirebaseConfigured } from "@/lib/firebase";
import Calendar from 'react-calendar';
import "@/styles/calendar.css";
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

// Updated WorkoutPlan related interfaces to match generate-plan.ts output
interface ExerciseDetail {
  exercise: string;
  description: string;
}

interface MainWorkoutExerciseDetail extends ExerciseDetail {
  sets: number | string; // Allow string for sets like "As many as possible"
  reps: string;
}

interface WorkoutDetails {
  warmup: ExerciseDetail[];
  mainWorkout: MainWorkoutExerciseDetail[];
  cooldown: ExerciseDetail[];
  notes: string;
}

interface WorkoutPlan {
  title: string;
  duration: string; 
  workout?: WorkoutDetails; // Make workout optional as older logs might not have it structured this way
}

interface WorkoutLog {
  id: string;
  timestamp: Timestamp;
  plan: WorkoutPlan; 
}

interface UserStats {
  totalWorkouts: number;
  totalTimeExercised: number; // in minutes
  totalActiveDays: number;
  consistencyStreak: number; // in days
}

interface WeeklyChartDataPoint {
  week: string; // e.g., "May 26"
  workouts?: number;
  time?: number; // in minutes
}

interface MuscleGroupChartDataPoint {
  name: string;
  value: number;
}

interface ExerciseVolumeDataPoint {
  name: string;
  volume: number; // Changed from count to volume
}

interface ComputedInsights {
  mostTrainedMuscleGroup: string;
  favoriteWorkoutDay: string;
  // Longest streak is already in UserStats
}

// Helper function to check if two dates are the same day
const isSameDay = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// Helper function to get the start of the week (Sunday)
const getWeekStartDate = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

// Common muscle groups for parsing - can be expanded
// const COMMON_MUSCLE_GROUPS = [
//   'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'quadriceps', 'hamstrings', 
//   'glutes', 'core', 'abs', 'abdominals', 'calves', 'forearms', 'traps', 'lats', 'full body', 'upper body', 'lower body'
// ];

export default function AnalyticsPage() {
  const { user } = useAppContext();
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalWorkouts: 0,
    totalTimeExercised: 0,
    totalActiveDays: 0,
    consistencyStreak: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeDates, setActiveDates] = useState<Date[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyChartDataPoint[]>([]);
  const [selectedChartType, setSelectedChartType] = useState<'workouts' | 'time'>('workouts');
  const [muscleGroupChartData, setMuscleGroupChartData] = useState<MuscleGroupChartDataPoint[]>([]);
  const [exerciseVolumeData, setExerciseVolumeData] = useState<ExerciseVolumeDataPoint[]>([]);
  const [insights, setInsights] = useState<ComputedInsights>({
    mostTrainedMuscleGroup: "N/A",
    favoriteWorkoutDay: "N/A",
  });

  useEffect(() => {
    if (user?.uid) {
      const fetchWorkoutLogs = async () => {
        setLoading(true);
        try {
          if (!app || !isFirebaseConfigured) {
            console.error("Firebase app not initialized");
            setLoading(false);
            return;
          }
          const db = getFirestore(app);
          const logsCollectionRef = collection(db, `users/${user.uid}/logs`);
          const q = query(logsCollectionRef, orderBy("timestamp", "asc"));
          const querySnapshot = await getDocs(q);
          const logs = querySnapshot.docs.map(doc => {
            const data = doc.data();
            // Ensure plan and plan.workout exist before spreading
            return {
              id: doc.id,
              timestamp: data.timestamp,
              plan: data.plan ? {
                title: data.plan.title,
                duration: data.plan.duration,
                workout: data.plan.workout ? {
                  warmup: data.plan.workout.warmup || [],
                  mainWorkout: data.plan.workout.mainWorkout || [],
                  cooldown: data.plan.workout.cooldown || [],
                  notes: data.plan.workout.notes || "",
                } : undefined,
              } : { title: "Unknown Plan", duration: "0 minutes" },
            } as WorkoutLog;
          });
          setWorkoutLogs(logs);

          const dates = logs
            .filter(log => log.timestamp && typeof log.timestamp.toDate === 'function')
            .map(log => log.timestamp.toDate());
          setActiveDates(dates);

        } catch (error) {
          console.error("Error fetching workout logs:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchWorkoutLogs();
    } else if (!user) {
      setLoading(false);
      setWorkoutLogs([]);
      setActiveDates([]);
      setStats({
        totalWorkouts: 0,
        totalTimeExercised: 0,
        totalActiveDays: 0,
        consistencyStreak: 0,
      });
      setWeeklyData([]);
      setInsights({ mostTrainedMuscleGroup: "N/A", favoriteWorkoutDay: "N/A" });
      setMuscleGroupChartData([]);
      setExerciseVolumeData([]);
    }
  }, [user]);

  useEffect(() => {
    if (workoutLogs.length > 0) {
      // Calculate Total Workouts
      const totalWorkouts = workoutLogs.length;

      // Calculate Total Time Exercised
      const totalTimeExercised = workoutLogs.reduce((total, log) => {
        const durationString = log.plan?.duration || "0 minutes";
        const minutes = parseInt(durationString.split(" ")[0]) || 0;
        return total + minutes;
      }, 0);

      // Calculate Total Active Days
      const uniqueActiveDatesSet = new Set<string>();
      workoutLogs.forEach(log => {
        if (log.timestamp && typeof log.timestamp.toDate === 'function') {
          uniqueActiveDatesSet.add(log.timestamp.toDate().toISOString().split('T')[0]);
        }
      });
      const totalActiveDays = uniqueActiveDatesSet.size;
      
      // Calculate Consistency Streak
      let maxStreak = 0;
      if (totalWorkouts > 0) {
        const sortedLogsWithValidTimestamps = workoutLogs
          .filter(log => log.timestamp && typeof log.timestamp.toDate === 'function')
          .map(log => ({ ...log, date: log.timestamp.toDate() }))
          // Ensure sorting by date for streak calculation, even if Firestore query was asc.
          .sort((a, b) => a.date.getTime() - b.date.getTime()); 

        const uniqueSortedDates = sortedLogsWithValidTimestamps
          .map(log => new Date(log.date.getFullYear(), log.date.getMonth(), log.date.getDate()))
          .filter((date, index, self) => 
            index === self.findIndex(d => d.getTime() === date.getTime())
          );

        if (uniqueSortedDates.length > 0) {
            maxStreak = 1;
            let currentStreak = 1;
            for (let i = 1; i < uniqueSortedDates.length; i++) {
                const prevDay = uniqueSortedDates[i-1];
                const currentDay = uniqueSortedDates[i];

                const diffTime = Math.abs(currentDay.getTime() - prevDay.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) { // Consecutive days
                    currentStreak++;
                } else if (diffDays === 2) { // One rest day allowed
                    currentStreak++; 
                } else if (diffDays > 2) { // Gap is too large or not a workout day
                    currentStreak = 1; // Reset streak
                }
                if (currentStreak > maxStreak) {
                    maxStreak = currentStreak;
                }
            }
        } 
         if (totalActiveDays === 1) maxStreak = 1;
         if (totalActiveDays === 0) maxStreak = 0;
      }

      setStats({
        totalWorkouts,
        totalTimeExercised,
        totalActiveDays,
        consistencyStreak: maxStreak,
      });

      // Process data for weekly charts
      const weeklyAggregatedData: { [weekStart: string]: { workouts: number; time: number } } = {};

      workoutLogs.forEach(log => {
        if (log.timestamp && typeof log.timestamp.toDate === 'function') {
          const date = log.timestamp.toDate();
          const weekStartDate = getWeekStartDate(date);
          const weekKey = `${weekStartDate.toLocaleString('default', { month: 'short' })} ${weekStartDate.getDate()}`;

          if (!weeklyAggregatedData[weekKey]) {
            weeklyAggregatedData[weekKey] = { workouts: 0, time: 0 };
          }
          weeklyAggregatedData[weekKey].workouts += 1;
          const durationMinutes = parseInt((log.plan?.duration || "0 minutes").split(" ")[0]) || 0;
          weeklyAggregatedData[weekKey].time += durationMinutes;
        }
      });

      const chartData = Object.keys(weeklyAggregatedData)
        .map(weekKey => ({
          week: weekKey,
          workouts: weeklyAggregatedData[weekKey].workouts,
          time: weeklyAggregatedData[weekKey].time,
        }))
        .sort((a, b) => new Date(a.week + ", " + new Date().getFullYear()).getTime() - new Date(b.week + ", " + new Date().getFullYear()).getTime()); // Sort by week
        // Consider a more robust date parsing for sorting if year changes are frequent within dataset

      setWeeklyData(chartData);

      // Calculate Insights & Muscle Group Data for Pie Chart
      const muscleGroupCountsForChart: { [group: string]: number } = {};
      const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun, Mon, Tue, Wed, Thu, Fri, Sat
      const exerciseCounts: { [exerciseName: string]: number } = {};

      workoutLogs.forEach(log => {
        // Favorite Day of Week
        if (log.timestamp && typeof log.timestamp.toDate === 'function') {
          dayOfWeekCounts[log.timestamp.toDate().getDay()]++;
        }

        // Muscle Group Counts for Pie Chart and Insight
        log.plan?.workout?.mainWorkout?.forEach(exercise => {
          const desc = exercise.description.toLowerCase();
          const groupsInExercise = desc.split(',')
            .map(g => g.trim())
            .filter(g => g.length > 0); // Filter out empty strings 
          
          const uniqueGroupsInExercise = new Set(groupsInExercise);

          uniqueGroupsInExercise.forEach(group => {
            // Basic plausibility for group name length
            if (group.length > 2 && group.length < 30) { 
                const capitalizedGroup = group.charAt(0).toUpperCase() + group.slice(1);
                muscleGroupCountsForChart[capitalizedGroup] = (muscleGroupCountsForChart[capitalizedGroup] || 0) + 1;
            }
          });

          // Exercise Volume Counts
          const exerciseName = exercise.exercise.trim();
          if (exerciseName) {
            exerciseCounts[exerciseName] = (exerciseCounts[exerciseName] || 0) + 1;
          }
        });
      });

      const mostTrainedMuscleGroup = Object.keys(muscleGroupCountsForChart).length > 0 
        ? Object.entries(muscleGroupCountsForChart).sort((a, b) => b[1] - a[1])[0][0]
        : "N/A";
      
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const favoriteDayIndex = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));
      const favoriteWorkoutDay = totalWorkouts > 0 ? days[favoriteDayIndex] : "N/A";

      setInsights({
        mostTrainedMuscleGroup: mostTrainedMuscleGroup, // Already capitalized
        favoriteWorkoutDay,
      });

      const formattedMuscleData = Object.entries(muscleGroupCountsForChart)
        .map(([name, value]) => ({ name, value }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value); // Sort for consistent colors and legend
      setMuscleGroupChartData(formattedMuscleData);

      // Process Exercise Volume Data
      const formattedExerciseVolumeData = Object.entries(exerciseCounts)
        .map(([name, count]) => ({ name, volume: count })) // Changed to volume: count
        .sort((a, b) => b.volume - a.volume) // Changed to b.volume - a.volume
        .slice(0, 7); // Take top 7
      setExerciseVolumeData(formattedExerciseVolumeData);

    } else {
      setStats({ totalWorkouts: 0, totalTimeExercised: 0, totalActiveDays: 0, consistencyStreak: 0 });
      setWeeklyData([]);
      setInsights({ mostTrainedMuscleGroup: "N/A", favoriteWorkoutDay: "N/A" });
      setMuscleGroupChartData([]);
      setExerciseVolumeData([]);
    }
  }, [workoutLogs]);

  const PIE_CHART_COLORS = [
    "#f97316", // Orange 500
    "#14b8a6", // Teal 500
    "#6366f1", // Indigo 500
    "#f43f5e", // Rose 500
    "#f59e0b", // Amber 500
    "#0ea5e9", // Sky 500
    "#10b981", // Emerald 500
    "#8b5cf6", // Violet 500
    "#84cc16", // Lime 500
    "#ec4899"  // Pink 500
  ];


  return (
    <div className="container mx-auto px-4 py-8 pb-safe-24 md:pb-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Your Fitness Analytics</h1>
        <p className="mt-2 text-lg text-muted-foreground dark:text-slate-400">
          Track your progress, understand your habits, and achieve new milestones.
        </p>
      </header>

      {/* Summary Cards Section */}
      <section className="mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white dark:bg-slate-800/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.totalWorkouts}</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time Exercised</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : `${stats.totalTimeExercised} min`}</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Days</CardTitle>
            <CalendarDays className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.totalActiveDays}</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consistency Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : `${stats.consistencyStreak} days`}</div>
          </CardContent>
        </Card>
      </section>

      {/* Workout Heatmap/Calendar Section */}
      <section className="mb-12">
        <Card className="bg-white dark:bg-slate-800/50">
          <CardHeader>
            <CardTitle>Workout Activity Calendar</CardTitle>
            <CardDescription>Days you logged a workout. Today is highlighted.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center p-4 md:p-6">
            {loading ? (
              <p>Loading calendar...</p>
            ) : (
              <Calendar
                className="react-calendar-forgefit"
                tileClassName={({ date, view }) => {
                  if (view === 'month') {
                    const isActiveDay = activeDates.some(activeDate => isSameDay(activeDate, date));
                    const isToday = isSameDay(date, new Date());
                    const classes = [];
                    if (isActiveDay) classes.push('active-day');
                    if (isToday) classes.push('today-marker');
                    return classes.length > 0 ? classes.join(' ') : null;
                  }
                  return null;
                }}
                tileDisabled={({ date, view }) => view === 'month' && date > new Date()}
                maxDate={new Date()}
                showNeighboringMonth={false}
              />
            )}
          </CardContent>
        </Card>
      </section>

      {/* Charts Section */}
      <section className="grid gap-8 lg:grid-cols-1 mb-12"> 
        <Card className="bg-white dark:bg-slate-800/50 col-span-1">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Weekly Progress</CardTitle>
              <CardDescription>
                {selectedChartType === 'workouts' ? 'Total workouts per week.' : 'Total time exercised per week (minutes).'}
              </CardDescription>
            </div>
            <div className="mt-4 sm:mt-0">
              <select 
                value={selectedChartType}
                onChange={(e) => setSelectedChartType(e.target.value as 'workouts' | 'time')}
                className="block w-full sm:w-auto rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 py-2 px-3"
              >
                <option value="workouts">Workouts per Week</option>
                <option value="time">Time Exercised per Week</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="h-[350px] md:h-[400px] p-2 sm:p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading chart data...</p>
              </div>
            ) : weeklyData.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Not enough data to display chart. Log some workouts!</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={weeklyData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis 
                    dataKey="week" 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    className="text-xs text-muted-foreground dark:text-slate-400"
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    className="text-xs text-muted-foreground dark:text-slate-400"
                    label={selectedChartType === 'time' ? { value: 'Minutes', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12, dy: 40 } : undefined}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.8)',
                      borderColor: '#475569',
                      borderRadius: '0.375rem' 
                    }}
                    labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                    itemStyle={{ color: '#f97316' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px'}} />
                  <Line 
                    type="monotone" 
                    dataKey={selectedChartType}
                    stroke="#f97316"
                    strokeWidth={2} 
                    dot={{ r: 4, fill: '#f97316' }}
                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: '#f97316' }}
                    name={selectedChartType === 'workouts' ? 'Workouts' : 'Time (min)'}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        
        {/* Placeholder charts - these should be inside the same grid or a new one if layout needs adjustment */}
      </section>

      {/* Quick Insights Section */}
      <section className="mb-12">
        <Card className="bg-white dark:bg-slate-800/50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="h-5 w-5 mr-2 text-primary" /> Quick Insights
            </CardTitle>
            <CardDescription>Fun facts from your workout history.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Calculating insights...</p>
            ) : stats.totalWorkouts === 0 ? (
              <p className="text-muted-foreground">Log some workouts to see insights here!</p>
            ) : (
              <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-center">
                  <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                  <span>Most Trained Muscle Group: <strong className="text-primary">{insights.mostTrainedMuscleGroup}</strong></span>
                </li>
                <li className="flex items-center">
                  <Award className="h-4 w-4 mr-2 text-green-500" />
                  <span>Longest Workout Streak: <strong className="text-primary">{stats.consistencyStreak} days</strong></span>
                </li>
                <li className="flex items-center">
                  <CalendarDays className="h-4 w-4 mr-2 text-blue-500" />
                  <span>Favorite Workout Day: <strong className="text-primary">{insights.favoriteWorkoutDay}</strong></span>
                </li>
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Placeholder charts that were previously after the main chart - adjust layout as needed */}
      <section className="grid gap-8 lg:grid-cols-2">
         <Card className="bg-white dark:bg-slate-800/50">
          <CardHeader>
            <CardTitle>Muscle Group Focus</CardTitle>
            <CardDescription>Distribution of targeted muscle groups.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            {loading ? (
              <p className="text-muted-foreground">Loading chart data...</p>
            ) : muscleGroupChartData.length === 0 ? (
              <p className="text-muted-foreground">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={muscleGroupChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {muscleGroupChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.8)', // dark:bg-slate-800
                      borderColor: '#475569', // dark:border-slate-600
                      borderRadius: '0.375rem' 
                    }}
                    labelStyle={{ color: '#e2e8f0' }} // dark:text-slate-100
                    itemStyle={{ color: '#f97316' }} // text-primary
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800/50">
          <CardHeader>
            <CardTitle>Exercise Volume</CardTitle>
            <CardDescription>Volume trends for key exercises.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            {loading ? (
              <p className="text-muted-foreground">Loading chart data...</p>
            ) : exerciseVolumeData.length === 0 ? (
              <p className="text-muted-foreground">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={exerciseVolumeData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                    width={80} 
                    interval={0} // Ensure all labels are shown
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.8)',
                      borderColor: '#475569',
                      borderRadius: '0.375rem' 
                    }}
                    labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                    itemStyle={{ color: '#f97316' }}
                  />
                  <Bar dataKey="volume" fill="#f97316" name="Times Performed" barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        More detailed analytics and reporting features are under development.
      </footer>
    </div>
  );
}
