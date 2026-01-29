'use client';

import { useState } from 'react';
import { PDFElement, PDFExportOptions } from '@/lib/pdfExport';

interface PDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (elements: PDFElement[], options: PDFExportOptions) => void;
  availableElements: PDFElement[];
  defaultFilename: string;
}

export default function PDFExportModal({
  isOpen,
  onClose,
  onExport,
  availableElements,
  defaultFilename
}: PDFExportModalProps) {
  const [elements, setElements] = useState<PDFElement[]>(availableElements);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [format, setFormat] = useState<'a4' | 'a3'>('a4');
  const [includeHeader, setIncludeHeader] = useState(true);
  const [headerText, setHeaderText] = useState(`Circonscription Cayenne 2 - ${new Date().toLocaleDateString('fr-FR')}`);

  const toggleElement = (id: string) => {
    setElements(prev =>
      prev.map(el =>
        el.id === id ? { ...el, selected: !el.selected } : el
      )
    );
  };

  const selectAll = () => {
    setElements(prev => prev.map(el => ({ ...el, selected: true })));
  };

  const deselectAll = () => {
    setElements(prev => prev.map(el => ({ ...el, selected: false })));
  };

  const handleExport = () => {
    const options: PDFExportOptions = {
      orientation,
      format,
      scale: 2,
      includeHeader,
      headerText: includeHeader ? headerText : undefined
    };
    onExport(elements, options);
  };

  if (!isOpen) return null;

  const selectedCount = elements.filter(e => e.selected).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">📄 Exporter en PDF</h2>
              <p className="text-sm text-gray-600 mt-1">Personnalisez votre export</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* Section 1: Sélection des éléments */}
            <div className="border-2 border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800">📋 Éléments à exporter</h3>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                  >
                    Tout sélectionner
                  </button>
                  <button
                    onClick={deselectAll}
                    className="text-xs px-3 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
                  >
                    Tout désélectionner
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {elements.map((element) => (
                  <label
                    key={element.id}
                    className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={element.selected}
                      onChange={() => toggleElement(element.id)}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-sm text-gray-700">{element.label}</span>
                  </label>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  <strong>{selectedCount}</strong> élément{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Section 2: Options de mise en page */}
            <div className="border-2 border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-800 mb-3">⚙️ Options de mise en page</h3>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Format */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Taille du papier
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFormat('a4')}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 font-semibold transition-all ${
                        format === 'a4'
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                      }`}
                    >
                      A4
                    </button>
                    <button
                      onClick={() => setFormat('a3')}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 font-semibold transition-all ${
                        format === 'a3'
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                      }`}
                    >
                      A3
                    </button>
                  </div>
                </div>

                {/* Orientation */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Orientation
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOrientation('portrait')}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 font-semibold transition-all ${
                        orientation === 'portrait'
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                      }`}
                    >
                      📄 Portrait
                    </button>
                    <button
                      onClick={() => setOrientation('landscape')}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 font-semibold transition-all ${
                        orientation === 'landscape'
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                      }`}
                    >
                      📃 Paysage
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: En-tête */}
            <div className="border-2 border-gray-200 rounded-lg p-4">
              <label className="flex items-center mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeHeader}
                  onChange={(e) => setIncludeHeader(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                />
                <span className="ml-3 font-bold text-gray-800">📝 Inclure un en-tête</span>
              </label>

              {includeHeader && (
                <input
                  type="text"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder="Texte de l'en-tête"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleExport}
              disabled={selectedCount === 0}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
                selectedCount === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              📥 Exporter ({selectedCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
