import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layers, Plus, Trash2, ArrowRight, ArrowLeft } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { Tile, Button, Tag, Modal, Textarea } from '../components/common/UI';
import { api } from '../api/client';

export function DeckDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Card Modal
  const [addOpen, setAddOpen] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadDeckAndCards = async () => {
    try {
      const [dRes, cRes] = await Promise.all([
        api.getDeck(id),
        api.getCards(id),
      ]);
      setDeck(dRes.data.deck);
      setCards(cRes.data.cards || []);
    } catch (err) {
      console.error(err);
      navigate('/decks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeckAndCards();
  }, [id]);

  const handleAddCard = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await api.addCard(id, { front, back });
      setAddOpen(false);
      setFront('');
      setBack('');
      loadDeckAndCards();
    } catch (err) {
      setFormError(err.message || 'Failed to add card');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (confirm('Delete this flashcard?')) {
      try {
        await api.deleteCard(id, cardId);
        setCards(cards.filter(c => c.card_id !== cardId));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  if (loading || !deck) {
    return (
      <AppShell pageTitle="Flashcard Deck">
        <div className="py-16 text-center text-sm text-espresso-500">Loading deck details...</div>
      </AppShell>
    );
  }

  return (
    <AppShell pageTitle={deck.title}>
      {/* Header Info Tile */}
      <Tile className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag variant="neutral">{deck.subject_name}</Tag>
              <Tag variant="amber">{deck.visibility}</Tag>
            </div>
            <h2 className="text-2xl font-black text-espresso-900 tracking-tight mb-1">
              {deck.title}
            </h2>
            <p className="text-xs text-espresso-700 max-w-xl leading-relaxed">
              {deck.description || 'No description provided.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {deck.is_owner && (
              <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
                <Plus size={16} /> Add Card
              </Button>
            )}

            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate(`/decks/${id}/practice`)}
              disabled={cards.length === 0}
            >
              Start Practice ({cards.length}) <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </Tile>

      {/* Cards List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-espresso-900">
            Cards in this Deck ({cards.length} / 200)
          </h3>
        </div>

        {cards.length === 0 ? (
          <Tile className="text-center py-12">
            <Layers size={32} className="mx-auto text-espresso-500 mb-2 opacity-60" />
            <h4 className="font-bold text-espresso-900 mb-1">Deck is currently empty</h4>
            <p className="text-xs text-espresso-700 max-w-sm mx-auto mb-4">
              Add flashcards with questions on the front and solutions on the back to begin reviewing.
            </p>
            {deck.is_owner && (
              <Button size="sm" variant="primary" onClick={() => setAddOpen(true)}>
                Add First Flashcard
              </Button>
            )}
          </Tile>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.map((card, idx) => (
              <Tile key={card.card_id} className="relative group flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-espresso-500">#{idx + 1} Front</span>
                    {deck.is_owner && (
                      <button
                        onClick={() => handleDeleteCard(card.card_id)}
                        className="text-espresso-500 hover:text-red-600 transition p-1"
                        title="Delete card"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-espresso-900 mb-3">{card.front}</p>
                </div>

                <div className="pt-2 border-t border-sand-300/60 bg-cream-150/40 p-2.5 rounded-xl">
                  <span className="text-[10px] font-bold text-espresso-500 block uppercase tracking-wider mb-1">Back (Answer)</span>
                  <p className="text-xs text-espresso-700 whitespace-pre-wrap">{card.back}</p>
                </div>
              </Tile>
            ))}
          </div>
        )}
      </div>

      {/* Add Card Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add New Flashcard">
        {formError && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {formError}
          </div>
        )}
        <form onSubmit={handleAddCard} className="space-y-4">
          <Textarea
            label="Front (Question / Concept)"
            required
            maxLength={500}
            placeholder="e.g. What is the Master Theorem condition for T(n) = 2T(n/2) + O(n)?"
            value={front}
            onChange={(e) => setFront(e.target.value)}
          />

          <Textarea
            label="Back (Answer / Solution)"
            required
            maxLength={1000}
            placeholder="e.g. Case 2: a = 2, b = 2, f(n) = O(n^log_2(2)) = O(n), so T(n) = O(n log n)."
            value={back}
            onChange={(e) => setBack(e.target.value)}
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={submitting || !front.trim() || !back.trim()}>
              {submitting ? 'Adding...' : 'Add Flashcard'}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
