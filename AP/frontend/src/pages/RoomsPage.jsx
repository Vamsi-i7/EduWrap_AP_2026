import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Key, Search, Lock, Globe } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { Tile, Button, Input, Tag, Modal, Textarea } from '../components/common/UI';
import { api } from '../api/client';

export function RoomsPage() {
  const navigate = useNavigate();

  const [tab, setTab] = useState('my'); // 'my' | 'discover'
  const [rooms, setRooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [joinCodeOpen, setJoinCodeOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [codeError, setCodeError] = useState(null);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formVisibility, setFormVisibility] = useState('public');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getSubjects().then(res => setSubjects(res.data.subjects || [])).catch(() => {});
  }, []);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const params = { filter: tab };
      if (tab === 'discover') {
        if (selectedSubject) params.subject_id = selectedSubject;
        if (searchQuery.trim()) params.q = searchQuery.trim();
      }
      const res = await api.listRooms(params);
      setRooms(res.data.rooms || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, [tab, selectedSubject, searchQuery]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await api.createRoom({
        name: formName,
        description: formDesc,
        subject_id: formSubject,
        visibility: formVisibility,
      });
      setCreateOpen(false);
      setFormName('');
      setFormDesc('');
      navigate(`/rooms/${res.data.room.room_id}`);
    } catch (err) {
      setFormError(err.message || 'Failed to create room');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    setCodeError(null);
    try {
      const res = await api.joinByCode(inviteCode);
      setJoinCodeOpen(false);
      setInviteCode('');
      navigate(`/rooms/${res.data.room.room_id}`);
    } catch (err) {
      setCodeError(err.message || 'Invalid invite code');
    }
  };

  const handleJoinPublic = async (roomId, e) => {
    e.stopPropagation();
    try {
      await api.joinRoom(roomId);
      loadRooms();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <AppShell pageTitle="Study Rooms">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Toggle Tabs */}
        <div className="flex bg-cream-150 p-1 rounded-xl border border-sand-300/80 w-fit">
          <button
            onClick={() => setTab('my')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
              tab === 'my'
                ? 'bg-ivory-50 text-espresso-900 shadow-sm'
                : 'text-espresso-700 hover:text-espresso-900'
            }`}
          >
            My Rooms
          </button>
          <button
            onClick={() => setTab('discover')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
              tab === 'discover'
                ? 'bg-ivory-50 text-espresso-900 shadow-sm'
                : 'text-espresso-700 hover:text-espresso-900'
            }`}
          >
            Discover Public Rooms
          </button>
        </div>

        {/* Buttons: Create & Join by Code */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setJoinCodeOpen(true)}>
            <Key size={14} /> Join by Code
          </Button>
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> Create Room
          </Button>
        </div>
      </div>

      {/* Discover Filters */}
      {tab === 'discover' && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-3 text-espresso-500" />
            <input
              type="text"
              placeholder="Search rooms by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-cream-150/70 border border-sand-300 rounded-xl pl-9 pr-3.5 py-2 text-sm text-espresso-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-cream-150/70 border border-sand-300 rounded-xl px-3.5 py-2 text-sm text-espresso-900 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.subject_id} value={s.subject_id}>
                {s.subject_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Room Grid */}
      {loading ? (
        <div className="py-16 text-center text-sm text-espresso-500">Loading rooms...</div>
      ) : rooms.length === 0 ? (
        <Tile className="text-center py-12">
          <Users size={32} className="mx-auto text-espresso-500 mb-2 opacity-60" />
          <h3 className="font-bold text-espresso-900 mb-1">No rooms found</h3>
          <p className="text-xs text-espresso-700 max-w-sm mx-auto mb-4">
            {tab === 'my'
              ? 'You are not enrolled in any study rooms yet. Create your own room or discover public groups.'
              : 'No public rooms match your search query.'}
          </p>
          {tab === 'my' && (
            <Button size="sm" variant="primary" onClick={() => setCreateOpen(true)}>
              Create Your First Room
            </Button>
          )}
        </Tile>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rooms.map((room) => (
            <Tile
              key={room.room_id}
              onClick={() => navigate(`/rooms/${room.room_id}`)}
              className="cursor-pointer flex flex-col justify-between hover:border-amber-500/50 hover:shadow-md transition"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Tag variant="neutral">{room.subject_name}</Tag>
                  <div className="flex items-center gap-1.5 text-xs text-espresso-500">
                    {room.visibility === 'private' ? (
                      <span className="flex items-center gap-1 text-amber-700 font-medium">
                        <Lock size={12} /> Private
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-espresso-500">
                        <Globe size={12} /> Public
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-bold text-espresso-900 mb-1.5 line-clamp-1">
                  {room.room_name}
                </h3>
                <p className="text-xs text-espresso-700 line-clamp-2 leading-relaxed mb-4">
                  {room.room_description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-3 border-t border-sand-300/60 flex items-center justify-between">
                <span className="text-xs text-espresso-500 font-medium">
                  {room.member_count} member{room.member_count === 1 ? '' : 's'}
                </span>

                {tab === 'discover' && !room.is_member && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => handleJoinPublic(room.room_id, e)}
                  >
                    Join
                  </Button>
                )}

                {room.is_member && (
                  <span className="text-xs text-green-700 font-semibold">Joined ✓</span>
                )}
              </div>
            </Tile>
          ))}
        </div>
      )}

      {/* Create Room Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create New Study Room">
        {formError && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {formError}
          </div>
        )}
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <Input
            label="Room Name"
            required
            placeholder="e.g. Distributed Systems Lab"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-espresso-700 mb-1.5 uppercase tracking-wider">
              Subject
            </label>
            <select
              required
              value={formSubject}
              onChange={(e) => setFormSubject(e.target.value)}
              className="w-full bg-cream-150/70 border border-sand-300 rounded-xl px-3.5 py-2 text-sm text-espresso-900 focus:outline-none focus:border-amber-500"
            >
              <option value="">Select a subject...</option>
              {subjects.map((s) => (
                <option key={s.subject_id} value={s.subject_id}>
                  {s.subject_name}
                </option>
              ))}
            </select>
          </div>

          <Textarea
            label="Description (Optional)"
            placeholder="What will your cohort focus on in this room?"
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-espresso-700 mb-1.5 uppercase tracking-wider">
              Visibility
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormVisibility('public')}
                className={`p-3 rounded-xl border text-left transition ${
                  formVisibility === 'public'
                    ? 'border-amber-500 bg-amber-50/50 text-espresso-900 shadow-xs'
                    : 'border-sand-300 bg-cream-150/50 text-espresso-700'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5 mb-1">
                  <Globe size={14} className="text-amber-600" /> Public
                </div>
                <p className="text-[11px] text-espresso-500 leading-tight">
                  Anyone in your cohort can discover and join in one click.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFormVisibility('private')}
                className={`p-3 rounded-xl border text-left transition ${
                  formVisibility === 'private'
                    ? 'border-amber-500 bg-amber-50/50 text-espresso-900 shadow-xs'
                    : 'border-sand-300 bg-cream-150/50 text-espresso-700'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5 mb-1">
                  <Lock size={14} className="text-amber-600" /> Private
                </div>
                <p className="text-[11px] text-espresso-500 leading-tight">
                  Restricted. Members must enter an 8-character invite code.
                </p>
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Room'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Join by Code Modal */}
      <Modal isOpen={joinCodeOpen} onClose={() => setJoinCodeOpen(false)} title="Join Room by Invite Code">
        {codeError && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {codeError}
          </div>
        )}
        <form onSubmit={handleJoinByCode} className="space-y-4">
          <Input
            label="8-Character Invite Code"
            required
            maxLength={8}
            placeholder="e.g. 7A8B9C2D"
            className="uppercase tracking-widest text-center font-mono font-bold text-base"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setJoinCodeOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={inviteCode.length !== 8}>
              Join Room
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
