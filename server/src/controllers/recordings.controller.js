import fs from 'fs';
import path from 'path';
import { Admin } from '../models/Admin.js';
import { Recording } from '../models/Recording.js';
import { Student } from '../models/Student.js';

const ALLOWED_VIDEO_MIMES = new Set([
  'video/mp4', 'video/quicktime', 'video/webm',
  'video/x-msvideo', 'video/x-matroska',
]);
const ALLOWED_VIDEO_EXTS = new Set(['.mp4', '.mov', '.webm', '.avi', '.mkv']);

function normalizeId(v) { return v == null ? '' : String(v).trim(); }
function safeStr(v, max = 300) {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function validateRecordingTitle(title) {
  const t = safeStr(title);
  if (t.length < 5) return 'Title must be at least 5 characters';
  const generic = ['recording', 'video', 'recording1', 'video1', 'untitled', 'new'];
  if (generic.includes(t.toLowerCase())) return 'Please provide a descriptive title';
  return null;
}

function isValidVideoUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function buildEmbedUrl(rawUrl) {
  if (!rawUrl) return '';

  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();

    if (host === 'youtu.be') {
      const videoId = url.pathname.split('/').filter(Boolean)[0];
      return videoId ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}` : rawUrl;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const videoId = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop();
      if (!videoId) return rawUrl;
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
    }

    if (host === 'vimeo.com') {
      const videoId = url.pathname.split('/').filter(Boolean).pop();
      return videoId ? `https://player.vimeo.com/video/${encodeURIComponent(videoId)}` : rawUrl;
    }

    if (host === 'player.vimeo.com') {
      return rawUrl;
    }

    return rawUrl;
  } catch {
    return rawUrl;
  }
}

function toItem(r) {
  return {
    id: String(r._id),
    branchId: r.branchId,
    intakeId: r.intakeId,
    batchId:  r.batchId,
    title:    r.title,
    description: r.description || '',
    hasFile:   Boolean(r.filePath),
    fileName:  r.fileName || '',
    fileSize:  r.fileSize || 0,
    videoLink: r.videoLink || '',
    uploadedBy:     r.uploadedBy,
    uploadedByName: r.uploadedByName,
    uploadedByRole: r.uploadedByRole,
    createdAt: r.createdAt,
  };
}

function buildVisibilityFilter(user) {
  const filter = {};
  if (user?.batchId) filter.batchId = normalizeId(user.batchId);
  if (user?.intakeId) filter.intakeId = normalizeId(user.intakeId);
  if (user?.branchId) filter.branchId = normalizeId(user.branchId);
  return filter;
}

// ─── STUDENT: list recordings for their batch ────────────────────────────────
export async function studentListRecordings(req, res, next) {
  try {
    const student = await Student.findById(req.auth.sub).lean();
    if (!student) return res.status(401).json({ message: 'Unauthorized' });

    const visibilityFilter = buildVisibilityFilter(student);
    if (!visibilityFilter.batchId && !visibilityFilter.intakeId && !visibilityFilter.branchId) {
      return res.json({ recordings: [] });
    }

    const recordings = await Recording.find(visibilityFilter)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ recordings: recordings.map(toItem) });
  } catch (err) {
    next(err);
  }
}

