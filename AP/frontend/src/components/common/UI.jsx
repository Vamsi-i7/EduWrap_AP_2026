import React from 'react';

export function Tile({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-ivory-50 border border-sand-300/80 rounded-2xl p-5 shadow-tile transition-all duration-200 hover:border-sand-300 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  ...props
}) {
  const base = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';
  
  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-6 py-2.5 gap-2.5',
  };

  const variants = {
    primary: 'bg-amber-500 text-ivory-50 hover:bg-amber-400 shadow-sm shadow-amber-500/20 active:bg-amber-600',
    secondary: 'bg-cream-150 text-espresso-900 hover:bg-cream-200 border border-sand-300/60',
    outline: 'bg-transparent text-espresso-900 border border-sand-300 hover:bg-cream-150',
    ghost: 'bg-transparent text-espresso-700 hover:bg-cream-150 hover:text-espresso-900',
    danger: 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
  };

  return (
    <button
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-espresso-700 mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        className={`w-full bg-cream-150/70 border border-sand-300 rounded-xl px-3.5 py-2 text-sm text-espresso-900 placeholder:text-espresso-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all ${error ? 'border-red-400 ring-1 ring-red-400' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-espresso-700 mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        className={`w-full bg-cream-150/70 border border-sand-300 rounded-xl px-3.5 py-2.5 text-sm text-espresso-900 placeholder:text-espresso-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all resize-y min-h-[90px] ${error ? 'border-red-400 ring-1 ring-red-400' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

export function Tag({ children, variant = 'neutral', className = '' }) {
  const variants = {
    neutral: 'bg-cream-150 text-espresso-700 border border-sand-300/60',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200 font-semibold',
    success: 'bg-green-50 text-green-700 border border-green-200',
    room: 'bg-blue-50 text-blue-700 border border-blue-200',
  };

  return (
    <span className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-900/40 backdrop-blur-sm animate-fadeIn">
      <div
        className={`bg-ivory-50 border border-sand-300 rounded-2xl w-full ${maxWidth} shadow-2xl p-6 relative`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-sand-300">
          <h3 className="text-lg font-bold text-espresso-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-espresso-500 hover:text-espresso-900 p-1 rounded-lg hover:bg-cream-150 transition"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
