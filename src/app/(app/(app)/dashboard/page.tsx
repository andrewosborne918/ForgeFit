import { Bed, CalendarPlus, Coffee, Edit3, Eye, ImageIcon, Loader2, Pencil, PlusCircle, RefreshCw, Repeat, StretchHorizontal, Trash2, XCircle, Zap } from "lucide-react";

{workoutDuration < 60
  ? `${workoutDuration} minutes`
  : `${Math.floor(workoutDuration / 60)} hour${Math.floor(workoutDuration / 60) > 1 ? 's' : ''}${workoutDuration % 60 !== 0 ? `, ${workoutDuration % 60} minutes` : ''}`}