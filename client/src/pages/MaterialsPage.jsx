import { useEffect, useState } from 'react';
import { Download, FileText, Video, Image, Archive, AlertCircle } from 'lucide-react';
import { apiGet } from '../api/http.js';
import CardShell from '../components/CardShell.jsx';

function formatFileSize(bytes) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function getFileIcon(fileType) {
  if (!fileType) return <FileText size={20} className="text-slate-500" />;
  
  if (fileType.includes('video')) {
    return <Video size={20} className="text-purple-600" />;
  } else if (fileType.includes('image')) {
    return <Image size={20} className="text-green-600" />;
  } else if (fileType.includes('zip') || fileType.includes('rar')) {
    return <Archive size={20} className="text-orange-600" />;
  } else {
    return <FileText size={20} className="text-blue-600" />;
  }
}

export default function MaterialsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState({});

  useEffect(() => {
    let cancelled = false;

    apiGet('/api/student/materials')
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownload = async (materialId, fileName) => {
    setDownloading(prev => ({ ...prev, [materialId]: true }));
    
    try {
      const response = await apiGet(`/api/materials/student/download/${materialId}`);
      
      // Create download link
      if (response.downloadUrl) {
        const link = document.createElement('a');
        link.href = response.downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      globalThis.console.error('Download failed:', err);
      globalThis.alert('Download failed: ' + (err.message || 'Unknown error'));
    } finally {
      setDownloading(prev => ({ ...prev, [materialId]: false }));
    }
  };

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle size={16} />
          <span className="font-semibold">Failed to load study materials</span>
        </div>
        <div>{error.message || 'Unknown error occurred'}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-sky-600 border-t-transparent rounded-full"></div>
          Loading materials...
        </div>
      </div>
    );
  }

  const materials = Array.isArray(data?.materials) ? data.materials : [];
  const materialsByWeek = Array.isArray(data?.materialsByWeek)
    ? data.materialsByWeek
    : [];

  return (
    <CardShell title="Study Materials">
      {data.message && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={16} />
            <span className="font-medium">Academic Assignment Status</span>
          </div>
          {data.message}
        </div>
      )}
      
      {materials.length === 0 ? (
        <div className="text-center py-8">
          <FileText size={48} className="text-slate-300 mx-auto mb-3" />
          <div className="text-sm text-slate-600 mb-2">No study materials available yet</div>
          <div className="text-xs text-slate-500">
            Your instructors will upload course materials organized by branch, batch, course, and week here
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {(materialsByWeek.length > 0 ? materialsByWeek : [{ weekNumber: null, items: materials }]).map((group) => (
            <div key={group.weekNumber ?? 'all'}>
              {group.weekNumber ? (
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-1">
                    Week {group.weekNumber}
                  </h3>
                </div>
              ) : null}
              <div className="space-y-3">
                {group.items.map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {getFileIcon(material.fileType)}
                        
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-slate-900 mb-1">{material.title}</div>
                          
                          {material.description && (
                            <div className="text-sm text-slate-600 mb-2">{material.description}</div>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                            <span>{material.fileName}</span>
                            <span>{formatFileSize(material.fileSize)}</span>
                            <span>Uploaded {formatDate(material.uploadedAt)}</span>
                            {material.downloadCount > 0 && (
                              <span>{material.downloadCount} downloads</span>
                            )}
                          </div>
                          
                          {/* Branch/Academic Hierarchy Info */}
                          {(material.branchName || material.intakeName || material.batchName) && (
                            <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                              <span className="font-medium">Academic Path:</span>
                              {material.branchName && (
                                <span className="px-2 py-1 bg-sky-100 text-sky-700 rounded font-medium">
                                  {material.branchName}
                                </span>
                              )}
                              {material.intakeName && (
                                <>
                                  <span>→</span>
                                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                                    {material.intakeName}
                                  </span>
                                </>
                              )}
                              {material.batchName && (
                                <>
                                  <span>→</span>
                                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded font-medium">
                                    {material.batchName}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                          
                          {(material.weekNumber || material.week || material.module) && (
                            <div className="mt-2">
                              {material.weekNumber && (
                                <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded mr-2">
                                  Week {material.weekNumber}
                                </span>
                              )}
                              {material.week && (
                                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                                  Week {material.week}
                                </span>
                              )}
                              {material.module && (
                                <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded ml-2">
                                  Module {material.module}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDownload(material.id, material.fileName)}
                        disabled={downloading[material.id]}
                        className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        {downloading[material.id] ? (
                          <>
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download size={16} />
                            Download
                          </>
                        )}
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}
