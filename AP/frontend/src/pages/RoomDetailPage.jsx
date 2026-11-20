import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Users, HelpCircle, Layers, Trophy, Copy, Check, Trash2, LogOut, Lock, Globe, Plus } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { Tile, Button, Tag, Modal, Input, Textarea } from '../components/common/UI';
import { api } from '../api/client';

export function RoomDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'doubts' | 'decks' | 'leaderboard'
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Tab data states
  const [members, setMembers] = useState([]);
  const [doubts, setDoubts] = useState([]);
  const [decks, setDecks] = useState([]);
  const [leaderboard, setLeaderboard] = useState(null);

  // Ask Doubt Modal state
  const [doubtOpen, setDoubtOpen] = useState(false);
  const [doubtTitle, setDoubtTitle] = useState('');
  const [doubtBody, setDoubtBody] = useState('');

  const loadRoom = async () => {
    try {
      const res = await api.getRoom(id);
      setRoom(res.data.room);
    } catch (err) {
      console.error(err);
      navigate('/rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoom();
  }, [id]);

  useEffect(() => {
    if (!room) return;

    if (activeTab === 'overview') {
      api.getRoomMembers(id).then(res => setMembers(res.data.members || [])).catch(() => {});
    } else if (activeTab === 'doubts') {
      api.listDoubts({ room_id: id }).then(res => setDoubts(res.data.doubts || [])).catch(() => {});
    } else if (activeTab === 'decks') {
      api.listDecks({ room_id: id }).then(res => setDecks(res.data.decks || [])).catch(() => {});
    } else if (activeTab === 'leaderboard') {
      api.getRoomLeaderboard(id).then(res => setLeaderboard(res.data)).catch(() => {});
    }
  }, [activeTab, room]);

  const copyInviteCode = () => {
    if (room?.invite_code) {
      navigator.clipboard.writeText(room.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeaveRoom = async () => {
    if (confirm('Are you sure you want to leave this study room?')) {
      try {
        await api.leaveRoom(id);
        navigate('/rooms');
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleDeleteRoom = async () => {
    if (confirm('Delete this room permanently? All doubts and answers will be removed.')) {
      try {
        await api.deleteRoom(id);
        navigate('/rooms');
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handlePostDoubt = async (e) => {
    e.preventDefault();
    try {
      await api.createDoubt({
        room_id: id,
        title: doubtTitle,
        body: doubtBody,
      });
      setDoubtOpen(false);
      setDoubtTitle('');
      setDoubtBody('');
      // Reload doubts
      const res = await api.listDoubts({ room_id: id });
      setDoubts(res.data.doubts || []);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading || !room) {
    return (
      <AppShell pageTitle="Study Room">
        <div className="py-16 text-center text-sm text-espresso-500">Loading room details...</div>
      </AppShell>
    );
  }

  return (
    <AppShell pageTitle={room.room_name}>
      {/* Room Header Card */}
      <Tile className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag variant="neutral">{room.subject_name}</Tag>
              {room.visibility === 'private' ? (
                <span className="flex items-center gap-1 text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <Lock size={12} /> Private Room
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-espresso-500 bg-cream-150 px-2 py-0.5 rounded-full">
                  <Globe size={12} /> Public
                </span>
              )}
            </div>

            <h2 className="text-2xl font-black text-espresso-900 tracking-tight mb-1">
              {room.room_name}
            </h2>
            <p className="text-xs text-espresso-700 max-w-xl leading-relaxed">
              {room.room_description || 'No description provided.'}
            </p>
          </div>

          {/* Right Action Widgets */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Invite Code Pill */}
            <div className="flex items-center gap-1.5 bg-cream-150 border border-sand-300 rounded-xl px-3 py-1.5">
              <span className="text-[11px] text-espresso-500 font-medium uppercase tracking-wider">Invite Code:</span>
              <span className="text-xs font-mono font-bold text-espresso-900">{room.invite_code}</span>
              <button
                onClick={copyInviteCode}
                title="Copy code"
                className="p-1 rounded text-espresso-700 hover:text-amber-600 transition"
              >
                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>

            {/* Leave or Delete */}
            {room.is_owner ? (
              <Button size="sm" variant="danger" onClick={handleDeleteRoom}>
                <Trash2 size={14} /> Delete Room
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handleLeaveRoom}>
                <LogOut size={14} /> Leave
              </Button>
            )}
          </div>
        </div>

        {/* 4 Tabs Bar */}
        <div className="flex border-b border-sand-300/80 mt-6 -mb-5 gap-6 text-sm">
          {[
            { id: 'overview', label: 'Overview', icon: Users },
            { id: 'doubts', label: `Doubts (${room.doubt_count || 0})`, icon: HelpCircle },
            { id: 'decks', label: `Decks (${room.shared_deck_count || 0})`, icon: Layers },
            { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 py-3 border-b-2 font-semibold transition ${
                  isActive
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-espresso-700 hover:text-espresso-900'
                }`}
              >
                <Icon size={16} /> {t.label}
              </button>
            );
          })}
        </div>
      </Tile>

      {/* Tab 1: Overview & Members */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 space-y-4">
            <Tile>
              <h3 className="text-base font-bold text-espresso-900 mb-3">Room Members ({members.length})</h3>
              <div className="divide-y divide-sand-300/60">
                {members.map((m) => (
                  <div key={m.user_id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-cream-150 text-espresso-900 font-bold text-xs flex items-center justify-center border border-sand-300">
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-espresso-900">{m.name}</span>
                        <span className="text-[11px] text-espresso-500 block">
                          Joined {new Date(m.joined_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {m.is_owner && <Tag variant="amber">Owner</Tag>}
                  </div>
                ))}
              </div>
            </Tile>
          </div>

          <div>
            <Tile>
              <h3 className="text-sm font-bold text-espresso-900 mb-2">Room Details</h3>
              <div className="space-y-2 text-xs text-espresso-700">
                <div className="flex justify-between py-1 border-b border-sand-300/40">
                  <span className="text-espresso-500">Created:</span>
                  <span>{new Date(room.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-sand-300/40">
                  <span className="text-espresso-500">Subject:</span>
                  <span>{room.subject_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-sand-300/40">
                  <span className="text-espresso-500">Owner:</span>
                  <span className="font-semibold">{room.owner_name}</span>
                </div>
              </div>
            </Tile>
          </div>
        </div>
      )}

      {/* Tab 2: Doubts */}
      {activeTab === 'doubts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-espresso-900">Questions & Discussions</h3>
            <Button size="sm" variant="primary" onClick={() => setDoubtOpen(true)}>
              <Plus size={14} /> Ask a Doubt
            </Button>
          </div>

          {doubts.length === 0 ? (
            <Tile className="text-center py-10">
              <HelpCircle size={28} className="mx-auto text-espresso-500 mb-2 opacity-60" />
              <p className="text-sm text-espresso-700 mb-3">No doubts posted in this room yet.</p>
              <Button size="sm" variant="primary" onClick={() => setDoubtOpen(true)}>
                Post the first doubt
              </Button>
            </Tile>
          ) : (
            <div className="space-y-3">
              {doubts.map((d) => (
                <Tile
                  key={d.doubt_id}
                  onClick={() => navigate(`/doubts/${d.doubt_id}`)}
                  className="cursor-pointer hover:border-amber-500/50 transition flex items-center justify-between"
                >
                  <div className="pr-4">
                    <h4 className="text-base font-bold text-espresso-900 mb-1">{d.title}</h4>
                    <span className="text-xs text-espresso-500">
                      Asked by {d.author_name} · {new Date(d.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {d.is_resolved ? (
                      <Tag variant="success">Solved</Tag>
                    ) : (
                      <Tag variant="amber">{d.answer_count} answers</Tag>
                    )}
                  </div>
                </Tile>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Decks */}
      {activeTab === 'decks' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-espresso-900">Room Flashcard Decks</h3>
            <Link to="/decks">
              <Button size="sm" variant="secondary">Browse All Decks</Button>
            </Link>
          </div>

          {decks.length === 0 ? (
            <Tile className="text-center py-10">
              <Layers size={28} className="mx-auto text-espresso-500 mb-2 opacity-60" />
              <p className="text-sm text-espresso-700">No decks shared to this room yet.</p>
            </Tile>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {decks.map((deck) => (
                <Tile
                  key={deck.deck_id}
                  onClick={() => navigate(`/decks/${deck.deck_id}`)}
                  className="cursor-pointer hover:border-amber-500/50 transition"
                >
                  <h4 className="font-bold text-espresso-900 mb-1">{deck.title}</h4>
                  <p className="text-xs text-espresso-700 line-clamp-2 mb-3">{deck.description || 'No description'}</p>
                  <div className="flex justify-between text-xs text-espresso-500 pt-2 border-t border-sand-300/40">
                    <span>{deck.card_count || 0} cards</span>
                    <span>Created by {deck.owner_name}</span>
                  </div>
                </Tile>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Leaderboard */}
      {activeTab === 'leaderboard' && (
        <Tile>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-espresso-900">Weekly Room Leaderboard</h3>
              <p className="text-xs text-espresso-500">Points earned from questions, answers, and study sessions this week</p>
            </div>
            <Trophy size={20} className="text-amber-500" />
          </div>

          {leaderboard?.leaderboard?.length === 0 ? (
            <p className="text-sm text-espresso-500 text-center py-6">No points recorded this week yet.</p>
          ) : (
            <div className="divide-y divide-sand-300/60">
              {leaderboard?.leaderboard?.map((entry) => (
                <div
                  key={entry.user_id}
                  className={`py-3 px-3 rounded-xl flex items-center justify-between transition ${
                    entry.is_self ? 'bg-amber-50/70 border border-amber-200 font-semibold' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 text-center font-black text-sm ${
                      entry.rank === 1 ? 'text-amber-600' : entry.rank === 2 ? 'text-espresso-700' : 'text-espresso-500'
                    }`}>
                      #{entry.rank}
                    </span>
                    <span className="text-sm text-espresso-900">{entry.name} {entry.is_self && '(You)'}</span>
                  </div>
                  <span className="font-bold text-sm text-amber-600">{entry.weekly_points} pts</span>
                </div>
              ))}
            </div>
          )}
        </Tile>
      )}

      {/* Ask Doubt Modal */}
      <Modal isOpen={doubtOpen} onClose={() => setDoubtOpen(false)} title="Post a Doubt in this Room">
        <form onSubmit={handlePostDoubt} className="space-y-4">
          <Input
            label="Question Title"
            required
            placeholder="e.g. How does virtual memory paging translate logical addresses?"
            value={doubtTitle}
            onChange={(e) => setDoubtTitle(e.target.value)}
          />

          <Textarea
            label="Detailed Body (Optional)"
            placeholder="Provide context, code snippets, or textbook questions..."
            value={doubtBody}
            onChange={(e) => setDoubtBody(e.target.value)}
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDoubtOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={doubtTitle.trim().length < 10}>
              Post Doubt (+5 pts)
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
