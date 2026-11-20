import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, Users, HelpCircle, Flame, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '../components/common/UI';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-cream-100 flex flex-col justify-between selection:bg-amber-500 selection:text-ivory-50">
      {/* Top Bar */}
      <header className="px-6 md:px-12 py-5 flex items-center justify-between border-b border-sand-300/80 bg-cream-100/90 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-ivory-50 font-black text-lg shadow-sm">
            E
          </div>
          <span className="text-xl font-black text-espresso-900 tracking-tight">
            EduWrap<span className="text-amber-500">.</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link to="/register">
            <Button variant="primary">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cream-150 border border-sand-300 text-espresso-700 text-xs font-semibold uppercase tracking-wider mb-6">
          <Flame size={14} className="text-amber-500" />
          Collaborative Study Engine for University Cohorts
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-espresso-900 tracking-tight leading-[1.1] mb-6">
          Study together.<br />
          <span className="text-amber-500">Stay consistent.</span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg text-espresso-700 leading-relaxed mb-10">
          EduWrap turns scattered peer doubts and lost class notes into a searchable, shared knowledge base. Review with 5-box spaced repetition, earn points for helping classmates, and build daily study streaks.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link to="/register">
            <Button size="lg" variant="primary" className="shadow-lg shadow-amber-500/25">
              Start Studying Free <ArrowRight size={18} />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="secondary">
              Existing Account
            </Button>
          </Link>
        </div>

        {/* Feature Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left">
          <div className="bg-ivory-50 border border-sand-300 rounded-2xl p-6 shadow-tile">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Users size={22} />
            </div>
            <h3 className="text-base font-bold text-espresso-900 mb-2">Study Rooms</h3>
            <p className="text-sm text-espresso-700 leading-relaxed">
              Join public course circles or private groups with an 8-character invite code. Keep materials organized per subject.
            </p>
          </div>

          <div className="bg-ivory-50 border border-sand-300 rounded-2xl p-6 shadow-tile">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Layers size={22} />
            </div>
            <h3 className="text-base font-bold text-espresso-900 mb-2">Leitner Flashcards</h3>
            <p className="text-sm text-espresso-700 leading-relaxed">
              5-box spaced repetition algorithm schedules cards automatically. Cards you miss return to box 1 so you retain key concepts.
            </p>
          </div>

          <div className="bg-ivory-50 border border-sand-300 rounded-2xl p-6 shadow-tile">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <HelpCircle size={22} />
            </div>
            <h3 className="text-base font-bold text-espresso-900 mb-2">Doubt Resolution</h3>
            <p className="text-sm text-espresso-700 leading-relaxed">
              Ask questions inside rooms. Earn reputation points for answering peers, upvoting, and saving solutions as new flashcards.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-sand-300/80 px-6 py-6 text-center text-xs text-espresso-500">
        Team T0055 · Section A · Rishihood University (AP & DE Capstone 2026)
      </footer>
    </div>
  );
}
