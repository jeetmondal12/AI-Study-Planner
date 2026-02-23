import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { 
  LayoutDashboard, Calendar as CalendarIcon, CheckSquare, Layers, BrainCircuit, 
  MessageSquare, FileText, Timer, BarChart2, Settings as SettingsIcon, Moon, Sun, 
  Plus, Trash2, ChevronRight, ChevronLeft, X, Play, Pause, RotateCcw,
  BookOpen, Zap, Award, Search, Filter, MoreVertical, Edit2, Save
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, 
  isSameDay, isSameMonth, startOfMonth, endOfMonth, addMonths, subMonths, isValid 
} from 'date-fns';

// --- Types ---

type Subject = {
  id: string;
  name: string;
  color: string;
  icon: string;
  studyTime: number;
};

type Task = {
  id: string;
  title: string;
  subjectId: string;
  dueDate: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
};

type Flashcard = {
  id: string;
  front: string;
  back: string;
  mastered: boolean;
};

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  userAnswer?: string;
};

type Quiz = {
  id: string;
  topic: string;
  date: string;
  score: number;
  total: number;
  questions: QuizQuestion[];
  feedback?: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

type Note = {
  id: string;
  subjectId: string;
  title: string;
  content: string;
  lastModified: number;
};

// --- Mock Data & Constants ---

const COLORS = ['#00d4ff', '#7c3aed', '#ec4899', '#10b981', '#f59e0b', '#6366f1'];

const INITIAL_SUBJECTS: Subject[] = [
  { id: '1', name: 'Mathematics', color: '#00d4ff', icon: 'Calculator', studyTime: 25 },
  { id: '2', name: 'Physics', color: '#7c3aed', icon: 'Atom', studyTime: 30 },
  { id: '3', name: 'History', color: '#ec4899', icon: 'Book', studyTime: 15 },
  { id: '4', name: 'Computer Science', color: '#10b981', icon: 'Terminal', studyTime: 30 },
];

const INITIAL_TASKS: Task[] = [
  { id: '1', title: 'Calculus Chapter 4 Review', subjectId: '1', dueDate: format(new Date(), 'yyyy-MM-dd'), completed: false, priority: 'high' },
  { id: '2', title: 'Physics Lab Report', subjectId: '2', dueDate: format(addDays(new Date(), 2), 'yyyy-MM-dd'), completed: false, priority: 'medium' },
  { id: '3', title: 'History Essay Draft', subjectId: '3', dueDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'), completed: true, priority: 'high' },
];

// --- API Helper ---

const callAnthropic = async (system: string, user: string) => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'provided-by-env', 
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        system: system,
        messages: [{ role: "user", content: user }]
      })
    });

    if (!response.ok) throw new Error("API call failed");
    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error("AI Error:", error);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock responses for demo
    if (system.includes("study plan")) {
      return JSON.stringify([
        { day: 1, topic: "Foundations", activities: ["Review Core Concepts", "Watch Intro Lecture"] },
        { day: 2, topic: "Deep Dive", activities: ["Practice Problems Set A", "Read Chapter 4"] },
        { day: 3, topic: "Mastery", activities: ["Mock Exam", "Review Weak Areas"] }
      ]);
    } else if (system.includes("flashcards")) {
      return JSON.stringify([
        { front: "What is the central thesis?", back: "The main argument presented in the text." },
        { front: "Define 'Mitochondria'", back: "The powerhouse of the cell." },
        { front: "What year was the Magna Carta signed?", back: "1215" },
        { front: "Explain Newton's Second Law", back: "F = ma (Force equals mass times acceleration)" },
        { front: "What is a variable?", back: "A storage location paired with an associated symbolic name." }
      ]);
    } else if (system.includes("quiz")) {
      return JSON.stringify([
        { id: "1", question: "What is the capital of France?", options: ["London", "Berlin", "Paris", "Madrid"], correctAnswer: "Paris" },
        { id: "2", question: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correctAnswer: "Mars" },
        { id: "3", question: "What is 2 + 2?", options: ["3", "4", "5", "6"], correctAnswer: "4" },
        { id: "4", question: "Who wrote Romeo and Juliet?", options: ["Dickens", "Hemingway", "Shakespeare", "Austen"], correctAnswer: "Shakespeare" },
        { id: "5", question: "What is the chemical symbol for Gold?", options: ["Ag", "Fe", "Au", "Cu"], correctAnswer: "Au" }
      ]);
    } else if (system.includes("summary")) {
      return "- The text discusses the impact of AI on education.\n- Key benefits include personalized learning and instant feedback.\n- Challenges involve data privacy and over-reliance on technology.\n- Future trends suggest a hybrid model of human-AI teaching.";
    } else {
      return "I'm your AI study assistant. I can help you organize your schedule, explain complex topics, or quiz you on your subjects. How can I help you today?";
    }
  }
};

