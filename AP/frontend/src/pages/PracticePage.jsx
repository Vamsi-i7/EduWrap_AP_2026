import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Check, X, RotateCcw, ArrowRight, Award, Flame, CheckCircle2 } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { Tile, Button, Tag } from '../components/common/UI';
import { api } from '../api/client';

export function PracticePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  // Practice state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [startTime] = useState(Date.now());
  const [isFinished, setIsFinished] = useState(false);
  const [summary, setSummary] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadDueCards() {
      try {
        const res = await api.getDueCards(id);
        setDeck(res.data.deck);
        setCards(res.data.cards || []);
      } catch (err) {
        console.error(err);
        navigate(`/decks/${id}`);
      } finally {
        setLoading(false);
      }
    }
    loadDueCards();
  }, [id]);

  // Keyboard navigation: Space = Flip, 1 = Known, 2 = Missed
  useEffect(() => {
    if (isFinished || cards.length === 0) return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === '1' && isFlipped) {
        e.preventDefault();
        handleAnswer(true);
      } else if (e.key === '2' && isFlipped) {
        e.preventDefault();
        handleAnswer(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isFlipped, isFinished, cards]);

  const handleAnswer = async (known) => {
    const currentCard = cards[currentIndex];
    const newAnswers = [...answers, { card_id: currentCard.card_id, known }];
    setAnswers(newAnswers);
    setIsFlipped(false);

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Completed all cards - Submit Session
      setIsFinished(true);
      setSubmitting(true);
      const durationSeconds = Math.round((Date.now() - startTime) / 1000);

      try {
        const submitRes = await api.submitSession(id, {
          duration_seconds: durationSeconds,
          answers: newAnswers,
        });
        setSummary(submitRes.data);
      } catch (err) {
        console.error('Failed to submit session:', err);
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (loading) {
    return (
      <AppShell pageTitle="Practice Session">
        <div className="py-20 text-center text-sm text-espresso-500">
          Loading spaced repetition cards...
        </div>
      </AppShell>
    );
  }

  if (cards.length === 0 && !isFinished) {
    return (
      <AppShell pageTitle="Practice">
        <Tile className="text-center py-16 max-w-lg mx-auto">
          <CheckCircle2 size={40} className="mx-auto text-green-600 mb-3" />
          <h2 className="text-xl font-black text-espresso-900 mb-2">You're All Caught Up!</h2>
          <p className="text-sm text-espresso-700 leading-relaxed mb-6">
            There are no cards due today in this deck according to your Leitner intervals. Good job staying consistent!
          </p>
          <div className="flex justify-center gap-3">
            <Link to="/decks">
              <Button variant="secondary">Browse Decks</Button>
            </Link>
            <Link to="/home">
              <Button variant="primary">Return Home</Button>
            </Link>
          </div>
        </Tile>
      </AppShell>
    );
  }

  // Session Summary Screen
  if (isFinished) {
    return (
      <AppShell pageTitle="Session Summary">
        <div className="max-w-lg mx-auto animate-fadeIn">
          <Tile className="text-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <Award size={32} />
            </div>

            <h2 className="text-2xl font-black text-espresso-900 tracking-tight mb-1">
              Practice Complete!
            </h2>
            <p className="text-xs text-espresso-700 mb-6">
              Spaced repetition intervals updated in PostgreSQL
            </p>

            {/* Score Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6 p-4 rounded-xl bg-cream-150/60 border border-sand-300">
              <div>
                <span className="text-[11px] font-bold text-espresso-500 uppercase">Reviewed</span>
                <p className="text-xl font-black text-espresso-900 mt-0.5">{summary?.reviewed_count || answers.length}</p>
              </div>
              <div>
                <span className="text-[11px] font-bold text-green-700 uppercase">Accuracy</span>
                <p className="text-xl font-black text-green-700 mt-0.5">{summary?.accuracy_percentage || 0}%</p>
              </div>
              <div>
                <span className="text-[11px] font-bold text-amber-700 uppercase">Points</span>
                <p className="text-xl font-black text-amber-600 mt-0.5">+{summary?.points_earned || 5}</p>
              </div>
            </div>

            {summary?.goal_achieved && (
              <div className="mb-6 p-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs font-bold flex items-center justify-center gap-2">
                <CheckCircle2 size={16} /> Daily Goal Achieved! +15 bonus points awarded
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Link to="/decks">
                <Button variant="secondary">Decks List</Button>
              </Link>
              <Link to="/home">
                <Button variant="primary">Return Home</Button>
              </Link>
            </div>
          </Tile>
        </div>
      </AppShell>
    );
  }

  const currentCard = cards[currentIndex];
  const progressPercentage = Math.round(((currentIndex + 1) / cards.length) * 100);

  return (
    <AppShell pageTitle={`Practice: ${deck?.title || 'Deck'}`}>
      <div className="max-w-2xl mx-auto">
        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-espresso-700 font-bold mb-1.5">
            <span>Card {currentIndex + 1} of {cards.length}</span>
            <span>Box {currentCard.current_box}</span>
          </div>
          <div className="w-full bg-cream-150 h-2.5 rounded-full overflow-hidden border border-sand-300">
            <div
              className="bg-amber-500 h-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* 3D-feel Flashcard Tile */}
        <div
          onClick={() => setIsFlipped(prev => !prev)}
          className={`min-h-[280px] bg-ivory-50 border border-sand-300 rounded-3xl p-8 shadow-md flex flex-col justify-between cursor-pointer select-none transition-all duration-200 hover:shadow-lg ${
            isFlipped ? 'bg-cream-150/30' : ''
          }`}
        >
          <div className="flex justify-between items-center text-xs text-espresso-500 font-bold">
            <span className="uppercase tracking-wider">
              {isFlipped ? 'Answer (Back)' : 'Question (Front)'}
            </span>
            <span className="text-[11px] font-normal text-espresso-500">
              Click or press <kbd className="px-1.5 py-0.5 rounded bg-cream-150 border border-sand-300 font-mono text-[10px]">Space</kbd> to flip
            </span>
          </div>

          {/* Card Content */}
          <div className="my-auto py-6 text-center">
            <p className="text-xl md:text-2xl font-bold text-espresso-900 leading-snug whitespace-pre-wrap">
              {isFlipped ? currentCard.back : currentCard.front}
            </p>
          </div>

          <div className="text-center text-xs text-espresso-500 italic">
            {!isFlipped ? 'Think of the solution, then flip to verify' : 'Rate your recall below'}
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFlipped(prev => !prev)}
            className="w-full sm:w-auto"
          >
            <RotateCcw size={16} /> Flip Card (Space)
          </Button>

          {isFlipped && (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                variant="danger"
                size="md"
                onClick={() => handleAnswer(false)}
                className="flex-1 sm:flex-initial"
              >
                <X size={16} /> Missed [Key 2]
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={() => handleAnswer(true)}
                className="flex-1 sm:flex-initial !bg-green-700 hover:!bg-green-600"
              >
                <Check size={16} /> Known [Key 1]
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
