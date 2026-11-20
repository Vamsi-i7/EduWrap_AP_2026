import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flame, Layers, Users, HelpCircle, ArrowRight, CheckCircle2, Award } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { Tile, Button, Tag } from '../components/common/UI';
import { api } from '../api/client';

export function HomePage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [habitChart, setHabitChart] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [sumRes, habitRes] = await Promise.all([
          api.getDashboardSummary(),
          api.getHabitChart(),
        ]);
        setSummary(sumRes.data);
        setHabitChart(habitRes.data);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <AppShell pageTitle="Home">
        <div className="flex items-center justify-center h-64 text-sm text-espresso-500">
          Loading your study dashboard...
        </div>
      </AppShell>
    );
  }

  const habit = summary?.habit || { daily_goal: 20, today_cards: 0, percentage: 0, current_streak: 0 };

  return (
    <AppShell pageTitle="Home Dashboard">
      {/* Top Welcome Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-espresso-900 tracking-tight">
            Hi, {summary?.user?.name || 'Student'} 👋
          </h2>
          <p className="text-sm text-espresso-700 mt-0.5">
            You've earned <span className="font-bold text-amber-600">{summary?.user?.total_points || 0} points</span> so far. Keep pushing your streak!
          </p>
        </div>

        {summary?.due_cards_count > 0 && (
          <Link to="/decks">
            <Button variant="primary">
              <Layers size={16} /> Practice Due Cards ({summary.due_cards_count})
            </Button>
          </Link>
        )}
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Tile 1: Daily Goal Progress */}
        <Tile className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-espresso-700 uppercase tracking-wider">
                Daily Goal
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cream-150 text-espresso-900">
                {habit.today_cards} / {habit.daily_goal} cards
              </span>
            </div>

            {/* Circular Progress Representation */}
            <div className="my-4 flex items-center justify-center">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-sand-300"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-amber-500 transition-all duration-500 ease-out"
                    strokeDasharray={`${habit.percentage}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-2xl font-black text-espresso-900 leading-none">
                    {habit.percentage}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-center text-espresso-700">
            {habit.goal_met ? (
              <span className="text-green-700 font-bold inline-flex items-center gap-1">
                <CheckCircle2 size={14} /> Daily goal achieved! +15 bonus points awarded
              </span>
            ) : (
              `${habit.daily_goal - habit.today_cards} more cards to hit your daily goal`
            )}
          </p>
        </Tile>

        {/* Tile 2: Streak & Habit Consistency */}
        <Tile className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-espresso-700 uppercase tracking-wider">
              Study Streak
            </span>
            <div className="flex items-center gap-1 text-amber-600 font-bold text-sm">
              <Flame size={18} className="fill-amber-500 text-amber-500 animate-pulse" />
              {habit.current_streak} Day{habit.current_streak === 1 ? '' : 's'}
            </div>
          </div>

          {/* 7-Day Activity Mini Bar Chart */}
          <div className="my-auto py-2">
            <div className="flex items-end justify-between gap-1.5 h-24 pt-4">
              {habitChart?.chart?.map((d) => {
                const maxCards = Math.max(...(habitChart.chart.map(c => c.cards_reviewed) || [10]), 10);
                const heightPct = Math.max(12, Math.round((d.cards_reviewed / maxCards) * 100));
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-md transition-all ${
                        d.goal_met
                          ? 'bg-amber-500'
                          : d.cards_reviewed > 0
                          ? 'bg-amber-400/60'
                          : 'bg-sand-300/40'
                      }`}
                      title={`${d.date}: ${d.cards_reviewed} cards`}
                    />
                    <span className="text-[10px] text-espresso-500 font-medium">
                      {d.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-espresso-700 text-center">
            Longest recorded streak:{' '}
            <span className="font-bold text-espresso-900">{habitChart?.longest_streak || habit.current_streak} days</span>
          </p>
        </Tile>

        {/* Tile 3: Due Cards / Spaced Repetition */}
        <Tile className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-espresso-700 uppercase tracking-wider">
                Cards Due Today
              </span>
              <Layers size={18} className="text-amber-500" />
            </div>

            <div className="my-4">
              <div className="text-3xl font-black text-espresso-900 mb-1">
                {summary?.due_cards_count || 0}
              </div>
              <p className="text-xs text-espresso-700 leading-relaxed">
                Cards ready for review according to your 5-box Leitner spaced repetition schedule.
              </p>
            </div>
          </div>

          <Link to="/decks">
            <Button variant="secondary" className="w-full text-xs">
              Go to Decks <ArrowRight size={14} />
            </Button>
          </Link>
        </Tile>
      </div>

      {/* Lower Row: Joined Rooms & Recent Doubts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
        {/* Active Study Rooms */}
        <Tile>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-amber-500" />
              <h3 className="font-bold text-espresso-900">My Study Rooms</h3>
            </div>
            <Link to="/rooms" className="text-xs text-amber-600 hover:text-amber-700 font-semibold">
              Explore All →
            </Link>
          </div>

          {summary?.my_rooms?.length === 0 ? (
            <div className="py-8 text-center text-sm text-espresso-500">
              You haven't joined any rooms yet.{' '}
              <Link to="/rooms" className="text-amber-600 underline font-medium">
                Browse public rooms
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-sand-300/60">
              {summary.my_rooms.map((room) => (
                <div
                  key={room.room_id}
                  onClick={() => navigate(`/rooms/${room.room_id}`)}
                  className="py-3 flex items-center justify-between hover:bg-cream-150/50 px-2 rounded-xl cursor-pointer transition"
                >
                  <div>
                    <h4 className="text-sm font-bold text-espresso-900">{room.room_name}</h4>
                    <span className="text-xs text-espresso-500">{room.subject_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag variant="neutral">{room.member_count} members</Tag>
                    {room.doubt_count > 0 && <Tag variant="amber">{room.doubt_count} doubts</Tag>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Tile>

        {/* Doubts Needing Attention */}
        <Tile>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HelpCircle size={18} className="text-amber-500" />
              <h3 className="font-bold text-espresso-900">Recent Doubts</h3>
            </div>
            <Link to="/doubts" className="text-xs text-amber-600 hover:text-amber-700 font-semibold">
              View Doubts Board →
            </Link>
          </div>

          {summary?.recent_doubts?.length === 0 ? (
            <div className="py-8 text-center text-sm text-espresso-500">
              No recent doubts posted in your rooms.
            </div>
          ) : (
            <div className="divide-y divide-sand-300/60">
              {summary.recent_doubts.map((doubt) => (
                <div
                  key={doubt.doubt_id}
                  onClick={() => navigate(`/doubts/${doubt.doubt_id}`)}
                  className="py-3 flex items-center justify-between hover:bg-cream-150/50 px-2 rounded-xl cursor-pointer transition"
                >
                  <div className="pr-4">
                    <h4 className="text-sm font-semibold text-espresso-900 line-clamp-1">{doubt.title}</h4>
                    <span className="text-xs text-espresso-500">{doubt.room_name}</span>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {doubt.is_resolved ? (
                      <Tag variant="success">Solved</Tag>
                    ) : (
                      <Tag variant="amber">{doubt.answer_count} answers</Tag>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Tile>
      </div>
    </AppShell>
  );
}