// --- Components ---

type SidebarItemProps = {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
};

const SidebarItem = ({ icon: Icon, label, active, onClick }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
      active 
        ? 'bg-cyan-500/10 text-cyan-400 border-l-4 border-cyan-400' 
        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
    }`}
  >
    <Icon size={20} className={`transition-transform group-hover:scale-110 ${active ? 'text-cyan-400' : ''}`} />
    <span className="font-medium hidden md:block">{label}</span>
  </button>
);

const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`bg-navy-800/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl ${className}`}>
    {children}
  </div>
);

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  className?: string;
  disabled?: boolean;
  icon?: React.ElementType;
};

const Button = ({ children, onClick, variant = 'primary', className = "", disabled = false, icon: Icon }: ButtonProps) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/25 hover:-translate-y-0.5",
    secondary: "bg-slate-700 text-white hover:bg-slate-600",
    outline: "border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white",
    danger: "bg-red-500/10 text-red-400 hover:bg-red-500/20",
    ghost: "text-slate-400 hover:text-white hover:bg-white/5"
  };
  
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={18} />}
      <span>{children}</span>
    </button>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [notes, setNotes] = useState<Note[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [streak, setStreak] = useState(3);
  
  // Pomodoro State
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [timerMode, setTimerMode] = useState<'focus' | 'break'>('focus');

  // AI State
  const [loadingAI, setLoadingAI] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { id: '1', role: 'assistant', content: "Hi! I'm your AI Study Buddy. Ask me anything about your subjects!", timestamp: Date.now() }
  ]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    let interval: any;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0) {
      setTimerActive(false);
      if (timerMode === 'focus') {
        setTimeLeft(5 * 60);
        setTimerMode('break');
      } else {
        setTimeLeft(25 * 60);
        setTimerMode('focus');
      }
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft, timerMode]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- Feature Views ---

  const Dashboard = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-cyan-900/40 to-navy-800 border-cyan-500/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm">Study Streak</p>
              <h3 className="text-3xl font-bold text-white mt-1">{streak} <span className="text-lg font-normal text-slate-400">days</span></h3>
            </div>
            <div className="p-3 bg-cyan-500/20 rounded-lg text-cyan-400"><Zap size={24} /></div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm">Tasks Due</p>
              <h3 className="text-3xl font-bold text-white mt-1">{tasks.filter(t => !t.completed).length}</h3>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-lg text-purple-400"><CheckSquare size={24} /></div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm">Hours Studied</p>
              <h3 className="text-3xl font-bold text-white mt-1">12.5</h3>
            </div>
            <div className="p-3 bg-emerald-500/20 rounded-lg text-emerald-400"><Timer size={24} /></div>
          </div>
        </Card>
        <Card>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm">Avg Quiz Score</p>
              <h3 className="text-3xl font-bold text-white mt-1">85%</h3>
            </div>
            <div className="p-3 bg-amber-500/20 rounded-lg text-amber-400"><Award size={24} /></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h3 className="text-xl font-serif font-bold text-white mb-4">Weekly Progress</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Mon', hours: 2 }, { name: 'Tue', hours: 3.5 }, { name: 'Wed', hours: 1.5 },
                  { name: 'Thu', hours: 4 }, { name: 'Fri', hours: 3 }, { name: 'Sat', hours: 5 }, { name: 'Sun', hours: 2 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} />
                  <Bar dataKey="hours" fill="#00d4ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
                      </Card>
        </div>
        <div className="space-y-6">
          <Card className="h-full">
            <h3 className="text-xl font-serif font-bold text-white mb-4">Upcoming Tasks</h3>
            <div className="space-y-3">
              {tasks.filter(t => !t.completed).slice(0, 5).map(task => {
                const subject = subjects.find(s => s.id === task.subjectId);
                return (
                  <div key={task.id} className="flex items-center p-3 bg-navy-900/50 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                    <div className={`w-3 h-3 rounded-full mr-3`} style={{ backgroundColor: subject?.color || '#ccc' }} />
                    <div className="flex-1">
                      <h4 className="text-slate-200 font-medium text-sm">{task.title}</h4>
                      <p className="text-slate-500 text-xs">{task.dueDate}</p>
                    </div>
                    <button onClick={() => setTasks(tasks.map(t => t.id === task.id ? { ...t, completed: true } : t))} className="text-slate-500 hover:text-cyan-400">
                      <CheckSquare size={18} />
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  const Planner = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [topic, setTopic] = useState('');
    const [plan, setPlan] = useState<any>(null);

    const generatePlan = async () => {
      if (!topic) return;
      setLoadingAI(true);
      const prompt = `Create a 3-day study plan for ${topic}. Return ONLY a JSON array where each object has 'day' (number), 'topic' (string), and 'activities' (array of strings).`;
      try {
        const result = await callAnthropic("You are a study planner AI. Output valid JSON only.", prompt);
        const jsonStr = result.replace(/```json/g, '').replace(/```/g, '').trim();
        setPlan(JSON.parse(jsonStr));
      } catch (e) { console.error(e); } finally { setLoadingAI(false); }
    };

    const firstDayOfMonth = startOfMonth(currentDate);
    const days = eachDayOfInterval({
      start: startOfWeek(firstDayOfMonth),
      end: endOfWeek(endOfMonth(firstDayOfMonth)),
    });

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <h3 className="text-xl font-serif font-bold text-white mb-4 flex items-center gap-2">
              <BrainCircuit className="text-cyan-400" /> AI Plan Generator
            </h3>
            <div className="space-y-4">
              <input 
                type="text" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-navy-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                placeholder="e.g. Calculus Integration"
              />
              <Button onClick={generatePlan} disabled={loadingAI} className="w-full">
                {loadingAI ? 'Generating...' : 'Generate Plan'}
              </Button>
            </div>
          </Card>
          {plan && (
            <div className="space-y-4">
              {plan.map((day: any, idx: number) => (
                <Card key={idx} className="border-l-4 border-l-cyan-500">
                  <h4 className="text-lg font-bold text-white mb-2">Day {day.day}: {day.topic}</h4>
                  <ul className="space-y-2">
                    {day.activities.map((act: string, i: number) => (
                      <li key={i} className="flex items-center text-slate-300 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mr-3" />
                        {act}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          )}
        </div>
        <div className="lg:col-span-2">
          <Card className="h-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-serif font-bold text-white">
                {isValid(currentDate) ? format(currentDate, 'MMMM yyyy') : 'Calendar'}
              </h3>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setCurrentDate(subMonths(currentDate, 1))} icon={ChevronLeft} children={undefined} />
                <Button variant="ghost" onClick={() => setCurrentDate(addMonths(currentDate, 1))} icon={ChevronRight} children={undefined} />
              </div>
            </div>
            <div className="grid grid-cols-7 gap-4 text-center mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-slate-500 text-sm font-medium">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-4">
              {days.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayTasks = tasks.filter(t => t.dueDate === dateStr);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div 
                    key={day.toString()} 
                    className={`min-h-[100px] p-2 rounded-xl border transition-colors ${
                      isToday ? 'bg-cyan-500/10 border-cyan-500' : 'bg-navy-900/30 border-white/5'
                    } ${!isCurrentMonth && 'bg-navy-900/10 text-slate-600'}`}
                  >
                    <div className={`text-right text-sm mb-2 ${isToday ? 'text-cyan-400' : isCurrentMonth ? 'text-slate-400' : 'text-slate-700'}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayTasks.map(t => (
                        <div key={t.id} className="text-xs p-1 rounded bg-navy-800 truncate border-l-2" style={{ borderLeftColor: subjects.find(s => s.id === t.subjectId)?.color }}>
                          {t.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const Tasks = () => {
    const [newTask, setNewTask] = useState('');
    const [filter, setFilter] = useState('all');

    const addTask = () => {
      if (!newTask) return;
      const task: Task = {
        id: Date.now().toString(),
        title: newTask,
        subjectId: subjects[0].id,
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        completed: false,
        priority: 'medium'
      };
      setTasks([...tasks, task]);
      setNewTask('');
    };

    const filteredTasks = tasks.filter(t => filter === 'all' || t.subjectId === filter);

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-serif font-bold text-white">Tasks</h2>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="bg-navy-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 focus:outline-none"
          >
            <option value="all">All Subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <Card>
          <div className="flex gap-4 mb-6">
            <input 
              type="text" 
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              className="flex-1 bg-navy-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
              placeholder="Add a new task..."
            />
            <Button onClick={addTask} icon={Plus}>Add</Button>
          </div>

          <div className="space-y-2">
            {filteredTasks.map(task => {
              const subject = subjects.find(s => s.id === task.subjectId);
              return (
                <div key={task.id} className={`flex items-center p-4 rounded-xl border transition-all ${task.completed ? 'bg-navy-900/30 border-transparent opacity-50' : 'bg-navy-800 border-white/5 hover:border-cyan-500/30'}`}>
                  <button 
                    onClick={() => setTasks(tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))}
                    className={`w-6 h-6 rounded border flex items-center justify-center mr-4 transition-colors ${task.completed ? 'bg-cyan-500 border-cyan-500 text-white' : 'border-slate-600 hover:border-cyan-400'}`}
                  >
                    {task.completed && <CheckSquare size={14} />}
                  </button>
                  <div className="flex-1">
                    <p className={`font-medium ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-opacity-20" style={{ backgroundColor: subject?.color + '33', color: subject?.color }}>
                        {subject?.name}
                      </span>
                      <span className="text-xs text-slate-500">{task.dueDate}</span>
                    </div>
                  </div>
                  <button onClick={() => setTasks(tasks.filter(t => t.id !== task.id))} className="text-slate-600 hover:text-red-400 p-2">
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  };

  const Flashcards = () => {
    const [inputText, setInputText] = useState('');
    const [generatedCards, setGeneratedCards] = useState<Flashcard[]>([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const generateCards = async () => {
      if (!inputText) return;
      setLoadingAI(true);
      const prompt = `Create 5 flashcards from this text: "${inputText}". Return ONLY a JSON array of objects with 'front' and 'back' keys.`;
      try {
        const result = await callAnthropic("You are a flashcard generator. Output valid JSON only.", prompt);
        const jsonStr = result.replace(/```json/g, '').replace(/```/g, '').trim();
        const cards = JSON.parse(jsonStr).map((c: any, i: number) => ({ ...c, id: Date.now() + i, mastered: false }));
        setGeneratedCards(cards);
        setCurrentCardIndex(0);
        setIsFlipped(false);
      } catch (e) { console.error(e); } finally { setLoadingAI(false); }
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
        <div className="space-y-6">
          <Card>
            <h3 className="text-xl font-serif font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="text-purple-400" /> AI Flashcard Creator
            </h3>
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full h-40 bg-navy-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none resize-none mb-4"
              placeholder="Paste your notes here..."
            />
            <Button onClick={generateCards} disabled={loadingAI} className="w-full">
              {loadingAI ? 'Generating...' : 'Generate Deck'}
            </Button>
          </Card>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[400px]">
          {generatedCards.length > 0 ? (
            <div className="w-full max-w-md perspective-1000">
              <div 
                className="relative w-full h-64 cursor-pointer group"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <motion.div 
                  className="w-full h-full absolute backface-hidden rounded-2xl bg-gradient-to-br from-navy-800 to-navy-900 border border-white/10 p-8 flex items-center justify-center text-center shadow-2xl"
                  initial={false}
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <h3 className="text-2xl font-bold text-white">{generatedCards[currentCardIndex].front}</h3>
                  <p className="absolute bottom-4 text-slate-500 text-sm">Tap to flip</p>
                </motion.div>
                <motion.div 
                  className="w-full h-full absolute backface-hidden rounded-2xl bg-gradient-to-br from-purple-900 to-navy-900 border border-purple-500/30 p-8 flex items-center justify-center text-center shadow-2xl"
                  initial={false}
                  animate={{ rotateY: isFlipped ? 0 : -180 }}
                  transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <p className="text-xl text-slate-200">{generatedCards[currentCardIndex].back}</p>
                </motion.div>
              </div>

              <div className="flex justify-between items-center mt-8">
                <Button variant="outline" onClick={() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1))} disabled={currentCardIndex === 0}>
                  <ChevronLeft /> Prev
                </Button>
                <span className="text-slate-400">{currentCardIndex + 1} / {generatedCards.length}</span>
                <Button variant="outline" onClick={() => setCurrentCardIndex(Math.min(generatedCards.length - 1, currentCardIndex + 1))} disabled={currentCardIndex === generatedCards.length - 1}>
                  Next <ChevronRight />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500">
              <Layers size={48} className="mx-auto mb-4 opacity-50" />
              <p>Generate cards to start studying</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const QuizMode = () => {
    const [topic, setTopic] = useState('');
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [answers, setAnswers] = useState<{[key: string]: string}>({});
    const [showResults, setShowResults] = useState(false);

    const generateQuiz = async () => {
      if (!topic) return;
      setLoadingAI(true);
      const prompt = `Create a 5-question multiple choice quiz about "${topic}". Return ONLY a JSON array of objects with 'id', 'question', 'options' (array of 4 strings), and 'correctAnswer' (string).`;
      try {
        const result = await callAnthropic("You are a quiz generator. Output valid JSON only.", prompt);
        const jsonStr = result.replace(/```json/g, '').replace(/```/g, '').trim();
        const questions = JSON.parse(jsonStr);
        setQuiz({ id: Date.now().toString(), topic, date: new Date().toISOString(), score: 0, total: 5, questions });
        setAnswers({});
        setShowResults(false);
      } catch (e) { console.error(e); } finally { setLoadingAI(false); }
    };

    const submitQuiz = () => {
      if (!quiz) return;
      let score = 0;
      quiz.questions.forEach(q => {
        if (answers[q.id] === q.correctAnswer) score++;
      });
      setQuiz({ ...quiz, score });
      setShowResults(true);
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <h3 className="text-xl font-serif font-bold text-white mb-4 flex items-center gap-2">
              <BrainCircuit className="text-cyan-400" /> AI Quiz Generator
            </h3>
            <div className="space-y-4">
              <input 
                type="text" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-navy-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                placeholder="e.g. World War II"
              />
              <Button onClick={generateQuiz} disabled={loadingAI} className="w-full">
                {loadingAI ? 'Generating...' : 'Start Quiz'}
              </Button>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-2">
          {quiz ? (
            <div className="space-y-6">
              {quiz.questions.map((q, idx) => (
                <Card key={q.id} className={showResults ? (answers[q.id] === q.correctAnswer ? 'border-green-500/50' : 'border-red-500/50') : ''}>
                  <h4 className="text-lg font-medium text-white mb-4">{idx + 1}. {q.question}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => !showResults && setAnswers({ ...answers, [q.id]: opt })}
                        className={`p-3 rounded-lg text-left transition-all ${
                          answers[q.id] === opt 
                            ? 'bg-cyan-500 text-white' 
                            : 'bg-navy-900/50 text-slate-300 hover:bg-navy-900'
                        } ${showResults && opt === q.correctAnswer ? '!bg-green-500 !text-white' : ''}`}
                        disabled={showResults}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </Card>
              ))}
              {!showResults ? (
                <Button onClick={submitQuiz} className="w-full py-3 text-lg">Submit Quiz</Button>
              ) : (
                <Card className="bg-gradient-to-r from-cyan-900/50 to-purple-900/50 text-center space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Score: {quiz.score} / {quiz.total}</h3>
                    <p className="text-slate-300">Great job! Keep practicing to improve.</p>
                  </div>
                  
                  {!quiz.feedback ? (
                    <Button 
                      onClick={async () => {
                        setLoadingAI(true);
                        const prompt = `I scored ${quiz.score}/${quiz.total} on a quiz about ${quiz.topic}. Questions: ${JSON.stringify(quiz.questions.map(q => q.question))}. Give me brief, personalized feedback on weak spots.`;
                        try {
                          const res = await callAnthropic("You are a study tutor.", prompt);
                          setQuiz({ ...quiz, feedback: res });
                        } catch (e) { console.error(e); } finally { setLoadingAI(false); }
                      }}
                      disabled={loadingAI}
                      variant="secondary"
                      className="mx-auto"
                    >
                      {loadingAI ? 'Analyzing...' : 'Get AI Feedback'}
                    </Button>
                  ) : (
                    <div className="bg-navy-900/50 p-4 rounded-lg text-left text-slate-300 text-sm">
                      <h4 className="font-bold text-cyan-400 mb-2 flex items-center gap-2"><BrainCircuit size={16}/> AI Feedback</h4>
                      {quiz.feedback}
                    </div>
                  )}

                  <Button onClick={() => setQuiz(null)} variant="outline" className="mt-4 mx-auto">Take Another Quiz</Button>
                </Card>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-12 border-2 border-dashed border-slate-800 rounded-2xl">
              <BrainCircuit size={48} className="mb-4 opacity-50" />
              <p>Generate a quiz to test your knowledge</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const Tutor = () => {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [chatHistory]);

    const sendMessage = async () => {
      if (!input.trim()) return;
      const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now() };
      setChatHistory(prev => [...prev, userMsg]);
      setInput('');
      setLoadingAI(true);

      try {
        const response = await callAnthropic("You are a helpful AI tutor.", input);
        const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: response, timestamp: Date.now() };
        setChatHistory(prev => [...prev, aiMsg]);
      } catch (e) { console.error(e); } finally { setLoadingAI(false); }
    };

    return (
      <div className="h-[calc(100vh-140px)] flex flex-col animate-fade-in">
        <Card className="flex-1 flex flex-col overflow-hidden p-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={scrollRef}>
            {chatHistory.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                  msg.role === 'user' ? 'bg-cyan-600 text-white rounded-tr-none' : 'bg-navy-700 text-slate-200 rounded-tl-none'
                }`}>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loadingAI && (
              <div className="flex justify-start">
                <div className="bg-navy-700 rounded-2xl rounded-tl-none px-5 py-4 flex space-x-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-white/5 bg-navy-900/50">
            <div className="flex gap-3">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1 bg-navy-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                placeholder="Ask your AI tutor anything..."
              />
              <Button onClick={sendMessage} disabled={loadingAI} className="rounded-xl px-6">
                <MessageSquare size={20} />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const Notes = () => {
    const [selectedSubject, setSelectedSubject] = useState(subjects[0].id);
    const [noteContent, setNoteContent] = useState('');

    const saveNote = () => {
      // In a real app, this would save to DB
      alert("Note saved!");
    };

    const summarizeNote = async () => {
      if (!noteContent) return;
      setLoadingAI(true);
      try {
        const summary = await callAnthropic("Summarize this text into bullet points.", noteContent);
        setNoteContent(prev => prev + "\n\n**Summary:**\n" + summary);
      } catch (e) { console.error(e); } finally { setLoadingAI(false); }
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)] animate-fade-in">
        <div className="lg:col-span-1 space-y-2">
          {subjects.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSubject(s.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                selectedSubject === s.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-navy-800 hover:bg-navy-700 text-slate-300'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
        <div className="lg:col-span-3 flex flex-col gap-4">
          <Card className="flex-1 flex flex-col p-0 overflow-hidden">
            <div className="p-2 border-b border-white/5 flex gap-2 bg-navy-900/50">
              <Button variant="ghost" icon={Edit2} children={undefined} />
              <Button variant="ghost" icon={Save} onClick={saveNote} children={undefined} />
              <div className="flex-1" />
              <Button variant="secondary" onClick={summarizeNote} disabled={loadingAI}>
                {loadingAI ? 'Summarizing...' : 'AI Summarize'}
              </Button>
            </div>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="flex-1 bg-transparent p-6 text-slate-300 focus:outline-none resize-none font-mono leading-relaxed"
              placeholder="Start typing your notes..."
            />
                      </Card>
        </div>
      </div>
    );
  };

  const Pomodoro = () => (
    <div className="flex items-center justify-center h-full animate-fade-in">
      <div className="text-center space-y-8">
        <div className="relative w-80 h-80 mx-auto flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="160" cy="160" r="140" stroke="#1e293b" strokeWidth="12" fill="transparent" />
            <circle 
              cx="160" cy="160" r="140" 
              stroke={timerMode === 'focus' ? '#00d4ff' : '#10b981'} 
              strokeWidth="12" 
              fill="transparent" 
              strokeDasharray={2 * Math.PI * 140}
              strokeDashoffset={2 * Math.PI * 140 * (1 - timeLeft / (timerMode === 'focus' ? 25 * 60 : 5 * 60))}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-bold text-white font-mono">{formatTime(timeLeft)}</span>
            <span className="text-slate-400 mt-2 uppercase tracking-widest text-sm">{timerMode}</span>
          </div>
        </div>
        
        <div className="flex justify-center gap-6">
          <button 
            onClick={() => setTimerActive(!timerActive)}
            className="w-16 h-16 rounded-full bg-white text-navy-900 flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-white/10"
          >
            {timerActive ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
          </button>
          <button 
            onClick={() => {
              setTimerActive(false);
              setTimeLeft(timerMode === 'focus' ? 25 * 60 : 5 * 60);
            }}
            className="w-16 h-16 rounded-full bg-navy-700 text-white flex items-center justify-center hover:bg-navy-600 transition-colors"
          >
            <RotateCcw size={24} />
          </button>
        </div>
      </div>
    </div>
  );

  const Progress = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <h3 className="text-lg font-bold text-white mb-4">Study Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={subjects} dataKey="studyTime" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                  {subjects.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="md:col-span-2">
          <h3 className="text-lg font-bold text-white mb-4">Activity History</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { name: 'Mon', score: 40 }, { name: 'Tue', score: 60 }, { name: 'Wed', score: 55 },
                { name: 'Thu', score: 80 }, { name: 'Fri', score: 70 }, { name: 'Sat', score: 90 }, { name: 'Sun', score: 65 }
              ]}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                <Area type="monotone" dataKey="score" stroke="#00d4ff" fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );

  const Settings = () => (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <Card>
        <h3 className="text-xl font-bold text-white mb-6">Subject Manager</h3>
        <div className="space-y-4">
          {subjects.map(s => (
            <div key={s.id} className="flex items-center justify-between p-4 bg-navy-900/50 rounded-lg border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-slate-200 font-medium">{s.name}</span>
              </div>
              <Button variant="ghost" icon={Trash2} className="text-red-400 hover:text-red-300 hover:bg-red-500/10" children={undefined} />
            </div>
          ))}
          <Button variant="outline" icon={Plus} className="w-full border-dashed">Add New Subject</Button>
        </div>
      </Card>
      <Card>
        <h3 className="text-xl font-bold text-white mb-6">Preferences</h3>
        <div className="flex items-center justify-between p-4 bg-navy-900/50 rounded-lg border border-white/5">
          <span className="text-slate-200">Dark Mode</span>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-cyan-500' : 'bg-slate-600'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${darkMode ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
      </Card>
    </div>
  );

  // --- Layout ---

  return (
    <div className={`min-h-screen bg-navy-900 text-slate-300 font-sans selection:bg-cyan-500/30 ${darkMode ? 'dark' : ''}`}>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-20 lg:w-64 bg-navy-800/50 backdrop-blur-xl border-r border-white/5 flex flex-col transition-all duration-300">
          <div className="p-6 flex justify-center lg:justify-start">
            <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
              <BrainCircuit className="text-cyan-400" />
              <span className="hidden lg:inline">Study<span className="text-cyan-400">AI</span></span>
            </h1>
          </div>
          
          <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-hide">
            <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <SidebarItem icon={CalendarIcon} label="Planner" active={activeTab === 'planner'} onClick={() => setActiveTab('planner')} />
            <SidebarItem icon={CheckSquare} label="Tasks" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} />
            <SidebarItem icon={Layers} label="Flashcards" active={activeTab === 'flashcards'} onClick={() => setActiveTab('flashcards')} />
            <SidebarItem icon={BrainCircuit} label="Quiz Mode" active={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')} />
            <SidebarItem icon={MessageSquare} label="AI Tutor" active={activeTab === 'tutor'} onClick={() => setActiveTab('tutor')} />
            <SidebarItem icon={FileText} label="Notes" active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} />
            <SidebarItem icon={Timer} label="Pomodoro" active={activeTab === 'pomodoro'} onClick={() => setActiveTab('pomodoro')} />
            <SidebarItem icon={BarChart2} label="Progress" active={activeTab === 'progress'} onClick={() => setActiveTab('progress')} />
            <SidebarItem icon={SettingsIcon} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative">
          <header className="sticky top-0 z-10 bg-navy-900/80 backdrop-blur-md border-b border-white/5 px-8 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white capitalize">{activeTab}</h2>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {subjects.map(s => (
                  <div key={s.id} className="w-8 h-8 rounded-full border-2 border-navy-900 flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: s.color }}>
                    {s.name[0]}
                  </div>
                ))}
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-white">Alex Student</p>
                  <p className="text-xs text-slate-500">Pro Plan</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-500" />
              </div>
            </div>
          </header>

          <div className="p-8 max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'dashboard' && <Dashboard />}
                {activeTab === 'planner' && <Planner />}
                {activeTab === 'tasks' && <Tasks />}
                {activeTab === 'flashcards' && <Flashcards />}
                {activeTab === 'quiz' && <QuizMode />}
                {activeTab === 'tutor' && <Tutor />}
                {activeTab === 'notes' && <Notes />}
                {activeTab === 'pomodoro' && <Pomodoro />}
                {activeTab === 'progress' && <Progress />}
                {activeTab === 'settings' && <Settings />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
