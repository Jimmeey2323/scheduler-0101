import React from 'react';
import { X, Palette, Check } from 'lucide-react';

interface Theme {
  name: string;
  bg: string;
  text: string;
  textSecondary: string;
  card: string;
  cardHover: string;
  button: string;
  buttonPrimary: string;
  accent: string;
  border: string;
}

interface ThemeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: string;
  themes: Record<string, Theme>;
  onThemeChange: (theme: string) => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  isOpen,
  onClose,
  currentTheme,
  themes,
  onThemeChange
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full m-4 border border-gray-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg mr-3">
              <Palette className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-black">Theme Selection</h2>
              <p className="text-sm text-gray-600">Choose your preferred minimalist theme</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(themes).map(([themeKey, theme]) => (
              <div
                key={themeKey}
                onClick={() => onThemeChange(themeKey)}
                className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                  currentTheme === themeKey
                    ? 'border-black bg-gray-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                {/* Theme Preview */}
                <div className={`h-32 rounded-lg mb-4 ${theme.bg} relative overflow-hidden border ${theme.border}`}>
                  <div className={`absolute top-2 left-2 w-16 h-4 rounded ${theme.card}`}></div>
                  <div className={`absolute top-8 left-2 w-12 h-2 rounded ${theme.button}`}></div>
                  <div className={`absolute bottom-2 right-2 w-8 h-8 rounded-full ${theme.buttonPrimary}`}></div>
                  <div className={`absolute top-2 right-2 text-xs ${theme.text} font-medium`}>Aa</div>
                </div>

                {/* Theme Info */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-black mb-1">{theme.name}</h3>
                    <p className="text-xs text-gray-600">Minimalist design</p>
                  </div>
                  {currentTheme === themeKey && (
                    <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Color Palette Preview */}
                <div className="flex space-x-2 mt-3">
                  <div className={`w-4 h-4 rounded-full ${theme.bg} border border-gray-300`}></div>
                  <div className={`w-4 h-4 rounded-full ${theme.card.split(' ')[0]}`}></div>
                  <div className={`w-4 h-4 rounded-full ${theme.buttonPrimary.split(' ')[0]}`}></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h4 className="font-medium text-black mb-2">Minimalist Theme Features</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Clean black or white backgrounds for optimal readability</li>
              <li>• Subtle color accents that don't overwhelm the interface</li>
              <li>• Consistent typography and spacing throughout</li>
              <li>• Smooth hover states and micro-interactions</li>
              <li>• Professional appearance suitable for business use</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSelector;