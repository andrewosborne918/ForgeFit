"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { getFirestore, collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { app } from "@/lib/firebase";
import Calendar from 'react-calendar';
import '@/styles/calendar.css';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

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
  workouts: number;
  time: number;
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

const isSameDay = (date1: Date, date2: Date) =>
  date1.getFullYear() === date2.getFullYear() &&
  date1.getMonth() === date2.getMonth() &&
  date1.getDate() === date2.getDate();

export default function AnalyticsPage() {
  const { user } = useAppContext();
  const [activeDates, setActiveDates] = useState<Date[]>([]);
  const [stats, setStats] = useState<UserStats>({ totalWorkouts: 0, totalTimeExercised: 0, totalActiveDays: 0, consistencyStreak: 0 });
  const [weeklyData, setWeeklyData] = useState<WeeklyChartDataPoint[]>([]);
  const [muscleGroupData, setMuscleGroupData] = useState<MuscleGroupChartDataPoint[]>([]);
  const [exerciseVolumeData, setExerciseVolumeData] = useState<ExerciseVolumeDataPoint[]>([]);
  const [insights, setInsights] = useState<ComputedInsights>({ mostTrainedMuscleGroup: "N/A", favoriteWorkoutDay: "N/A" });

  useEffect(() => {
    if (!user?.uid) return;

    const fetchData = async () => {
      const db = getFirestore(app);
      const logsRef = collection(db, `users/${user.uid}/logs`);
      const q = query(logsRef, orderBy("timestamp", "asc"));
      const snapshot = await getDocs(q);
      const logs: WorkoutLog[] = snapshot.docs.map(doc => ({
        id: doc.id,
        timestamp: doc.data().timestamp,
        plan: doc.data().plan,
      }));

      const dates = logs.map(log => log.timestamp.toDate());
      setActiveDates(dates);

      const totalWorkouts = logs.length;
      const totalTimeExercised = logs.reduce((sum, log) => sum + (parseInt(String(log.plan?.duration || '0').split(' ')[0], 10) || 0), 0);
      const uniqueDays = new Set(dates.map(d => d.toDateString()));
      const totalActiveDays = uniqueDays.size;

      let maxStreak = 0;
      const sortedDates = Array.from(uniqueDays).map(d => new Date(d)).sort((a, b) => a.getTime() - b.getTime());
      if (sortedDates.length) {
        let currentStreak = 1;
        maxStreak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
          const diff = (sortedDates[i].getTime() - sortedDates[i-1].getTime()) / (1000*60*60*24);
          if (diff === 1) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
          } else {
            currentStreak = 1;
          }
        }
      }
      setStats({ totalWorkouts, totalTimeExercised, totalActiveDays, consistencyStreak: maxStreak });

      const weeklyMap: Record<string, WeeklyChartDataPoint> = {};
      logs.forEach(log => {
        const date = log.timestamp.toDate();
        const year = date.getFullYear();
        const week = `${year}-W${Math.ceil((((date.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7))}`;
        if (!weeklyMap[week]) weeklyMap[week] = { week, workouts: 0, time: 0 };
        weeklyMap[week].workouts++;
        weeklyMap[week].time += (parseInt(String(log.plan?.duration || '0').split(' ')[0], 10) || 0);
      });
      setWeeklyData(Object.values(weeklyMap).sort((a, b) => a.week.localeCompare(b.week)));

      const muscleMap: Record<string, number> = {};
      const exerciseMap: Record<string, number> = {};
      const dayCounts = new Array(7).fill(0);

      logs.forEach(log => {
        const date = log.timestamp.toDate();
        dayCounts[date.getDay()]++;
        log.plan?.workout?.mainWorkout?.forEach(ex => {
          const groups = ex.description.split(",").map(g => g.trim());
          groups.forEach(group => {
            if (group) {
              muscleMap[group] = (muscleMap[group] || 0) + 1;
            }
          });
          exerciseMap[ex.exercise] = (exerciseMap[ex.exercise] || 0) + 1;
        });
      });

      const muscleGroupArray = Object.entries(muscleMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
      setMuscleGroupData(muscleGroupArray);
      setExerciseVolumeData(Object.entries(exerciseMap).map(([name, volume]) => ({ name, volume })).sort((a, b) => b.volume - a.volume).slice(0, 10));
      const favoriteDayIndex = dayCounts.indexOf(Math.max(...dayCounts));
      const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
      setInsights({ mostTrainedMuscleGroup: muscleGroupArray[0]?.name || "N/A", favoriteWorkoutDay: days[favoriteDayIndex] });
    };

    fetchData();
  }, [user]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Analytics</h1>
      <Calendar tileClassName={({ date }) => activeDates.some(d => isSameDay(d, date)) ? "active-day" : ""} />
      <div className="mt-4">
        <p>Total Workouts: {stats.totalWorkouts}</p>
        <p>Total Time Exercised: {stats.totalTimeExercised} minutes</p>
        <p>Total Active Days: {stats.totalActiveDays}</p>
        <p>Consistency Streak: {stats.consistencyStreak} days</p>
      </div>

      <h2 className="text-xl font-semibold mt-8">Weekly Workouts</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={weeklyData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="workouts" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>

      <h2 className="text-xl font-semibold mt-8">Top Muscle Groups</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={muscleGroupData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
            {muscleGroupData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={`hsl(${index * 40}, 70%, 50%)`} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <h2 className="text-xl font-semibold mt-8">Most Frequent Exercises</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={exerciseVolumeData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="volume" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-8">
        <p><strong>Most Trained Muscle Group:</strong> {insights.mostTrainedMuscleGroup}</p>
        <p><strong>Favorite Workout Day:</strong> {insights.favoriteWorkoutDay}</p>
      </div>
    </div>
  );
}
