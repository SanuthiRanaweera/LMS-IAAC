import { Admin } from '../models/Admin.js';

function toLecturerListItem(doc) {
  return {
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    subject: doc.subject || '',
    branchId: doc.branchId || '',
  };
}

export async function listLecturers(req, res, next) {
  try {
    if (req.auth?.role !== 'student') {
      return res.status(403).json({ message: 'Student access required' });
    }

    const lecturers = await Admin.find({ role: 'lecturer' })
      .select('name email subject branchId role')
      .sort({ name: 1 })
      .lean();

    return res.json({ lecturers: lecturers.map(toLecturerListItem) });
  } catch (err) {
    next(err);
  }
}

export async function getLecturerById(req, res, next) {
  try {
    if (req.auth?.role !== 'student') {
      return res.status(403).json({ message: 'Student access required' });
    }

    const id = String(req.params?.id || '').trim();
    if (!id) return res.status(400).json({ message: 'Lecturer id is required' });

    const lecturer = await Admin.findById(id).select('name email subject branchId role').lean();
    if (!lecturer || lecturer.role !== 'lecturer') {
      return res.status(404).json({ message: 'Lecturer not found' });
    }

    return res.json({ lecturer: toLecturerListItem(lecturer) });
  } catch (err) {
    next(err);
  }
}
