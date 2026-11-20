import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, Plus, Search, CheckCircle2 } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { Tile, Button, Input, Tag, Modal, Textarea } from '../components/common/UI';
import { api } from '../api/client';

export function DoubtsPage() {
  const navigate = useNavigate();

  const [doubts, setDoubts] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'resolved' | 'unresolved'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Ask Doubt Modal State
  const [askOpen, setAskOpen] = useState(false);
  const [formRoomId, setFormRoomId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.listRooms({ filter: 'my' })
      .then(res => setRooms(res.data.rooms || []))
      .catch(() => {});
  }, []);

  const loadDoubts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedRoom) params.room_id = selectedRoom;
      if (statusFilter) params.status = statusFilter;
      if (searchQuery.trim()) params.q = searchQuery.trim();

      const res = await api.listDoubts(params);
      setDoubts(res.data.doubts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoubts();
  }, [selectedRoom, statusFilter, searchQuery]);

  const handlePostDoubt = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await api.createDoubt({
        room_id: formRoomId,
        title,
        body,
      });
      setAskOpen(false);
      setTitle('');
      setBody('');
      navigate(`/doubts/${res.data.doubt.doubt_id}`);
    } catch (err) {
      setFormError(err.message || 'Failed to post doubt');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell pageTitle="Doubt Board">
      {/* Top Header & Ask Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-espresso-900 tracking-tight">Community Questions</h2>
          <p className="text-xs text-espresso-700">Get unstuck by collaborating with classmates in your study rooms</p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setAskOpen(true)} disabled={rooms.length === 0}>
          <Plus size={16} /> Ask a Doubt (+5 pts)
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3 text-espresso-500" />
          <input
            type="text"
            placeholder="Search questions by keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-cream-150/70 border border-sand-300 rounded-xl pl-9 pr-3.5 py-2 text-sm text-espresso-900 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={selectedRoom}
          onChange={(e) => setSelectedRoom(e.target.value)}
          className="bg-cream-150/70 border border-sand-300 rounded-xl px-3.5 py-2 text-sm text-espresso-900 focus:outline-none focus:border-amber-500"
        >
          <option value="">All My Rooms</option>
          {rooms.map((r) => (
            <option key={r.room_id} value={r.room_id}>{r.room_name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-cream-150/70 border border-sand-300 rounded-xl px-3.5 py-2 text-sm text-espresso-900 focus:outline-none focus:border-amber-500"
        >
          <option value="">All Statuses</option>
          <option value="resolved">Solved Only</option>
          <option value="unresolved">Unsolved</option>
        </select>
      </div>

      {/* Doubts List */}
      {loading ? (
        <div className="py-16 text-center text-sm text-espresso-500">Loading questions...</div>
      ) : doubts.length === 0 ? (
        <Tile className="text-center py-12">
          <HelpCircle size={32} className="mx-auto text-espresso-500 mb-2 opacity-60" />
          <h3 className="font-bold text-espresso-900 mb-1">No doubts found</h3>
          <p className="text-xs text-espresso-700 max-w-sm mx-auto mb-4">
            {rooms.length === 0
              ? 'Join a study room first before asking or viewing doubts.'
              : 'Have a question? Post it to your study room to get help from your cohort.'}
          </p>
          {rooms.length > 0 && (
            <Button size="sm" variant="primary" onClick={() => setAskOpen(true)}>
              Ask a Doubt
            </Button>
          )}
        </Tile>
      ) : (
        <div className="space-y-3">
          {doubts.map((doubt) => (
            <Tile
              key={doubt.doubt_id}
              onClick={() => navigate(`/doubts/${doubt.doubt_id}`)}
              className="cursor-pointer hover:border-amber-500/50 hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="pr-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Tag variant="neutral">{doubt.room_name}</Tag>
                  <span className="text-xs text-espresso-500">
                    Asked by {doubt.author_name} · {new Date(doubt.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-base font-bold text-espresso-900 leading-snug line-clamp-2">
                  {doubt.title}
                </h3>
              </div>

              <div className="shrink-0 flex items-center gap-2 self-start sm:self-auto">
                {doubt.is_resolved ? (
                  <Tag variant="success" className="gap-1">
                    <CheckCircle2 size={12} /> Solved
                  </Tag>
                ) : (
                  <Tag variant="amber">{doubt.answer_count} answers</Tag>
                )}
              </div>
            </Tile>
          ))}
        </div>
      )}

      {/* Ask Doubt Modal */}
      <Modal isOpen={askOpen} onClose={() => setAskOpen(false)} title="Ask a New Doubt">
        {formError && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {formError}
          </div>
        )}
        <form onSubmit={handlePostDoubt} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-espresso-700 mb-1.5 uppercase tracking-wider">
              Select Room
            </label>
            <select
              required
              value={formRoomId}
              onChange={(e) => setFormRoomId(e.target.value)}
              className="w-full bg-cream-150/70 border border-sand-300 rounded-xl px-3.5 py-2 text-sm text-espresso-900 focus:outline-none focus:border-amber-500"
            >
              <option value="">Select a room you belong to...</option>
              {rooms.map((r) => (
                <option key={r.room_id} value={r.room_id}>{r.room_name}</option>
              ))}
            </select>
          </div>

          <Input
            label="Question Title (10-150 chars)"
            required
            minLength={10}
            maxLength={150}
            placeholder="e.g. Why does BCNF prevent all functional dependency redundancy?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Textarea
            label="Details & Code Snippet (Optional)"
            placeholder="Describe what you tried, errors encountered, or textbook problem details..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAskOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={submitting || title.trim().length < 10}>
              {submitting ? 'Posting...' : 'Post Question (+5 pts)'}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
