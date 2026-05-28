export const DEFAULT_LMS_DATA = {
  // NOTE: These are intentionally empty starter payloads.
  // Admins can populate/manage them via the Admin Content editor.
  dashboard: {
    progress: {
      courseId: '',
      courseCode: '',
      courseTitle: '',
      progressPct: 0,
      completedUnits: 0,
      totalUnits: 0,
      nextUp: '',
      eta: '',
    },
    notifications: [],
    activeMaterial: null,
  },

  courses: {
    courses: [],
  },

  materials: {
    materials: [],
  },

  'knowledge-hub': {
    items: [],
  },

  schedule: {
    classes: [],
  },

  recordings: {
    recordings: [],
  },

  results: {
    results: [],
  },

  policy: {
    sections: [],
  },

  profile: {
    profile: {
      name: '',
      avatarDataUri: '',
      program: '',
      studentId: '',
      email: '',
      phone: '',
      cohort: '',
    },
  },

  help: {
    contact: {
      email: '',
      phone: '',
      hours: '',
    },
    tickets: [],
  },

  // Academic hierarchy for material upload and student management.
  // Structure: Branch → Intake → Batch
  // Branches represent physical locations/campuses
  // Intakes represent cohort periods (e.g., "Jan 2026", "Jul 2026") 
  // Batches represent groups within an intake (e.g., "Batch A", "Batch B")
  // 
  // Shape:
  // {
  //   branches: [
  //     { 
  //       id: 'branch-colombo', 
  //       name: 'Colombo Campus', 
  //       intakes: [
  //         { 
  //           id: 'int-jan2026', 
  //           name: 'January 2026', 
  //           batches: [
  //             { id: 'batch-a', name: 'Batch A', studentCount: 25 },
  //             { id: 'batch-b', name: 'Batch B', studentCount: 23 }
  //           ]
  //         }
  //       ]
  //     }
  //   ]
  // }
  academics: {
    branches: [],
    // Legacy faculty structure (keep for backward compatibility)
    faculties: [],
  },

  // Weekly feedback moderation settings.
  // Super Admin can manage this list via the Feedback module.
  feedbackBadWords: {
    words: [],
  },
};