// ─── STUDENT: stream a recording (token-gated, no raw URL exposed) ───────────
export async function studentStreamRecording(req, res, next) {
  try {
    const student = await Student.findById(req.auth.sub).lean();
    if (!student) return res.status(401).json({ message: 'Unauthorized' });

    const recording = await Recording.findById(req.params.id).lean();
    if (!recording) return res.status(404).json({ message: 'Recording not found' });

    // Batch-level access check with branch/intake fallback for unassigned students.
    const sameBatch = student.batchId && normalizeId(recording.batchId) === normalizeId(student.batchId);
    const sameIntake = !student.batchId && student.intakeId && normalizeId(recording.intakeId) === normalizeId(student.intakeId);
    const sameBranch = !student.batchId && !student.intakeId && student.branchId && normalizeId(recording.branchId) === normalizeId(student.branchId);
    if (!sameBatch && !sameIntake && !sameBranch) {
      return res.status(403).json({ message: 'This recording is not available for your batch.' });
    }

    if (recording.videoLink) {
      // Return the embed URL — client renders it in an iframe
      return res.json({ embedUrl: buildEmbedUrl(recording.videoLink) });
    }

    if (!recording.filePath) return res.status(404).json({ message: 'No video file' });

    const absPath = path.resolve(recording.filePath);
    if (!fs.existsSync(absPath)) return res.status(404).json({ message: 'File not found' });

    const stat = fs.statSync(absPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const mime = recording.fileMime || 'video/mp4';

    if (range) {
      const [rawStart, rawEnd] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(rawStart, 10);
      const end = rawEnd ? parseInt(rawEnd, 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mime,
      });
      fs.createReadStream(absPath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mime,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(absPath).pipe(res);
    }
  } catch (err) {
    next(err);
  }
}

// ─── LECTURER: list own recordings ───────────────────────────────────────────
export async function lecturerListRecordings(req, res, next) {
  try {
    const lecturer = await Admin.findById(req.auth.sub).lean();
    if (!lecturer || lecturer.role !== 'lecturer') return res.status(403).json({ message: 'Forbidden' });

    const filter = { uploadedBy: String(lecturer._id) };
    const recordings = await Recording.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ recordings: recordings.map(toItem) });
  } catch (err) {
    next(err);
  }
}

// ─── LECTURER: upload recording ───────────────────────────────────────────────
export async function lecturerUploadRecording(req, res, next) {
  try {
    const lecturer = await Admin.findById(req.auth.sub).lean();
    if (!lecturer || lecturer.role !== 'lecturer') return res.status(403).json({ message: 'Forbidden' });

    const { title, description, videoLink, batchId, intakeId } = req.body || {};

    const titleErr = validateRecordingTitle(title);
    if (titleErr) return res.status(400).json({ message: titleErr });

    const targetBatchId  = normalizeId(batchId)  || normalizeId(lecturer.batchId);
    const targetIntakeId = normalizeId(intakeId) || normalizeId(lecturer.intakeId);
    const targetBranchId = normalizeId(lecturer.branchId);

    if (!targetBatchId) return res.status(400).json({ message: 'No batch assigned to your account' });

    // Lecturer can only upload to their assigned batch
    if (normalizeId(lecturer.batchId) && targetBatchId !== normalizeId(lecturer.batchId)) {
      return res.status(403).json({ message: 'You can only upload recordings for your assigned batch' });
    }

    let filePath = '', fileName = '', fileSize = 0, fileMime = '';
    if (req.file) {
      // Validate MIME
      if (!ALLOWED_VIDEO_MIMES.has(req.file.mimetype)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Invalid file type. Only MP4, MOV, WebM allowed.' });
      }
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (!ALLOWED_VIDEO_EXTS.has(ext)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Invalid file extension.' });
      }
      filePath = req.file.path;
      fileName = req.file.originalname;
      fileSize = req.file.size;
      fileMime = req.file.mimetype;
    } else if (videoLink) {
      if (!isValidVideoUrl(videoLink)) {
        return res.status(400).json({ message: 'Invalid video URL' });
      }
    } else {
      return res.status(400).json({ message: 'Either a video file or a video link is required' });
    }

    const created = await Recording.create({
      branchId: targetBranchId,
      intakeId: targetIntakeId,
      batchId:  targetBatchId,
      title:  safeStr(title),
      description: safeStr(description || '', 1000),
      filePath, fileName, fileSize, fileMime,
      videoLink: videoLink ? safeStr(videoLink, 1000) : '',
      uploadedBy:     String(lecturer._id),
      uploadedByName: lecturer.name,
      uploadedByRole: 'lecturer',
    });

    res.status(201).json({ recording: toItem(created) });
  } catch (err) {
    next(err);
  }
}

