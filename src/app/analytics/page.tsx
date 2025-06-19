"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock, CalendarDays, TrendingUp, Brain, Zap, Award } from "lucide-react";
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

// ----------- Interfaces -----------
interface ExerciseDetail {
  exercise: string;
  description: string;
}
interface MainWorkoutExerciseDetail extends ExerciseDetail {
  sets: number | string;
  reps: string;
}
interface WorkoutDetails {
  warmup?: ExerciseDetail[];
  mainWorkout?: MainWorkoutExerciseDetail[];
  cooldown?: ExerciseDetail[];
  notes?: string;
}
interface WorkoutPlan {
  title: string;
  duration: string;
  workout?: WorkoutDetails;
}
interface WorkoutLog {
  id: string;
  timestamp: Timestamp;
  plan: WorkoutPlan;
}
interface UserStats {
  totalWorkouts: number;
  totalTimeExercised: number;
  totalActiveDays: number;
  consistencyStreak: number;
}
interface WeeklyChartDataPoint {
  week: string;
  workouts?: number;
  time?: number;
}
interface MuscleGroupChartDataPoint {
  name: string;
  value: number;
}
interface ExerciseVolumeDataPoint {
  name: string;
  volume: number;
}
interface ComputedInsights {
  mostTrainedMuscleGroup: string;
  favoriteWorkoutDay: string;
}

// ----------- Helper Functions -----------
const isSameDay = (date1: Date, date2: Date) =>
  date1.getFullYear() === date2.getFullYear() &&
  date1.getMonth() === date2.getMonth() &&
  date1.getDate() === date2.getDate();

const getWeekStartDate = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

const PIE_CHART_COLORS = [
  "#f97316", "#14b8a6", "#6366f1", "#f43f5e", "#f59e0b",
  "#0ea5e9", "#10b981", "#8b5cf6", "#84cc16", "#ec4899"
];

