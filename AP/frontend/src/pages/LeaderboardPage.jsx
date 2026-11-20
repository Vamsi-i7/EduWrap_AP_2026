import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AppShell } from '../components/layout/AppShell';
import { Tile, Button, Tag } from '../components/common/UI';
import { Trophy, Medal, Crown, Flame, Users, Calendar } from 'lucide-react';

export function LeaderboardPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (selectedRoomId) {
      fetchLeaderboard(selectedRoomId);
    }
  }, [selectedRoomId]);

  const fetchRooms = async () => {
    try {
      setLoadingRooms(true);
      const res = await api.listRooms({ filter: 'my' });
      const userRooms = res.data?.rooms || res.rooms || [];
      setRooms(userRooms);
      if (userRooms.length > 0) {
        setSelectedRoomId(userRooms[0].id || userRooms[0].room_id);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load your study rooms');
    } finally {
      setLoadingRooms(false);
    }
  };

  const fetchLeaderboard = async (roomId) => {
    try {
      setLoadingLeaderboard(true);
      setError(null);
      const res = await api.getRoomLeaderboard(roomId);
      setLeaderboardData(res.data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  if (loadingRooms) {
    return (
      <AppShell pageTitle="Weekly Leaderboard">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppShell>
    );
  }

  if (rooms.length === 0) {
    return (
      <AppShell pageTitle="Weekly Leaderboard">
        <div className="max-w-xl mx-auto py-16 text-center space-y-4">
          <Trophy className="w-16 h-16 text-amber-600/40 mx-auto" />
          <h2 className="text-2xl font-display font-semibold text-espresso-900">No Study Rooms Found</h2>
          <p className="text-sm text-espresso-700 leading-relaxed">
            Join or create a study room to compete with your peers on the weekly leaderboard and track points earned from flashcards and peer doubt solving!
          </p>
        </div>
      </AppShell>
    );
  }

  const topThree = leaderboardData?.leaderboard?.slice(0, 3) || [];
  const currentUserEntry = leaderboardData?.current_user;

  return (
    <AppShell pageTitle="Weekly Leaderboard">
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-semibold text-espresso-900 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-600" />
              Weekly Leaderboard
            </h1>
            <p className="text-sm text-espresso-700 mt-1">
              Points reset every Monday 00:00 IST. Earn points by practicing cards and helping peers!
            </p>
          </div>

          {/* Room Switcher Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-espresso-700">Room:</label>
            <select
              className="px-3 py-2 bg-white border border-sand-300 rounded-xl text-sm font-medium text-espresso-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
              value={selectedRoomId || ''}
              onChange={(e) => setSelectedRoomId(e.target.value)}
            >
              {rooms.map((r) => (
                <option key={r.id || r.room_id} value={r.id || r.room_id}>
                  {r.name} ({r.subject_name || 'General'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadingLeaderboard ? (
          <div className="flex items-center justify-center min-h-[30vh]">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <Tile className="p-8 text-center text-red-700 bg-red-50/50 border-red-200">
            <p>{error}</p>
          </Tile>
        ) : (
          <>
            {/* Week info banner */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-cream-200/50 border border-sand-300 rounded-xl text-xs text-espresso-700">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-amber-700" />
                Week Cycle: {leaderboardData?.week_start || 'This Week'} — {leaderboardData?.week_end || 'Sunday'}
              </span>
              <span className="font-semibold text-amber-900">
                Room: {leaderboardData?.room_name}
              </span>
            </div>

            {/* Top 3 Podium (if we have rankings) */}
            {topThree.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                {/* Rank 2 (Silver) */}
                {topThree[1] ? (
                  <Tile className="p-5 text-center order-2 sm:order-1 flex flex-col items-center justify-between bg-ivory-50 border-slate-300">
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-lg mx-auto shadow-inner">
                        2
                      </div>
                      <div className="font-semibold text-espresso-900 truncate max-w-[150px] mx-auto">
                        {topThree[1].name}
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-xl font-display font-bold text-slate-700">
                        {topThree[1].weekly_points} <span className="text-xs font-normal">pts</span>
                      </div>
                      <span className="text-[11px] text-espresso-500">Silver Tier</span>
                    </div>
                  </Tile>
                ) : (
                  <div className="hidden sm:block order-1" />
                )}

                {/* Rank 1 (Gold) */}
                {topThree[0] && (
                  <Tile className="p-6 text-center order-1 sm:order-2 flex flex-col items-center justify-between bg-amber-50/60 border-amber-300 shadow-md -translate-y-2">
                    <div className="space-y-2">
                      <div className="relative">
                        <Crown className="w-6 h-6 text-amber-500 absolute -top-3.5 left-1/2 -translate-x-1/2" />
                        <div className="w-14 h-14 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-xl mx-auto shadow-inner border-2 border-amber-400">
                          1
                        </div>
                      </div>
                      <div className="font-bold text-espresso-900 text-lg truncate max-w-[180px] mx-auto">
                        {topThree[0].name}
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl font-display font-black text-amber-800">
                        {topThree[0].weekly_points} <span className="text-sm font-medium">pts</span>
                      </div>
                      <span className="text-xs font-semibold text-amber-700">Champion</span>
                    </div>
                  </Tile>
                )}

                {/* Rank 3 (Bronze) */}
                {topThree[2] ? (
                  <Tile className="p-5 text-center order-3 flex flex-col items-center justify-between bg-ivory-50 border-amber-200">
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg mx-auto shadow-inner">
                        3
                      </div>
                      <div className="font-semibold text-espresso-900 truncate max-w-[150px] mx-auto">
                        {topThree[2].name}
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-xl font-display font-bold text-amber-900">
                        {topThree[2].weekly_points} <span className="text-xs font-normal">pts</span>
                      </div>
                      <span className="text-[11px] text-espresso-500">Bronze Tier</span>
                    </div>
                  </Tile>
                ) : (
                  <div className="hidden sm:block order-3" />
                )}
              </div>
            )}

            {/* Ranks 4 to 10 Table */}
            <Tile className="overflow-hidden bg-ivory-50 border-sand-300">
              <div className="px-6 py-4 border-b border-sand-300/60 flex items-center justify-between bg-cream-100/50">
                <h3 className="font-semibold text-espresso-900 text-sm">Room Rankings</h3>
                <span className="text-xs text-espresso-600">Top 10 Members</span>
              </div>

              {leaderboardData?.leaderboard?.length === 0 ? (
                <div className="p-8 text-center text-espresso-600 text-sm">
                  No activity recorded yet for this room this week. Start practicing to get on the board!
                </div>
              ) : (
                <div className="divide-y divide-sand-300/40">
                  {leaderboardData?.leaderboard?.map((item) => {
                    const currentUid = user?.id || user?.user_id;
                    const isCurrentUser = currentUid && currentUid === item.user_id;
                    return (
                      <div
                        key={item.user_id}
                        className={`px-6 py-3.5 flex items-center justify-between transition-colors ${
                          isCurrentUser ? 'bg-amber-100/40 font-semibold' : 'hover:bg-cream-100/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 text-center font-display font-bold text-espresso-700 text-sm">
                            #{item.rank}
                          </span>
                          <div className="w-8 h-8 rounded-full bg-sand-300 text-espresso-900 flex items-center justify-center font-bold text-xs uppercase">
                            {item.name?.slice(0, 2) || 'U'}
                          </div>
                          <div>
                            <div className="text-sm text-espresso-900 flex items-center gap-2">
                              <span>{item.name}</span>
                              {isCurrentUser && (
                                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-amber-500/20 text-amber-900 rounded font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-espresso-500">
                              Total All-Time: {item.total_points || 0} pts
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-display font-bold text-amber-900">
                            {item.weekly_points}
                          </span>
                          <span className="text-xs text-espresso-600 ml-1">pts</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Tile>

            {/* Current User Standings Footer Banner if outside top 10 */}
            {currentUserEntry && currentUserEntry.rank > 10 && (
              <Tile className="p-4 bg-amber-100/60 border-amber-300 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                    #{currentUserEntry.rank}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-espresso-900">Your Standing</div>
                    <div className="text-xs text-amber-900/80">
                      Keep going! Solve more doubts or practice cards to climb into the top 10.
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-display font-bold text-amber-900">
                    {currentUserEntry.weekly_points} pts
                  </div>
                </div>
              </Tile>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

export default LeaderboardPage;

