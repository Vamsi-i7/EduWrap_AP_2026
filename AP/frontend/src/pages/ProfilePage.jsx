import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AppShell } from '../components/layout/AppShell';
import { Tile, Button, Input, Modal, Tag } from '../components/common/UI';
import {
  User,
  Award,
  Flame,
  Target,
  Sparkles,
  Calendar,
  CheckCircle2,
  Lock,
  Edit3,
  HelpCircle
} from 'lucide-react';

const BADGE_ICONS = {
  'First Answer': Sparkles,
  '7-Day Streak': Flame,
  'Helper': HelpCircle,
  'Century': Award,
};

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [goalInput, setGoalInput] = useState(20);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getProfile();
      const p = res.data?.profile || {};
      setProfile(p);
      setBadges(res.data?.badges || []);
      setNameInput(p.name || '');
      setGoalInput(p.daily_goal || 20);
    } catch (err) {
      console.error(err);
      setError('Failed to load profile details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.updateProfile({
        name: nameInput.trim(),
        daily_goal: Number(goalInput),
      });
      const updated = res.data?.user || {};
      setProfile((prev) => ({
        ...prev,
        ...updated,
      }));
      if (setUser) {
        setUser((prev) => ({ ...prev, ...updated }));
      }
      setIsEditOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell pageTitle="Profile & Settings">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppShell>
    );
  }

  if (error || !profile) {
    return (
      <AppShell pageTitle="Profile & Settings">
        <Tile className="max-w-md mx-auto p-8 text-center bg-red-50/50 border-red-200">
          <p className="text-red-700 font-medium mb-4">{error || 'Unable to load profile'}</p>
          <Button onClick={fetchProfile} variant="secondary">Try Again</Button>
        </Tile>
      </AppShell>
    );
  }

  const earnedBadgesCount = badges.filter((b) => b.is_earned).length;

  return (
    <AppShell pageTitle="Profile & Settings">
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Header Profile Card */}
        <Tile className="p-6 md:p-8 bg-ivory-50 border-sand-300">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <div className="w-20 h-20 rounded-2xl bg-amber-200 text-amber-900 border-2 border-amber-400 flex items-center justify-center font-bold text-3xl shadow-sm">
                {profile.name?.slice(0, 2).toUpperCase() || 'U'}
              </div>
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl md:text-3xl font-display font-semibold text-espresso-900">
                    {profile.name}
                  </h1>
                  <Tag variant="primary">Student</Tag>
                </div>
                <p className="text-sm text-espresso-700 mt-0.5">{profile.email}</p>
                <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-espresso-600 mt-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-700" />
                    Joined {new Date(profile.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-amber-700" />
                    Daily Goal: <strong>{profile.daily_goal || 20} cards</strong>
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              className="flex items-center gap-2 self-stretch sm:self-auto justify-center"
              onClick={() => setIsEditOpen(true)}
            >
              <Edit3 className="w-4 h-4" /> Edit Profile
            </Button>
          </div>
        </Tile>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Tile className="p-5 text-center bg-ivory-50 border-sand-300">
            <div className="text-2xl md:text-3xl font-display font-bold text-amber-800">
              {profile.total_points || 0}
            </div>
            <div className="text-xs text-espresso-700 mt-1 font-medium">Total Points</div>
          </Tile>

          <Tile className="p-5 text-center bg-ivory-50 border-sand-300">
            <div className="text-2xl md:text-3xl font-display font-bold text-orange-600 flex items-center justify-center gap-1">
              <Flame className="w-6 h-6 fill-orange-500" />
              {profile.badges_count || 0}
            </div>
            <div className="text-xs text-espresso-700 mt-1 font-medium">Badges Earned</div>
          </Tile>

          <Tile className="p-5 text-center bg-ivory-50 border-sand-300">
            <div className="text-2xl md:text-3xl font-display font-bold text-emerald-700">
              {profile.decks_created || 0}
            </div>
            <div className="text-xs text-espresso-700 mt-1 font-medium">Decks Created</div>
          </Tile>

          <Tile className="p-5 text-center bg-ivory-50 border-sand-300">
            <div className="text-2xl md:text-3xl font-display font-bold text-blue-800">
              {profile.rooms_joined || 0}
            </div>
            <div className="text-xs text-espresso-700 mt-1 font-medium">Rooms Joined</div>
          </Tile>
        </div>

        {/* Badges Section */}
        <Tile className="p-6 md:p-8 bg-ivory-50 border-sand-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-display font-semibold text-espresso-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" /> Badges & Milestones
              </h2>
              <p className="text-xs text-espresso-700 mt-1">
                Unlock badges as you practice consistently and assist peers in study rooms.
              </p>
            </div>
            <span className="text-xs font-semibold text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
              {earnedBadgesCount} / {badges.length || 4} Unlocked
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {badges.map((badge) => {
              const Icon = BADGE_ICONS[badge.name] || Award;
              const isUnlocked = badge.is_earned;
              return (
                <div
                  key={badge.badge_id || badge.name}
                  className={`p-4 rounded-xl border flex items-start gap-4 transition-all ${
                    isUnlocked
                      ? 'bg-amber-50/70 border-amber-300 shadow-sm'
                      : 'bg-cream-100/40 border-sand-300/60 opacity-60'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      isUnlocked
                        ? 'bg-amber-200 text-amber-900 shadow-sm'
                        : 'bg-sand-300 text-espresso-500'
                    }`}
                  >
                    {isUnlocked ? <Icon className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-espresso-900">{badge.name}</h3>
                      {isUnlocked ? (
                        <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Earned
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold text-espresso-500 bg-sand-300 px-2 py-0.5 rounded-full">
                          Locked
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-espresso-700 mt-1 leading-relaxed">
                      {badge.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Tile>

        {/* Edit Profile Modal */}
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title="Edit Profile Settings"
        >
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-espresso-700 mb-1">
                Full Name
              </label>
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your Name"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-espresso-700 mb-2">
                Daily Practice Goal (Cards per Day)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 20, 30, 50].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setGoalInput(num)}
                    className={`py-2 px-3 rounded-lg text-sm font-semibold border transition-all ${
                      goalInput === num
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-espresso-900 border-sand-300 hover:bg-cream-100'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-espresso-600 mt-1.5">
                Target number of cards to review each day to complete your daily habit ring and maintain your streak.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !nameInput.trim()}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}

export default ProfilePage;