// ----------- Component -----------
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

  // Fetch logs from Firestore
  useEffect(() => {
    if (user?.uid) {
      const fetchWorkoutLogs = async () => {
        setLoading(true);
        try {
          if (!app || !isFirebaseConfigured) {
            setLoading(false);
            return;
          }
          const db = getFirestore(app);
          const logsCollectionRef = collection(db, `users/${user.uid}/logs`);
          const q = query(logsCollectionRef, orderBy("timestamp", "asc"));
          const querySnapshot = await getDocs(q);
          const logs = querySnapshot.docs.map(doc => {
            const data = doc.data();
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
          setWorkoutLogs([]);
          setActiveDates([]);
        } finally {
          setLoading(false);
        }
      };
      fetchWorkoutLogs();
    } else {
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

  // Analytics logic
  useEffect(() => {
    if (workoutLogs.length > 0) {
      // ---- Stats ----
      const totalWorkouts = workoutLogs.length;
      const totalTimeExercised = workoutLogs.reduce((total, log) => {
        const durationString = log.plan?.duration || "0 minutes";
        const minutes = parseInt(durationString.split(" ")[0]) || 0;
        return total + minutes;
      }, 0);

      // ---- Unique days ----
      const uniqueActiveDatesSet = new Set<string>();
      workoutLogs.forEach(log => {
        if (log.timestamp && typeof log.timestamp.toDate === 'function') {
          uniqueActiveDatesSet.add(log.timestamp.toDate().toISOString().split('T')[0]);
        }
      });
      const totalActiveDays = uniqueActiveDatesSet.size;

      // ---- Streaks ----
      let maxStreak = 0;
      if (totalWorkouts > 0) {
        const sortedLogs = workoutLogs
          .filter(log => log.timestamp && typeof log.timestamp.toDate === 'function')
          .map(log => ({ ...log, date: log.timestamp.toDate() }))
          .sort((a, b) => a.date.getTime() - b.date.getTime());

        const uniqueSortedDates = sortedLogs
          .map(log => new Date(log.date.getFullYear(), log.date.getMonth(), log.date.getDate()))
          .filter((date, i, arr) => i === arr.findIndex(d => d.getTime() === date.getTime()));

        if (uniqueSortedDates.length > 0) {
          maxStreak = 1;
          let currentStreak = 1;
          for (let i = 1; i < uniqueSortedDates.length; i++) {
            const prevDay = uniqueSortedDates[i - 1];
            const currentDay = uniqueSortedDates[i];
            const diffTime = Math.abs(currentDay.getTime() - prevDay.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 1) currentStreak++;
            else if (diffDays === 2) currentStreak++;
            else currentStreak = 1;
            if (currentStreak > maxStreak) maxStreak = currentStreak;
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

      // ---- Weekly Chart Data ----
      const weeklyAggregatedData: { [weekStart: string]: { workouts: number; time: number } } = {};
      workoutLogs.forEach(log => {
        if (log.timestamp && typeof log.timestamp.toDate === 'function') {
          const date = log.timestamp.toDate();
          const weekStartDate = getWeekStartDate(date);
          const weekKey = `${weekStartDate.toLocaleString('default', { month: 'short' })} ${weekStartDate.getDate()}`;
          if (!weeklyAggregatedData[weekKey]) weeklyAggregatedData[weekKey] = { workouts: 0, time: 0 };
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
        .sort((a, b) =>
          new Date(a.week + ", " + new Date().getFullYear()).getTime() -
          new Date(b.week + ", " + new Date().getFullYear()).getTime()
        );
      setWeeklyData(chartData);

      // ---- Muscle Group Pie Data & Insights ----
      const muscleGroupCountsForChart: { [group: string]: number } = {};
      const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun, Mon, Tue...
      const exerciseCounts: { [exerciseName: string]: number } = {};

      workoutLogs.forEach(log => {
        if (log.timestamp && typeof log.timestamp.toDate === 'function') {
          dayOfWeekCounts[log.timestamp.toDate().getDay()]++;
        }
        log.plan?.workout?.mainWorkout?.forEach(exercise => {
          const desc = exercise.description.toLowerCase();
          const groupsInExercise = desc.split(',')
            .map(g => g.trim())
            .filter(g => g.length > 0);
          const uniqueGroupsInExercise = new Set(groupsInExercise);
          uniqueGroupsInExercise.forEach(group => {
            if (group.length > 2 && group.length < 30) {
              const capitalizedGroup = group.charAt(0).toUpperCase() + group.slice(1);
              muscleGroupCountsForChart[capitalizedGroup] = (muscleGroupCountsForChart[capitalizedGroup] || 0) + 1;
            }
          });
          // Exercise volume
          const exerciseName = exercise.exercise.trim();
          if (exerciseName) exerciseCounts[exerciseName] = (exerciseCounts[exerciseName] || 0) + 1;
        });
      });

      const mostTrainedMuscleGroup =
        Object.keys(muscleGroupCountsForChart).length > 0
          ? Object.entries(muscleGroupCountsForChart).sort((a, b) => b[1] - a[1])[0][0]
          : "N/A";
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const favoriteDayIndex = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));
      const favoriteWorkoutDay = totalWorkouts > 0 ? days[favoriteDayIndex] : "N/A";

      setInsights({
        mostTrainedMuscleGroup,
        favoriteWorkoutDay,
      });

      setMuscleGroupChartData(
        Object.entries(muscleGroupCountsForChart)
          .map(([name, value]) => ({ name, value }))
          .filter(item => item.value > 0)
          .sort((a, b) => b.value - a.value)
      );

      setExerciseVolumeData(
        Object.entries(exerciseCounts)
          .map(([name, count]) => ({ name, volume: count }))
          .sort((a, b) => b.volume - a.volume)
          .slice(0, 7)
      );
    } else {
      setStats({ totalWorkouts: 0, totalTimeExercised: 0, totalActiveDays: 0, consistencyStreak: 0 });
      set
