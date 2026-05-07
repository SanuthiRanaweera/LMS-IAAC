import { useEffect, useState } from 'react';
import { Upload, CheckCircle, AlertCircle, ChevronRight, FileText } from 'lucide-react';
import { apiGet, apiPost } from '../../api/http.js';

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function AdminMaterialUploadPage() {
  // Form state
  const [step, setStep] = useState(1);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedIntake, setSelectedIntake] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialDescription, setMaterialDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Data state
  const [branches, setBranches] = useState([]);
  const [intakes, setIntakes] = useState([]);
  const [batches, setBatches] = useState([]);
   
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  // Load branches on mount
  useEffect(() => {
    loadBranches();
  }, []);

  // Re-fetch branches when returning to this tab/page
  useEffect(() => {
    const refreshIfVisible = () => {
      if (step !== 1) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      loadBranches();
    };

    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [step]);

  // Load intakes when branch changes
  useEffect(() => {
    if (selectedBranch) {
      loadIntakes(selectedBranch);
    } else {
      setIntakes([]);
      setSelectedIntake('');
    }
  }, [selectedBranch]);

  // Load batches when intake changes
  useEffect(() => {
    if (selectedBranch && selectedIntake) {
      loadBatches(selectedBranch, selectedIntake);
    } else {
      setBatches([]);
      setSelectedBatch('');
    }
  }, [selectedBranch, selectedIntake]);

  const loadBranches = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet('/api/materials/hierarchy');
      setBranches(response.branches || []);
    } catch (err) {
      setError('Failed to load branches: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const loadIntakes = async (branchId) => {
    setLoading(true);
    try {
      const response = await apiGet(`/api/materials/branches/${branchId}/intakes`);
      setIntakes(response.intakes || []);
    } catch (err) {
      setError('Failed to load intakes: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async (branchId, intakeId) => {
    setLoading(true);
    try {
      const response = await apiGet(`/api/materials/branches/${branchId}/intakes/${intakeId}/batches`);
      setBatches(response.batches || []);
    } catch (err) {
      setError('Failed to load batches: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (currentStep) => {
    setValidationErrors([]);
    
    switch (currentStep) {
      case 1:
        if (!selectedBranch) {
          setValidationErrors(['Please select a branch to continue']);
          return false;
        }
        break;
      case 2:
        if (!selectedIntake) {
          setValidationErrors(['Please select an intake to continue']);
          return false;
        }
        break;
      case 3:
        if (!selectedBatch) {
          setValidationErrors(['Please select a batch to continue']);
          return false;
        }
        break;
      case 4:
        const errors = [];
        if (!materialTitle.trim()) {
          errors.push('Material title is required');
        } else if (materialTitle.trim().length < 5) {
          errors.push('Material title must be at least 5 characters long');
        } else {
          // Check for generic names
          const invalidNames = ['file1', 'file2', 'file3', 'document', 'upload', 'material', 'test', 'example', 'sample', 'untitled', 'new', 'doc1', 'doc2'];
          if (invalidNames.includes(materialTitle.trim().toLowerCase())) {
            errors.push('Please provide a descriptive title. Generic names like \"file1\" or \"document\" are not allowed');
          } else {
            // Check format
            const formatRegex = /^(Week|Module)\\s+\\d+\\s*—\\s*.+/i;
            if (!formatRegex.test(materialTitle.trim())) {
              errors.push('Title should follow format \"Week N — Topic Name\" or \"Module N — Topic Name\". Example: \"Week 4 — HTML Forms Notes\"');
            }
          }
        }
        if (!selectedFile) {
          errors.push('Please select a file to upload');
        }
        if (errors.length > 0) {
          setValidationErrors(errors);
          return false;
        }
        break;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
    setValidationErrors([]);
  };

  const resetForm = () => {
    setStep(1);
    setSelectedBranch('');
    setSelectedIntake('');
    setSelectedBatch('');
    setMaterialTitle('');
    setMaterialDescription('');
    setSelectedFile(null);
    setValidationErrors([]);
    setUploadSuccess(false);
    setError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        setValidationErrors(['File size must be less than 100MB']);
        return;
      }
      
      // Check file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'video/mp4',
        'video/avi',
        'video/quicktime',
        'application/zip',
        'application/x-rar-compressed',
        'image/jpeg',
        'image/png',
        'image/gif'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setValidationErrors(['File type not supported. Please upload PDF, DOCX, PPTX, MP4, ZIP, or image files.']);
        return;
      }
      
      setSelectedFile(file);
      setValidationErrors([]);
    }
  };

  const handleUpload = async () => {
    if (!validateStep(4)) return;
    
    setUploading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('branchId', selectedBranch);
      formData.append('intakeId', selectedIntake);
      formData.append('batchId', selectedBatch);
      formData.append('title', materialTitle.trim());
      formData.append('description', materialDescription.trim());
      formData.append('category', 'Study Material');

      const response = await fetch('/api/materials/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Upload failed');
      }

      const result = await response.json();
      setUploadSuccess(true);
      setStep(5); // Success step
      
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getSelectedBranchName = () => branches.find(b => b.id === selectedBranch)?.name || '';
  const getSelectedIntakeName = () => intakes.find(i => i.id === selectedIntake)?.name || '';
  const getSelectedBatchName = () => batches.find(b => b.id === selectedBatch)?.name || '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Upload size={24} className="text-sky-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Upload Study Material</h1>
            <p className="text-sm text-slate-600">Follow the steps below to upload materials for your students</p>
          </div>
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center gap-4 mb-6">
          {[
            { num: 1, label: 'Branch', completed: step > 1 },
            { num: 2, label: 'Intake', completed: step > 2 },
            { num: 3, label: 'Batch', completed: step > 3 },
            { num: 4, label: 'Upload', completed: step > 4 },
          ].map((stepItem, index) => (
            <div key={stepItem.num} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                stepItem.completed 
                  ? 'bg-green-100 text-green-700' 
                  : step === stepItem.num 
                    ? 'bg-sky-100 text-sky-700'
                    : 'bg-slate-100 text-slate-500'
              }`}>
                {stepItem.completed ? <CheckCircle size={16} /> : stepItem.num}
              </div>
              <span className={`text-sm font-medium ${
                stepItem.completed 
                  ? 'text-green-700' 
                  : step === stepItem.num 
                    ? 'text-sky-700'
                    : 'text-slate-500'
              }`}>
                {stepItem.label}
              </span>
              {index < 3 && <ChevronRight size={16} className="text-slate-400" />}
            </div>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600" />
            <div className="text-sm font-semibold text-rose-700">Error</div>
          </div>
          <div className="text-sm text-rose-600 mt-1">{error}</div>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={16} className="text-amber-600" />
            <div className="text-sm font-semibold text-amber-700">Validation Errors</div>
          </div>
          <ul className="text-sm text-amber-600 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Step Content */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        
        {/* Step 1: Select Branch */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Step 1: Select Branch</h2>
            <p className="text-sm text-slate-600 mb-6">Choose the campus branch where your students are located.</p>
            
            {loading ? (
              <div className="text-sm text-slate-600">Loading branches...</div>
            ) : (
              <div className="grid gap-3">
                {branches.map(branch => (
                  <label key={branch.id} className="flex items-center p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="branch"
                      value={branch.id}
                      checked={selectedBranch === branch.id}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{branch.name}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            
            <div className="flex justify-end mt-6">
              <button
                onClick={nextStep}
                disabled={!selectedBranch}
                className="px-6 py-2 bg-sky-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sky-700"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Intake */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Step 2: Select Intake</h2>
            <p className="text-sm text-slate-600 mb-6">
              Selected Branch: <span className="font-semibold text-sky-700">{getSelectedBranchName()}</span>
              <br />Choose the intake period for your material.
            </p>
            
            {loading ? (
              <div className="text-sm text-slate-600">Loading intakes...</div>
            ) : intakes.length === 0 ? (
              <div className="text-sm text-slate-600">No intakes available for this branch.</div>
            ) : (
              <div className="grid gap-3">
                {intakes.map(intake => (
                  <label key={intake.id} className="flex items-center p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="intake"
                      value={intake.id}
                      checked={selectedIntake === intake.id}
                      onChange={(e) => setSelectedIntake(e.target.value)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{intake.name}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            
            <div className="flex justify-between mt-6">
              <button
                onClick={prevStep}
                className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                disabled={!selectedIntake}
                className="px-6 py-2 bg-sky-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sky-700"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Select Batch */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Step 3: Select Batch</h2>
            <p className="text-sm text-slate-600 mb-6">
              Selected Branch: <span className="font-semibold text-sky-700">{getSelectedBranchName()}</span>
              <br />Selected Intake: <span className="font-semibold text-sky-700">{getSelectedIntakeName()}</span>
              <br />Choose the specific batch that will have access to this material.
            </p>
            
            {loading ? (
              <div className="text-sm text-slate-600">Loading batches...</div>
            ) : batches.length === 0 ? (
              <div className="text-sm text-slate-600">No batches available for this intake.</div>
            ) : (
              <div className="grid gap-3">
                {batches.map(batch => (
                  <label key={batch.id} className="flex items-center p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="batch"
                      value={batch.id}
                      checked={selectedBatch === batch.id}
                      onChange={(e) => setSelectedBatch(e.target.value)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{batch.name}</div>
                      <div className="text-sm text-slate-500">{batch.studentCount} students</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            
            <div className="flex justify-between mt-6">
              <button
                onClick={prevStep}
                className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                disabled={!selectedBatch}
                className="px-6 py-2 bg-sky-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sky-700"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Upload Material */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Step 4: Upload Material</h2>
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-slate-900 mb-2">Target Audience</h3>
              <div className="text-sm text-slate-600">
                <div>Branch: <span className="font-semibold text-sky-700">{getSelectedBranchName()}</span></div>
                <div>Intake: <span className="font-semibold text-sky-700">{getSelectedIntakeName()}</span></div>
                <div>Batch: <span className="font-semibold text-sky-700">{getSelectedBatchName()}</span></div>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Material Title */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Material Title *
                </label>
                <input
                  type="text"
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  placeholder='e.g., "Week 4 — HTML Forms Notes" or "Module 2 — Database Introduction"'
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
                <div className="text-xs text-slate-500 mt-1">
                  Use format: "Week N — Topic" or "Module N — Topic". Avoid generic names like "file1" or "document".
                </div>
              </div>

              {/* Description (Optional) */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={materialDescription}
                  onChange={(e) => setMaterialDescription(e.target.value)}
                  placeholder="Additional details about this material..."
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Select File *
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    id="material-file"
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.pptx,.mp4,.avi,.mov,.zip,.rar,.jpg,.jpeg,.png,.gif"
                    className="hidden"
                  />
                  <label
                    htmlFor="material-file"
                    className="cursor-pointer"
                  >
                    {selectedFile ? (
                      <div className="space-y-2">
                        <FileText size={48} className="text-green-600 mx-auto" />
                        <div className="font-semibold text-slate-900">{selectedFile.name}</div>
                        <div className="text-sm text-slate-500">
                          {formatFileSize(selectedFile.size)} • {selectedFile.type}
                        </div>
                        <div className="text-xs text-sky-600">Click to change file</div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload size={48} className="text-slate-400 mx-auto" />
                        <div className="text-slate-600">Click to select a file</div>
                        <div className="text-xs text-slate-500">
                          Supported: PDF, DOCX, PPTX, MP4, ZIP, Images (Max 100MB)
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between mt-8">
              <button
                onClick={prevStep}
                className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-8 py-2 bg-green-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700"
              >
                {uploading ? 'Uploading...' : 'Upload Material'}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 5 && uploadSuccess && (
          <div className="text-center py-8">
            <CheckCircle size={64} className="text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Upload Successful!</h2>
            <p className="text-slate-600 mb-6">
              Your material "{materialTitle}" has been uploaded successfully.
              <br />Students in {getSelectedBranchName()} - {getSelectedIntakeName()} - {getSelectedBatchName()} can now access it.
            </p>
            
            <div className="flex justify-center gap-4">
              <button
                onClick={resetForm}
                className="px-6 py-2 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700"
              >
                Upload Another Material
              </button>
              <button
                onClick={() => window.location.href = '/admin/materials'}
                className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50"
              >
                View All Materials
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}