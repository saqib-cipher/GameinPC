import React, { useState, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';

export default function NumericStepperInput({
  value,
  onChange,
  step = 0.05,
  min = 0.01,
  max = 100,
  decimals = 2,
  className = '',
  inputClassName = '',
  buttonClassName = '',
  showSteppers = true,
  placeholder = '',
}) {
  const [text, setText] = useState(
    typeof value === 'number' && !isNaN(value) ? value.toFixed(decimals) : ''
  );
  const [isFocused, setIsFocused] = useState(false);

  // Sync external value when not actively typing
  useEffect(() => {
    if (!isFocused) {
      if (typeof value === 'number' && !isNaN(value)) {
        setText(value.toFixed(decimals));
      } else {
        setText('');
      }
    }
  }, [value, isFocused, decimals]);

  const handleInputChange = (e) => {
    const raw = e.target.value;
    setText(raw);

    // Allow user to clear or type decimals freely (e.g. "", "1.", "0.", "-")
    if (raw === '' || raw === '.' || raw === '-' || raw === '-.' || raw.endsWith('.')) {
      return;
    }

    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(text);
    if (isNaN(parsed)) {
      const fallback = typeof value === 'number' && !isNaN(value) ? value : min;
      setText(fallback.toFixed(decimals));
      onChange(fallback);
    } else {
      const clamped = Math.max(min, Math.min(max, parsed));
      setText(clamped.toFixed(decimals));
      onChange(clamped);
    }
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    e.target.select?.();
  };

  const handleStep = (e, delta) => {
    e.preventDefault();
    e.stopPropagation();
    const current = typeof value === 'number' && !isNaN(value) ? value : parseFloat(text) || 0;
    const next = Math.max(min, Math.min(max, parseFloat((current + delta).toFixed(decimals))));
    setText(next.toFixed(decimals));
    onChange(next);
  };

  const handleKeyDown = (e) => {
    e.stopPropagation(); // Stop parent key listeners from catching keys while typing
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleStep(e, step);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleStep(e, -step);
    } else if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  return (
    <div 
      className={`numeric-stepper-container ${className}`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {showSteppers && (
        <button
          type="button"
          className={`stepper-btn stepper-btn-dec ${buttonClassName}`}
          onClick={(e) => handleStep(e, -step)}
          title={`Decrease by ${step}`}
          tabIndex={-1}
        >
          <Minus size={12} />
        </button>
      )}

      <input
        type="text"
        inputMode="decimal"
        className={`numeric-stepper-input ${inputClassName}`}
        value={text}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />

      {showSteppers && (
        <button
          type="button"
          className={`stepper-btn stepper-btn-inc ${buttonClassName}`}
          onClick={(e) => handleStep(e, step)}
          title={`Increase by ${step}`}
          tabIndex={-1}
        >
          <Plus size={12} />
        </button>
      )}
    </div>
  );
}

