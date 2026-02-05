'use client';

import { useState, useCallback } from 'react';

interface FileStatus {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  message?: string;
}

interface MultiFileUploaderProps {
  apiEndpoint: string;
  acceptedTypes?: string;
  title: string;
  description: string;
  onComplete?: (results: { success: number; errors: number }) => void;
}

export default function MultiFileUploader({
  apiEndpoint,
  acceptedTypes = '.htm,.html',
  title,
  description,
  onComplete
}: MultiFileUploaderProps) {
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    const htmlFiles = droppedFiles.filter(f => 
      f.name.endsWith('.htm') || f.name.endsWith('.html')
    );

    const newFiles: FileStatus[] = htmlFiles.map(file => ({
      file,
      status: 'pending'
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const newFiles: FileStatus[] = selectedFiles.map(file => ({
        file,
        status: 'pending'
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, []);

  const uploadFiles = async () => {
    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue;

      setFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'uploading' } : f
      ));

      try {
        const formData = new FormData();
        formData.append('file', files[i].file);

        const response = await fetch(apiEndpoint, {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (response.ok) {
          setFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, status: 'success', message: result.message } : f
          ));
          successCount++;
        } else {
          setFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, status: 'error', message: result.error || 'Erreur' } : f
          ));
          errorCount++;
        }
      } catch (error: any) {
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'error', message: error.message } : f
        ));
        errorCount++;
      }
    }

    setUploading(false);
    if (onComplete) {
      onComplete({ success: successCount, errors: errorCount });
    }
  };

  const clearFiles = () => {
    setFiles([]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 bg-gray-50'
        }`}
      >
        <div className="text-4xl mb-3">📂</div>
        <p className="text-lg font-semibold text-gray-700 mb-2">{title}</p>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        <label className="btn-primary cursor-pointer inline-block">
          📤 Sélectionner des fichiers
          <input
            type="file"
            multiple
            accept={acceptedTypes}
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      {files.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">📋 Fichiers ({files.length})</h3>
            <div className="flex gap-2">
              {pendingCount > 0 && (
                <button onClick={uploadFiles} disabled={uploading} className="btn-primary text-sm">
                  {uploading ? '⏳ Import...' : `📤 Importer ${pendingCount}`}
                </button>
              )}
              <button onClick={clearFiles} disabled={uploading} className="text-sm px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">
                🗑️ Vider
              </button>
            </div>
          </div>

          {(successCount > 0 || errorCount > 0) && (
            <div className="flex gap-4 mb-4 text-sm">
              {successCount > 0 && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1 rounded">
                  <span>✅ {successCount} réussi(s)</span>
                </div>
              )}
              {errorCount > 0 && (
                <div className="flex items-center gap-2 text-red-700 bg-red-50 px-3 py-1 rounded">
                  <span>❌ {errorCount} erreur(s)</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {files.map((f, i) => (
              <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${
                f.status === 'success' ? 'bg-green-50 border-green-200' :
                f.status === 'error' ? 'bg-red-50 border-red-200' :
                f.status === 'uploading' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl">
                    {f.status === 'success' && '✅'}
                    {f.status === 'error' && '❌'}
                    {f.status === 'uploading' && '⏳'}
                    {f.status === 'pending' && '📄'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800 truncate">{f.file.name}</p>
                    {f.message && <p className="text-xs text-gray-600 mt-1">{f.message}</p>}
                  </div>
                </div>
                {f.status === 'pending' && !uploading && (
                  <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-600 ml-2">✕</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
