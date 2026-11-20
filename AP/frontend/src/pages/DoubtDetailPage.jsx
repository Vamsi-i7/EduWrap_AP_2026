import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AppShell } from '../components/layout/AppShell';
import { Tile, Button, Input, Textarea, Tag, Modal } from '../components/common/UI';
import {
  ArrowLeft,
  ThumbsUp,
  CheckCircle,
  BookmarkPlus,
  Trash2,
  MessageSquare,
  Sparkles,
  Award
} from 'lucide-react';

export function DoubtDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [doubt, setDoubt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New answer state
  const [answerBody, setAnswerBody] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  // Save as Card modal state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [userDecks, setUserDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [savingCard, setSavingCard] = useState(false);

  useEffect(() => {
    fetchDoubt();
  }, [id]);

  const fetchDoubt = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDoubt(id);
      setDoubt(res.data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load doubt');
    } finally {
      setLoading(false);
    }
  };

  const handlePostAnswer = async (e) => {
    e.preventDefault();
    if (!answerBody.trim()) return;

    try {
      setSubmittingAnswer(true);
      await api.createAnswer(id, { body: answerBody.trim() });
      setAnswerBody('');
      await fetchDoubt();
    } catch (err) {
      alert(err.message || 'Failed to post answer');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleToggleUpvote = async (answerId) => {
    try {
      await api.toggleUpvote(answerId);
      await fetchDoubt();
    } catch (err) {
      alert(err.message || 'Failed to toggle upvote');
    }
  };

  const handleToggleAccept = async (answerId) => {
    try {
      await api.toggleAcceptAnswer(answerId);
      await fetchDoubt();
    } catch (err) {
      alert(err.message || 'Failed to update accepted status');
    }
  };

  const handleOpenSaveModal = async (ans) => {
    setSelectedAnswer(ans);
    setCardFront(doubt?.title || '');
    setCardBack(ans.body);
    setSaveModalOpen(true);

    try {
      const res = await api.listDecks();
      const decks = res.data?.decks || res.decks || [];
      setUserDecks(decks);
      if (decks.length > 0) {
        setSelectedDeckId(decks[0].id || decks[0].deck_id);
      }
    } catch (err) {
      console.error('Failed to load user decks', err);
    }
  };

  const handleSaveAsCard = async (e) => {
    e.preventDefault();
    if (!selectedDeckId) {
      alert('Please select a target deck');
      return;
    }

    try {
      setSavingCard(true);
      await api.saveAsCard(selectedAnswer.id, {
        deck_id: selectedDeckId,
        front: cardFront.trim(),
        back: cardBack.trim(),
      });
      setSaveModalOpen(false);
      alert('Card saved successfully to your deck! (+15 pts awarded to answerer)');
    } catch (err) {
      alert(err.message || 'Failed to save card');
    } finally {
      setSavingCard(false);
    }
  };

  const handleDeleteDoubt = async () => {
    if (!window.confirm('Are you sure you want to delete this doubt?')) return;
    try {
      await api.deleteDoubt(id);
      navigate('/doubts');
    } catch (err) {
      alert(err.message || 'Failed to delete doubt');
    }
  };

  if (loading) {
    return (
      <AppShell pageTitle="Doubt Discussion">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppShell>
    );
  }

  if (error || !doubt) {
    return (
      <AppShell pageTitle="Doubt Discussion">
        <div className="max-w-3xl mx-auto py-12 text-center">
          <p className="text-red-700 font-medium mb-4">{error || 'Doubt not found'}</p>
          <Link to="/doubts">
            <Button variant="secondary">Back to Doubts</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const currentUserId = user?.id || user?.user_id;
  const isDoubtAuthor = currentUserId && (currentUserId === doubt.author_id || currentUserId === doubt.user_id);

  return (
    <AppShell pageTitle="Doubt Discussion">
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Top back button */}
        <div>
          <Link
            to="/doubts"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-900/70 hover:text-amber-950 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Doubts
          </Link>
        </div>

        {/* Main Doubt Card */}
        <Tile className="p-6 md:p-8 bg-ivory-50 border-sand-300">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Tag variant="neutral">{doubt.room_name}</Tag>
              {doubt.subject_name && <Tag variant="primary">{doubt.subject_name}</Tag>}
              {doubt.answers?.some((a) => a.is_accepted) && (
                <Tag variant="success" className="flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Solved
                </Tag>
              )}
            </div>
            {isDoubtAuthor && (
              <button
                onClick={handleDeleteDoubt}
                className="text-red-600 hover:text-red-800 p-1 rounded transition-colors text-xs flex items-center gap-1"
                title="Delete this doubt"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-display font-semibold text-espresso-900 mb-3">
            {doubt.title}
          </h1>

          <div className="prose text-espresso-800 mb-6 whitespace-pre-wrap leading-relaxed text-base">
            {doubt.body}
          </div>

          <div className="pt-4 border-t border-sand-300/60 flex items-center justify-between text-xs text-espresso-600">
            <span>Asked by <strong className="text-espresso-900">{doubt.author_name}</strong></span>
            <span>{new Date(doubt.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
          </div>
        </Tile>

        {/* Answers Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold text-espresso-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-600" />
              Answers ({doubt.answers?.length || 0})
            </h2>
            <span className="text-xs text-espresso-600 font-medium">
              Answering awards +10 pts &bull; Upvoting gives +2 pts &bull; Accepted answer awards +15 pts
            </span>
          </div>

          {doubt.answers?.length === 0 ? (
            <Tile className="p-8 text-center bg-ivory-50/60 border-dashed border-sand-300">
              <p className="text-espresso-600 text-sm mb-2">No answers yet for this question.</p>
              <p className="text-xs text-amber-800">Be the first to provide a clear explanation below!</p>
            </Tile>
          ) : (
            <div className="space-y-4">
              {doubt.answers.map((answer) => (
                <Tile
                  key={answer.id}
                  className={`p-6 transition-all ${
                    answer.is_accepted
                      ? 'border-emerald-500 bg-emerald-50/20 shadow-sm'
                      : 'bg-ivory-50 border-sand-300'
                  }`}
                >
                  {/* Accepted badge pill */}
                  {answer.is_accepted && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100/90 text-emerald-800 text-xs font-semibold rounded-full mb-3 border border-emerald-300">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      Accepted Solution
                    </div>
                  )}

                  <p className="text-espresso-900 whitespace-pre-wrap leading-relaxed text-sm md:text-base mb-4">
                    {answer.body}
                  </p>

                  {/* Answer footer toolbar */}
                  <div className="pt-3 border-t border-sand-300/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      {/* Upvote Button */}
                      <button
                        onClick={() => handleToggleUpvote(answer.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors border ${
                          answer.has_upvoted
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-cream-100 text-espresso-800 border-sand-300 hover:bg-cream-200'
                        }`}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${answer.has_upvoted ? 'fill-amber-600 text-amber-600' : ''}`} />
                        <span>{answer.upvotes_count || 0}</span>
                        <span className="hidden sm:inline">Upvote</span>
                      </button>

                      {/* Accept button (Asker only) */}
                      {isDoubtAuthor && (
                        <button
                          onClick={() => handleToggleAccept(answer.id)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition-colors border ${
                            answer.is_accepted
                              ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                              : 'bg-cream-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          }`}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          {answer.is_accepted ? 'Accepted' : 'Mark as Accepted'}
                        </button>
                      )}

                      {/* Save as Flashcard button */}
                      <button
                        onClick={() => handleOpenSaveModal(answer)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-amber-900 hover:text-amber-950 hover:bg-amber-100/60 border border-transparent hover:border-amber-200 transition-colors"
                        title="Save this question and answer as a flashcard"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        <span>Save as Card</span>
                      </button>
                    </div>

                    {/* Author meta */}
                    <div className="text-espresso-600">
                      Answered by <strong className="text-espresso-900">{answer.author_name}</strong> &bull;{' '}
                      {new Date(answer.created_at).toLocaleDateString(undefined, { dateStyle: 'short' })}
                    </div>
                  </div>
                </Tile>
              ))}
            </div>
          )}

          {/* Answer Composer */}
          <Tile className="p-6 bg-ivory-50 border-sand-300">
            <h3 className="text-base font-semibold text-espresso-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Your Answer
            </h3>
            <form onSubmit={handlePostAnswer} className="space-y-4">
              <Textarea
                placeholder="Explain clearly, provide steps or conceptual breakdown to help your peer..."
                rows={4}
                value={answerBody}
                onChange={(e) => setAnswerBody(e.target.value)}
                required
              />
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-amber-800 flex items-center gap-1 font-medium">
                  <Award className="w-3.5 h-3.5" /> Earning +10 points on posting!
                </span>
                <Button type="submit" disabled={submittingAnswer || !answerBody.trim()}>
                  {submittingAnswer ? 'Posting...' : 'Post Answer'}
                </Button>
              </div>
            </form>
          </Tile>
        </div>

        {/* Save as Flashcard Modal */}
        <Modal
          isOpen={saveModalOpen}
          onClose={() => setSaveModalOpen(false)}
          title="Save Solution as Flashcard"
        >
          <form onSubmit={handleSaveAsCard} className="space-y-4">
            <p className="text-xs text-espresso-700">
              Convert this peer interaction into a spaced-repetition flashcard. The answerer will also receive a 15-point bonus!
            </p>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-espresso-700 mb-1">
                Select Deck
              </label>
              {userDecks.length === 0 ? (
                <p className="text-xs text-red-700">
                  You have no decks yet. Please create a deck in Decks page first.
                </p>
              ) : (
                <select
                  className="w-full px-3 py-2 bg-white border border-sand-300 rounded-lg text-sm text-espresso-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={selectedDeckId}
                  onChange={(e) => setSelectedDeckId(e.target.value)}
                  required
                >
                  {userDecks.map((d) => (
                    <option key={d.id || d.deck_id} value={d.id || d.deck_id}>
                      {d.title} ({d.subject_name || 'General'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-espresso-700 mb-1">
                Card Front (Question / Prompt)
              </label>
              <Input
                value={cardFront}
                onChange={(e) => setCardFront(e.target.value)}
                placeholder="Question"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-espresso-700 mb-1">
                Card Back (Answer / Solution)
              </label>
              <Textarea
                value={cardBack}
                onChange={(e) => setCardBack(e.target.value)}
                rows={4}
                placeholder="Answer explanation"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSaveModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingCard || !selectedDeckId || !cardFront.trim() || !cardBack.trim()}
              >
                {savingCard ? 'Saving...' : 'Add to Deck'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}

export default DoubtDetailPage;
