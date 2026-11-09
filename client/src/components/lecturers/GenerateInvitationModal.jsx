import { useState } from 'react';
import { X, Link2, Copy, Check, Share2, Calendar, Users, AlertCircle } from 'lucide-react';
import { apiPost } from '../../api/http.js';

export default function GenerateInvitationModal({ isOpen, onClose, onSuccess }) {
  const [linkName, setLinkName] = useState('');
  const [maxUses, setMaxUses] = useState('10');
  const [expiresAt, setExpiresAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Generated Link Result
  const [generatedResult, setGeneratedResult] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');

    if (!linkName.trim()) {
      setError('Please provide a link name.');
      return;
    }

    const numUses = Number(maxUses);
    if (!Number.isInteger(numUses) || numUses < 1) {
      setError('Maximum uses must be at least 1.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiPost('/api/admin/lecturer-invitations', {
        linkName: linkName.trim(),
        maxUses: numUses,
        expiresAt,
      });

      // Construct client registration URL if backend returned host or origin
      const currentOrigin = window.location.origin;
      const rawUrl = `${currentOrigin}/lecturer/register?token=${res.rawToken}`;

      setGeneratedResult({
        ...res,
        registrationUrl: rawUrl,
      });

      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err?.message || 'Failed to generate invitation link.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedResult?.registrationUrl) return;
    navigator.clipboard.writeText(generatedResult.registrationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!generatedResult?.registrationUrl) return;
    const msg = encodeURIComponent(
      `Hello! You have been invited to register as a lecturer on the IAAC LMS.\n\nLink Name: ${linkName}\nPlease complete your registration here: ${generatedResult.registrationUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
  };

  const handleClose = () => {
    setGeneratedResult(null);
    setLinkName('');
    setMaxUses('10');
    setError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-[#003580] to-blue-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white font-bold shadow-2xs">
              <Link2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Generate Lecturer Registration Link
              </h3>
              <p className="text-xs text-blue-100">
                Create a shareable, token-secured registration invitation URL
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {generatedResult ? (
            /* SUCCESS STATE - DISPLAY SHAREABLE LINK */
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>Invitation Link Created Successfully!</span>
                </div>
                <p className="text-slate-600">
                  Share this secure URL with lecturers. Registrations made through this link will be submitted for Super Admin review and approval.
                </p>
              </div>

              {/* URL Box */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Shareable Registration URL:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedResult.registrationUrl}
                    className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#003580] hover:bg-blue-900 text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Details Pills */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Link Name:</span>
                  <span className="font-semibold text-slate-800">{linkName}</span>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Max Uses:</span>
                  <span className="font-semibold text-slate-800">{maxUses} registrations</span>
                </div>
              </div>

              {/* Share via WhatsApp */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 text-xs shadow-sm transition cursor-pointer"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share Link via WhatsApp</span>
                </button>
              </div>

              {/* Done Button */}
              <div className="border-t border-slate-100 pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border border-slate-300 px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* FORM STATE */
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Invitation Link Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  placeholder="e.g. November 2026 Lecturer Intake, Aviation Faculty"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Descriptive title to identify this invitation batch in your management table.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Max Permitted Uses <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="1"
                      max="500"
                      value={maxUses}
                      onChange={(e) => setMaxUses(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                    <Users className="h-4 w-4 text-slate-400 absolute right-3 top-2.5" />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Use 1 for single-use link, or more for group invitations.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Expiration Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                    <Calendar className="h-4 w-4 text-slate-400 absolute right-3 top-2.5" />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    After this date, the link cannot authorize registrations.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#003580] hover:bg-blue-900 px-5 py-2 text-xs font-bold text-white shadow-md transition disabled:opacity-60 cursor-pointer"
                >
                  {loading ? 'Generating...' : 'Generate Link'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