// ─── LECTURER: delete own recording ──────────────────────────────────────────
export async function lecturerDeleteRecording(req, res, next) {
  try {
    const recording = await Recording.findById(req.params.id).lean();
    if (!recording) return res.status(404).json({ message: 'Recording not found' });

    if (String(recording.uploadedBy) !== String(req.auth.sub)) {
      return res.status(403).json({ message: 'You can only delete your own recordings' });
    }

    if (recording.filePath && fs.existsSync(recording.filePath)) {
      fs.unlinkSync(recording.filePath);
    }
    await Recording.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ─── ADMIN: list all recordings ───────────────────────────────────────────────
export async function adminListRecordings(req, res, next) {
  try {
    const { batchId } = req.query;
    const filter = {};
    if (batchId) filter.batchId = normalizeId(batchId);

    const recordings = await Recording.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ recordings: recordings.map(toItem) });
  } catch (err) {
    next(err);
  }
}

// ─── ADMIN: stream any recording ─────────────────────────────────────────────
export async function adminStreamRecording(req, res, next) {
  try {
    const recording = await Recording.findById(req.params.id).lean();
    if (!recording) return res.status(404).json({ message: 'Recording not found' });

    if (recording.videoLink) return res.json({ embedUrl: buildEmbedUrl(recording.videoLink) });
    if (!recording.filePath) return res.status(404).json({ message: 'No file' });

    const absPath = path.resolve(recording.filePath);
    if (!fs.existsSync(absPath)) return res.status(404).json({ message: 'File not found' });

    const stat = fs.statSync(absPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const mime = recording.fileMime || 'video/mp4';

    if (range) {
      const [rawStart, rawEnd] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(rawStart, 10);
      const end = rawEnd ? parseInt(rawEnd, 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mime,
      });
      fs.createReadStream(absPath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mime,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(absPath).pipe(res);
    }
  } catch (err) {
    next(err);
  }
}

// ─── ADMIN: delete any recording ─────────────────────────────────────────────
export async function adminDeleteRecording(req, res, next) {
  try {
    const recording = await Recording.findByIdAndDelete(req.params.id).lean();
    if (!recording) return res.status(404).json({ message: 'Recording not found' });

    if (recording.filePath && fs.existsSync(recording.filePath)) {
      fs.unlinkSync(recording.filePath);
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ─── ADMIN: upload recording for any batch ───────────────────────────────────
export async function adminUploadRecording(req, res, next) {
  try {
    const { title, description, videoLink, branchId, intakeId, batchId } = req.body || {};

    const titleErr = validateRecordingTitle(title);
    if (titleErr) return res.status(400).json({ message: titleErr });

    if (!normalizeId(branchId)) return res.status(400).json({ message: 'Branch is required' });
    if (!normalizeId(batchId))  return res.status(400).json({ message: 'Batch is required' });

    let filePath = '', fileName = '', fileSize = 0, fileMime = '';
    if (req.file) {
      if (!ALLOWED_VIDEO_MIMES.has(req.file.mimetype)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Invalid file type. Only MP4, MOV, WebM allowed.' });
      }
      filePath = req.file.path;
      fileName = req.file.originalname;
      fileSize = req.file.size;
      fileMime = req.file.mimetype;
    } else if (videoLink) {
      if (!isValidVideoUrl(videoLink)) return res.status(400).json({ message: 'Invalid video URL' });
    } else {
      return res.status(400).json({ message: 'Either a video file or a video link is required' });
    }

    const adminId = String(req.adminAuth?.sub || req.adminAuth?.id || '');
    const adminDoc = adminId ? await Admin.findById(adminId).select('name').lean() : null;
    const adminName = adminDoc?.name || 'Admin';

    const created = await Recording.create({
      branchId: normalizeId(branchId),
      intakeId: normalizeId(intakeId || ''),
      batchId:  normalizeId(batchId),
      title:  safeStr(title),
      description: safeStr(description || '', 1000),
      filePath, fileName, fileSize, fileMime,
      videoLink: videoLink ? safeStr(videoLink, 1000) : '',
      uploadedBy:     adminId,
      uploadedByName: adminName,
      uploadedByRole: 'superadmin',
    });

    res.status(201).json({ recording: toItem(created) });
  } catch (err) {
    next(err);
  }
}
