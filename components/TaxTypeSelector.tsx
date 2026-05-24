import React from 'react';
import { TaxType, TAX_TYPES } from '../types';

interface TaxTypeSelectorProps {
  selected: TaxType | null;
  onSelect: (t: TaxType) => void;
}

export const TaxTypeSelector: React.FC<TaxTypeSelectorProps> = ({
  selected,
  onSelect,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {TAX_TYPES.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`card cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
            selected === t.id
              ? 'bg-primary text-primary-content ring-2 ring-primary ring-offset-2 ring-offset-base-100'
              : 'bg-base-200 hover:bg-base-300'
          }`}
        >
          <div className="card-body p-4 items-center text-center gap-2">
            <span className="text-2xl">{t.icon}</span>
            <h3 className="text-sm font-bold leading-tight">{t.label}</h3>
            <p
              className={`text-xs leading-tight ${
                selected === t.id
                  ? 'text-primary-content/70'
                  : 'text-base-content/60'
              }`}
            >
              {t.description}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};
