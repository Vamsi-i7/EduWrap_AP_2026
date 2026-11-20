import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, Search, Lock, Globe, Users, ArrowRight } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { Tile, Button, Input, Tag, Modal, Textarea } from '../components/common/UI';
import { api } from '../api/client';

export function DecksPage() {
  const navigate = useNavigate();

  const [decks, setDecks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filterMine, setFilterMine] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Create Deck Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [roomId, setRoomId] = useState('');
  const [userRooms, setUserRooms] = useState([]);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getSubjects(),
      api.listRooms({ filter: 'my' }),
    ]).then(([sRes, rRes]) => {
      setSubjects(sRes.data.subjects || []);
      setUserRooms(rRes.data.rooms || []);
    }).catch(() => {});
  }, []);

  const loadDecks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterMine) params.mine = 'true';
      if (selectedSubject) params.subject_id = selectedSubject;
      if (searchQuery.trim()) params.q = searchQuery.trim();

      const res = await api.listDecks(params);
      setDecks(res.data.decks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDecks();
  }, [filterMine, selectedSubject, searchQuery]);

  const handleCreateDeck = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const payload = {
        title,
        description: desc,
        subject_id: subjectId,
        visibility,
        room_id: visibility === 'room' ? roomId : null,
      };
      const res = await api.createDeck(payload);
      setCreateOpen(false);
      setTitle('');
      setDesc('');
      navigate(`/decks/${res.data.deck.deck_id}`);
    } catch (err) {
      setFormError(err.message || 'Failed to create deck');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell pageTitle="Flashcard Decks">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterMine(false)}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition ${
              !filterMine ? 'bg-amber-500 text-ivory-50 border-amber-500' : 'bg-cream-150 text-espresso-700 border-sand-300'
            }`}
          >
            All Decks
          </button>
          <button
            onClick={() => setFilterMine(true)}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition ${
              filterMine ? 'bg-amber-500 text-ivory-50 border-amber-500' : 'bg-cream-150 text-espresso-700 border-sand-300'
            }`}
          >
            My Decks Only
          </button>
        </div>

        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Create Deck
        </Button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3 text-espresso-500" />
          <input
            type="text"
            placeholder="Search decks by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-cream-150/70 border border-sand-300 rounded-xl pl-9 pr-3.5 py-2 text-sm text-espresso-900 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="bg-cream-150/70 border border-sand-300 rounded-xl px-3.5 py-2 text-sm text-espresso-900 focus:outline-none focus:border-amber-500"
        >
          <option value="">All Subjects</option>
          {subjects.map((s) => (
            <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
          ))}
        </select>
      </div>

      {/* Deck Grid */}
      {loading ? (
        <div className="py-16 text-center text-sm text-espresso-500">Loading decks...</div>
      ) : decks.length === 0 ? (
        <Tile className="text-center py-12">
          <Layers size={32} className="mx-auto text-espresso-500 mb-2 opacity-60" />
          <h3 className="font-bold text-espresso-900 mb-1">No decks available</h3>
          <p className="text-xs text-espresso-700 max-w-sm mx-auto mb-4">
            Create flashcards to master concepts and practice with spaced repetition.
          </p>
          <Button size="sm" variant="primary" onClick={() => setCreateOpen(true)}>
            Create Deck
          </Button>
        </Tile>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {decks.map((deck) => (
            <Tile
              key={deck.deck_id}
              onClick={() => navigate(`/decks/${deck.deck_id}`)}
              className="cursor-pointer flex flex-col justify-between hover:border-amber-500/50 hover:shadow-md transition"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Tag variant="neutral">{deck.subject_name}</Tag>
                  <span className="text-xs text-espresso-500 flex items-center gap-1">
                    {deck.visibility === 'private' && <><Lock size={12} /> Private</>}
                    {deck.visibility === 'room' && <><Users size={12} /> Room</>}
                    {deck.visibility === 'public' && <><Globe size={12} /> Public</>}
                  </span>
                </div>

                <h3 className="text-base font-bold text-espresso-900 mb-1 line-clamp-1">
                  {deck.title}
                </h3>
                <p className="text-xs text-espresso-700 line-clamp-2 leading-relaxed mb-4">
                  {deck.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-3 border-t border-sand-300/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-espresso-700">
                  {deck.card_count || 0} card{deck.card_count === 1 ? '' : 's'}
                </span>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/decks/${deck.deck_id}/practice`);
                  }}
                  disabled={!deck.card_count || deck.card_count === 0}
                >
                  Practice <ArrowRight size={14} />
                </Button>
              </div>
            </Tile>
          ))}
        </div>
      )}

      {/* Create Deck Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Flashcard Deck">
        {formError && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {formError}
          </div>
        )}
        <form onSubmit={handleCreateDeck} className="space-y-4">
          <Input
            label="Deck Title"
            required
            placeholder="e.g. Asymptotic Complexity & Master Theorem"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-espresso-700 mb-1.5 uppercase tracking-wider">
              Subject
            </label>
            <select
              required
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full bg-cream-150/70 border border-sand-300 rounded-xl px-3.5 py-2 text-sm text-espresso-900 focus:outline-none focus:border-amber-500"
            >
              <option value="">Select subject...</option>
              {subjects.map((s) => (
                <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
              ))}
            </select>
          </div>

          <Textarea
            label="Description (Optional)"
            placeholder="What concepts does this deck cover?"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-espresso-700 mb-1.5 uppercase tracking-wider">
              Visibility
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['private', 'room', 'public'].map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setVisibility(v)}
                  className={`py-2 text-xs font-bold rounded-xl border capitalize transition ${
                    visibility === v
                      ? 'bg-amber-500 text-ivory-50 border-amber-500'
                      : 'bg-cream-150 text-espresso-700 border-sand-300 hover:border-espresso-500'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {visibility === 'room' && (
            <div>
              <label className="block text-xs font-semibold text-espresso-700 mb-1.5 uppercase tracking-wider">
                Select Room
              </label>
              <select
                required
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full bg-cream-150/70 border border-sand-300 rounded-xl px-3.5 py-2 text-sm text-espresso-900 focus:outline-none focus:border-amber-500"
              >
                <option value="">Select one of your joined rooms...</option>
                {userRooms.map((r) => (
                  <option key={r.room_id} value={r.room_id}>{r.room_name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Deck'}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
