const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('eduwrap_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!response.ok) {
      throw new Error(`Server returned error status ${response.status}`);
    }
    throw new Error('API returned non-JSON response. Ensure the backend service is responding with valid JSON.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.details = data.details;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  googleLogin: (credential, daily_goal) => request('/auth/google', { method: 'POST', body: { credential, daily_goal } }),
  getMe: () => request('/auth/me'),

  // Users & Profile
  getProfile: () => request('/users/profile'),
  updateProfile: (payload) => request('/users/profile', { method: 'PATCH', body: payload }),
  getPublicStats: (userId) => request(`/users/${userId}/stats`),

  // Rooms
  getSubjects: () => request('/rooms/subjects'),
  listRooms: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/rooms${query ? `?${query}` : ''}`);
  },
  getRoom: (id) => request(`/rooms/${id}`),
  createRoom: (payload) => request('/rooms', { method: 'POST', body: payload }),
  updateRoom: (id, payload) => request(`/rooms/${id}`, { method: 'PATCH', body: payload }),
  deleteRoom: (id) => request(`/rooms/${id}`, { method: 'DELETE' }),
  joinRoom: (id) => request(`/rooms/${id}/join`, { method: 'POST' }),
  joinByCode: (invite_code) => request('/rooms/join-by-code', { method: 'POST', body: { invite_code } }),
  leaveRoom: (id) => request(`/rooms/${id}/leave`, { method: 'POST' }),
  getRoomMembers: (id) => request(`/rooms/${id}/members`),
  removeMember: (roomId, userId) => request(`/rooms/${roomId}/members/${userId}`, { method: 'DELETE' }),

  // Decks & Cards
  listDecks: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/decks${query ? `?${query}` : ''}`);
  },
  getDeck: (id) => request(`/decks/${id}`),
  createDeck: (payload) => request('/decks', { method: 'POST', body: payload }),
  updateDeck: (id, payload) => request(`/decks/${id}`, { method: 'PATCH', body: payload }),
  deleteDeck: (id) => request(`/decks/${id}`, { method: 'DELETE' }),
  getCards: (deckId) => request(`/decks/${deckId}/cards`),
  addCard: (deckId, payload) => request(`/decks/${deckId}/cards`, { method: 'POST', body: payload }),
  updateCard: (deckId, cardId, payload) => request(`/decks/${deckId}/cards/${cardId}`, { method: 'PATCH', body: payload }),
  deleteCard: (deckId, cardId) => request(`/decks/${deckId}/cards/${cardId}`, { method: 'DELETE' }),

  // Spaced Repetition Practice
  getDueCards: (deckId) => request(`/practice/${deckId}/due`),
  submitSession: (deckId, payload) => request(`/practice/${deckId}/submit`, { method: 'POST', body: payload }),

  // Doubts & Answers
  listDoubts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/doubts${query ? `?${query}` : ''}`);
  },
  getDoubt: (id) => request(`/doubts/${id}`),
  createDoubt: (payload) => request('/doubts', { method: 'POST', body: payload }),
  updateDoubt: (id, payload) => request(`/doubts/${id}`, { method: 'PATCH', body: payload }),
  deleteDoubt: (id) => request(`/doubts/${id}`, { method: 'DELETE' }),
  createAnswer: (doubtId, payload) => request(`/doubts/${doubtId}/answers`, { method: 'POST', body: payload }),
  deleteAnswer: (answerId) => request(`/answers/${answerId}`, { method: 'DELETE' }),
  toggleUpvote: (answerId) => request(`/answers/${answerId}/upvote`, { method: 'POST' }),
  toggleAcceptAnswer: (answerId) => request(`/answers/${answerId}/accept`, { method: 'POST' }),
  saveAsCard: (answerId, payload) => request(`/answers/${answerId}/save-as-card`, { method: 'POST', body: payload }),

  // Dashboard & Habit
  getDashboardSummary: () => request('/dashboard'),
  getHabitChart: () => request('/dashboard/habit'),

  // Leaderboard
  getRoomLeaderboard: (roomId) => request(`/leaderboard/rooms/${roomId}`),

  // Notifications & Activity
  getNotifications: () => request('/notifications'),
  getUnreadCount: () => request('/notifications/unread-count'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/notifications/mark-all-read', { method: 'POST' }),
  getActivityFeed: () => request('/activity/feed'),
  getRoomActivity: (roomId) => request(`/activity/rooms/${roomId}`),
};
