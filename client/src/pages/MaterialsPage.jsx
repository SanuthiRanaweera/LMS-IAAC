import { useEffect, useState, useMemo } from 'react';
import { Download, FileText, Video, Image, Archive, AlertCircle, Calendar } from 'lucide-react';
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
  if (!fileType) return <FileText size={24} className="text-slate-400" />;
  
  if (fileType.includes('video')) {
    return <Video size={24} className="text-purple-500" />;
  } else if (fileType.includes('image')) {
    return <Image size={24} className="text-emerald-500" />;
  } else if (fileType.includes('zip') || fileType.includes('rar')) {
    return <Archive size={24} className="text-amber-500" />;
  } else {
    return <FileText size={24} className="text-sky-500" />;
  }
}

export default function MaterialsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState({});

  useEffect(() => {
    let cancelled = false;

    // Make sure this points to the targeted endpoint we created
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

  // Group the flat materials array by week dynamically
  const materialsByWeek = useMemo(() => {
    if (!data || !Array.isArray(data.materials)) return [];
    
    const groups = {};
    data.materials.forEach(material => {
      const week = material.weekNumber || 'Other';
      if (!groups[week]) groups[week] = [];
      groups[week].push(material);
    });

    // Convert to sorted array
    return Object.entries(groups)
      .map(([week, items]) => ({
        weekNumber: week === 'Other' ? null : Number(week),
        items
      }))
      .sort((a, b) => (a.weekNumber || 999) - (b.weekNumber || 999));
  }, [data]);

  const handleDownload = async (materialId, fileName) => {
    setDownloading(prev => ({ ...prev, [materialId]: true }));
    
    try {
      const response = await apiGet(`/api/materials/student/download/${materialId}`);
      
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
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle size={20} className="text-rose-600" />
          <span className="text-base font-bold text-rose-900">Failed to load study materials</span>
        </div>
        <div className="ml-8">{error.message || 'Please check your internet connection and try again.'}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <div className="animate-spin h-8 w-8 border-4 border-slate-200 border-t-sky-600 rounded-full mb-4"></div>
        <p className="font-medium text-sm">Synchronizing your course materials...</p>
      </div>
    );
  }

  const materials = Array.isArray(data?.materials) ? data.materials : [];

  return (
    <CardShell title="Study Materials">
      {data.message && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex gap-3 items-start shadow-sm">
          <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold block mb-1">Academic Notice</span>
            {data.message}
          </div>
        </div>
      )}
      
      {materials.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed">
          <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
             <FileText size={32} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No materials available yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            Your instructors will upload course materials here. When they do, they will be automatically organized by week.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {materialsByWeek.map((group) => (
            <div key={group.weekNumber ?? 'all'} className="relative">
              
              {group.weekNumber && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-sky-100 text-sky-700">
                     <Calendar size={16} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Week {group.weekNumber}
                  </h3>
                  <div className="h-px flex-1 bg-slate-100 ml-2"></div>
                </div>
              )}

              <div className="grid gap-4">
                {group.items.map((material) => {
                  // Mongoose uses _id, so we fallback to id just in case
                  const materialId = material._id || material.id; 

                  return (
                    <div
                      key={materialId}
                      className="group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-5 hover:border-sky-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div className="mt-1 p-2 bg-slate-50 rounded-xl border border-slate-100 group-hover:bg-sky-50 group-hover:border-sky-100 transition-colors">
                            {getFileIcon(material.fileType)}
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-900 mb-1 text-base group-hover:text-sky-700 transition-colors line-clamp-1">{material.title}</h4>
                          
                          {material.description && (
                            <p className="text-sm text-slate-500 mb-3 line-clamp-2 leading-relaxed">{material.description}</p>
                          )}
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-500">
                            <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md text-slate-600">
                              {material.fileName}
                            </span>
                            <span className="flex items-center gap-1.5">
                              {formatFileSize(material.fileSize)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              Uploaded {formatDate(material.createdAt || material.uploadedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDownload(materialId, material.fileName)}
                        disabled={downloading[materialId]}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm shadow-sm"
                      >
                        {downloading[materialId] ? (
                          <>
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download size={16} />
                            Download File
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}