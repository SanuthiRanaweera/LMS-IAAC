import fs from 'fs';
import path from 'path';

import { Admin } from '../models/Admin.js';
import { KnowledgeHubItem } from '../models/KnowledgeHubItem.js';
import { Student } from '../models/Student.js';

import {
  deleteFileAsset,
  deleteImageAsset,
  getFileAssetInfo,
  getImageAssetInfo,
  openFileDownloadStream,
  openImageDownloadStream,
  storeFileUpload,
  storeImageUpload,
} from '../services/imageStore.service.js';

/* =========================================================
   CONSTANTS
========================================================= */

const ALLOWED_FILE_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'text/plain',
  'application/octet-stream',
  'application/x-pdf',
]);

const ALLOWED_FILE_EXTS = new Set([
  '.pdf',
  '.docx',
  '.pptx',
  '.xlsx',
  '.zip',
  '.doc',
  '.xls',
  '.ppt',
  '.txt',
]);

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const ALLOWED_IMAGE_EXTS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
]);

const VALID_RESOURCE_TYPES = new Set([
  'file',
  'link',
  'video',
  'note',
  'gallery',
]);

/* =========================================================
   HELPERS
========================================================= */

function normalizeId(value) {
  if (value == null) {
    return '';
  }

  return String(value).trim();
}

function safeStr(value, max = 300) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .slice(0, max);
}

function isValidUrl(value) {
  try {
    const url = new URL(value);

    return (
      url.protocol === 'https:' ||
      url.protocol === 'http:'
    );
  } catch {
    return false;
  }
}

function isPdfLike(file) {
  const extension = path
    .extname(
      String(
        file?.originalname || ''
      )
    )
    .toLowerCase();

  return extension === '.pdf';
}

function isAllowedFile(file) {
  if (!file) {
    return false;
  }

  const extension = path
    .extname(
      String(
        file.originalname || ''
      )
    )
    .toLowerCase();

  const mimeAllowed =
    ALLOWED_FILE_MIMES.has(
      file.mimetype
    ) ||
    isPdfLike(file);

  const extensionAllowed =
    ALLOWED_FILE_EXTS.has(
      extension
    );

  return (
    mimeAllowed &&
    extensionAllowed
  );
}

function isAllowedImage(file) {
  if (!file) {
    return false;
  }

  const extension = path
    .extname(
      String(
        file.originalname || ''
      )
    )
    .toLowerCase();

  return (
    ALLOWED_IMAGE_MIMES.has(
      file.mimetype
    ) &&
    ALLOWED_IMAGE_EXTS.has(
      extension
    )
  );
}

/* =========================================================
   PUBLIC URL HELPERS

   IMPORTANT:

   We intentionally return SAME-ORIGIN relative URLs.

   GOOD:
   /api/knowledge-hub/media/123/0

   BAD:
   http://iaaccampus.com/api/...

   Relative URLs avoid HTTPS/mixed-content problems behind Nginx.
========================================================= */

function normalizePublicPath(value) {
  if (!value) {
    return '';
  }

  const stringValue =
    String(value).trim();

  if (!stringValue) {
    return '';
  }

  /*
    Existing absolute URL.
  */

  if (
    /^https?:\/\//i.test(
      stringValue
    )
  ) {
    try {
      const url =
        new URL(
          stringValue
        );

      return `${url.pathname}${url.search || ''}`;
    } catch {
      return stringValue;
    }
  }

  /*
    Ensure leading slash.
  */

  return `/${stringValue.replace(/^\/+/, '')}`;
}

/* =========================================================
   LEGACY FILE PATH RESOLUTION
========================================================= */

function resolveLegacyFilePath(
  storedPath
) {
  if (!storedPath) {
    return '';
  }

  const raw =
    String(
      storedPath
    ).trim();

  if (!raw) {
    return '';
  }

  /*
    Already absolute filesystem path.
  */

  if (
    path.isAbsolute(raw) &&
    fs.existsSync(raw)
  ) {
    return raw;
  }

  /*
    Try relative to process cwd.
  */

  const fromCwd =
    path.resolve(
      process.cwd(),
      raw
    );

  if (
    fs.existsSync(
      fromCwd
    )
  ) {
    return fromCwd;
  }

  /*
    Handle public-style value:

    /uploads/knowledgehub/photo.jpg
  */

  const normalized =
    raw
      .replace(/^\/+/, '');

  const serverRelative =
    path.resolve(
      process.cwd(),
      normalized
    );

  if (
    fs.existsSync(
      serverRelative
    )
  ) {
    return serverRelative;
  }

  return '';
}

/* =========================================================
   RESPONSE MAPPER
========================================================= */

function toItem(document) {
  const id =
    String(
      document._id
    );

  let imagePaths = [];

  /*
    New GridFS image storage.
  */

  if (
    Array.isArray(
      document.imageAssetIds
    ) &&
    document.imageAssetIds.length >
      0
  ) {
    imagePaths =
      document.imageAssetIds.map(
        (_, index) =>
          `/api/knowledge-hub/media/${encodeURIComponent(
            id
          )}/${index}`
      );
  }

  /*
    Legacy image storage.
  */

  else if (
    Array.isArray(
      document.imagePaths
    )
  ) {
    imagePaths =
      document.imagePaths
        .map(
          normalizePublicPath
        )
        .filter(Boolean);
  }

  return {
    id,

    branchId:
      document.branchId ||
      '',

    intakeId:
      document.intakeId ||
      '',

    batchId:
      document.batchId ||
      '',

    resourceType:
      document.resourceType ||
      '',

    title:
      document.title ||
      '',

    description:
      document.description ||
      '',

    hasFile:
      Boolean(
        document.fileAssetId ||
        document.filePath
      ),

    fileName:
      document.fileName ||
      '',

    fileSize:
      Number(
        document.fileSize ||
        0
      ),

    fileMime:
      document.fileMime ||
      '',

    downloadUrl:
      document.fileAssetId ||
      document.filePath
        ? `/api/knowledge-hub/download/${encodeURIComponent(
            id
          )}`
        : '',

    imagePaths,

    imageNames:
      Array.isArray(
        document.imageNames
      )
        ? document.imageNames
        : [],

    contentUrl:
      document.contentUrl ||
      '',

    textContent:
      document.textContent ||
      '',

    addedBy:
      document.addedBy ||
      '',

    addedByName:
      document.addedByName ||
      '',

    addedByRole:
      document.addedByRole ||
      '',

    createdAt:
      document.createdAt,

    updatedAt:
      document.updatedAt,
  };
}

/* =========================================================
   VISIBILITY FILTER
========================================================= */

function buildVisibilityFilter(
  user
) {
  const filter = {};

  if (
    user?.branchId
  ) {
    filter.branchId =
      normalizeId(
        user.branchId
      );
  }

  if (
    user?.intakeId
  ) {
    filter.intakeId =
      normalizeId(
        user.intakeId
      );
  }

  if (
    user?.batchId
  ) {
    filter.batchId =
      normalizeId(
        user.batchId
      );
  }

  return filter;
}

/* =========================================================
   MULTER HELPERS
========================================================= */

function getUploadedFiles(
  req,
  fieldName
) {
  const files =
    req.files;

  if (!files) {
    return [];
  }

  /*
    upload.array(...)
  */

  if (
    Array.isArray(files)
  ) {
    return files;
  }

  /*
    upload.fields(...)
  */

  const value =
    files[fieldName];

  if (
    Array.isArray(value)
  ) {
    return value;
  }

  return value
    ? [value]
    : [];
}

function removeUploadedFiles(
  files
) {
  for (
    const file of files
  ) {
    try {
      if (
        file?.path &&
        fs.existsSync(
          file.path
        )
      ) {
        fs.unlinkSync(
          file.path
        );
      }
    } catch (err) {
      console.warn(
        '[knowledge-hub] Failed to remove temporary upload:',
        err?.message ||
          err
      );
    }
  }
}

/* =========================================================
   REMOVE STORED ASSETS
========================================================= */

async function removeStoredKnowledgeHubFiles(
  item
) {
  /*
    GridFS main file.
  */

  if (
    item?.fileAssetId
  ) {
    try {
      await deleteFileAsset(
        item.fileAssetId
      );
    } catch (err) {
      console.warn(
        '[knowledge-hub] Failed to delete file asset:',
        err?.message ||
          err
      );
    }
  }

  /*
    GridFS images.
  */

  if (
    Array.isArray(
      item?.imageAssetIds
    ) &&
    item.imageAssetIds.length >
      0
  ) {
    await Promise.allSettled(
      item.imageAssetIds.map(
        (assetId) =>
          deleteImageAsset(
            assetId
          )
      )
    );
  }

  /*
    Legacy local files.
  */

  const legacyPaths = [
    item?.filePath,
    ...(
      Array.isArray(
        item?.imagePaths
      )
        ? item.imagePaths
        : []
    ),
  ].filter(Boolean);

  for (
    const storedPath of legacyPaths
  ) {
    try {
      const resolved =
        resolveLegacyFilePath(
          storedPath
        );

      if (
        resolved &&
        fs.existsSync(
          resolved
        )
      ) {
        fs.unlinkSync(
          resolved
        );
      }
    } catch (err) {
      console.warn(
        '[knowledge-hub] Failed to remove legacy asset:',
        err?.message ||
          err
      );
    }
  }
}

/* =========================================================
   RESOLVE AUTH USER
========================================================= */

async function resolveUserBatch(
  auth
) {
  if (!auth?.sub) {
    return null;
  }

  if (
    auth.role ===
    'lecturer'
  ) {
    const lecturer =
      await Admin.findById(
        auth.sub
      )
        .select(
          '_id name role branchId intakeId batchId'
        )
        .lean();

    if (
      !lecturer ||
      lecturer.role !==
        'lecturer'
    ) {
      return null;
    }

    return {
      id:
        String(
          lecturer._id
        ),

      name:
        lecturer.name ||
        '',

      role:
        'lecturer',

      branchId:
        lecturer.branchId ||
        '',

      intakeId:
        lecturer.intakeId ||
        '',

      batchId:
        lecturer.batchId ||
        '',
    };
  }

  const student =
    await Student.findById(
      auth.sub
    )
      .select(
        '_id fullName branchId intakeId batchId'
      )
      .lean();

  if (!student) {
    return null;
  }

  return {
    id:
      String(
        student._id
      ),

    name:
      student.fullName ||
      '',

    role:
      'student',

    branchId:
      student.branchId ||
      '',

    intakeId:
      student.intakeId ||
      '',

    batchId:
      student.batchId ||
      '',
  };
}

/* =========================================================
   STUDENT / LECTURER
   LIST KNOWLEDGE HUB ITEMS
========================================================= */

export async function listMyHubItems(
  req,
  res,
  next
) {
  try {
    const user =
      await resolveUserBatch(
        req.auth
      );

    if (!user) {
      return res
        .status(401)
        .json({
          message:
            'Unauthorized',
        });
    }

    /*
      Knowledge Hub posts created by admins are currently
      intended to be visible to all students.

      Student:
        no filter.

      Lecturer:
        only matching hierarchy.
    */

    const visibilityFilter =
      user.role ===
      'student'
        ? {}
        : buildVisibilityFilter(
            user
          );

    if (
      user.role ===
        'lecturer' &&
      !visibilityFilter.branchId &&
      !visibilityFilter.intakeId &&
      !visibilityFilter.batchId
    ) {
      return res.json({
        items: [],
      });
    }

    const items =
      await KnowledgeHubItem.find(
        visibilityFilter
      )
        .sort({
          createdAt: -1,
        })
        .lean();

    return res.json({
      items:
        items.map(
          toItem
        ),
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   STREAM KNOWLEDGE HUB IMAGE
========================================================= */

export async function streamHubImage(
  req,
  res,
  next
) {
  try {
    const {
      id,
      index: indexParam,
    } = req.params;

    const item =
      await KnowledgeHubItem.findById(
        id
      )
        .select(
          'imageAssetIds imagePaths imageNames title'
        )
        .lean();

    if (!item) {
      return res
        .status(404)
        .json({
          message:
            'Resource not found',
        });
    }

    const index =
      Number.parseInt(
        indexParam,
        10
      );

    if (
      !Number.isInteger(
        index
      ) ||
      index < 0
    ) {
      return res
        .status(400)
        .json({
          message:
            'Invalid image index',
        });
    }

    /* =====================================================
       GRIDFS IMAGE
    ===================================================== */

    const assetId =
      Array.isArray(
        item.imageAssetIds
      )
        ? item.imageAssetIds[
            index
          ]
        : null;

    if (assetId) {
      const asset =
        await getImageAssetInfo(
          assetId
        );

      if (!asset) {
        return res
          .status(404)
          .json({
            message:
              'Image not found',
          });
      }

      const stream =
        openImageDownloadStream(
          assetId
        );

      if (!stream) {
        return res
          .status(404)
          .json({
            message:
              'Image not found',
          });
      }

      res.setHeader(
        'Content-Type',
        asset.contentType ||
          'application/octet-stream'
      );

      res.setHeader(
        'Cache-Control',
        'public, max-age=3600'
      );

      res.setHeader(
        'Content-Disposition',
        `inline; filename="${(
          item.imageNames?.[
            index
          ] ||
          asset.filename ||
          `image-${index + 1}`
        ).replace(/"/g, '')}"`
      );

      stream.on(
        'error',
        (err) => {
          if (
            !res.headersSent
          ) {
            next(err);
          } else {
            res.destroy(
              err
            );
          }
        }
      );

      stream.pipe(
        res
      );

      return;
    }

    /* =====================================================
       LEGACY IMAGE
    ===================================================== */

    const legacyStoredPath =
      Array.isArray(
        item.imagePaths
      )
        ? item.imagePaths[
            index
          ]
        : '';

    if (
      !legacyStoredPath
    ) {
      return res
        .status(404)
        .json({
          message:
            'Image not found',
        });
    }

    const resolvedPath =
      resolveLegacyFilePath(
        legacyStoredPath
      );

    if (
      !resolvedPath ||
      !fs.existsSync(
        resolvedPath
      )
    ) {
      return res
        .status(404)
        .json({
          message:
            'Image file no longer exists',
        });
    }

    res.setHeader(
      'Cache-Control',
      'public, max-age=3600'
    );

    return res.sendFile(
      resolvedPath
    );
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   STUDENT DOWNLOAD FILE
========================================================= */

export async function studentDownloadResource(
  req,
  res,
  next
) {
  try {
    if (
      !req.auth?.sub
    ) {
      return res
        .status(401)
        .json({
          message:
            'Unauthorized',
        });
    }

    const student =
      await Student.findById(
        req.auth.sub
      )
        .select(
          '_id'
        )
        .lean();

    if (!student) {
      return res
        .status(401)
        .json({
          message:
            'Unauthorized',
        });
    }

    const item =
      await KnowledgeHubItem.findById(
        req.params.id
      )
        .lean();

    if (!item) {
      return res
        .status(404)
        .json({
          message:
            'Resource not found',
        });
    }

    /* =====================================================
       GRIDFS FILE
    ===================================================== */

    if (
      item.fileAssetId
    ) {
      const asset =
        await getFileAssetInfo(
          item.fileAssetId
        );

      if (!asset) {
        return res
          .status(404)
          .json({
            message:
              'File not found',
          });
      }

      const stream =
        openFileDownloadStream(
          item.fileAssetId
        );

      if (!stream) {
        return res
          .status(404)
          .json({
            message:
              'File not found',
          });
      }

      res.setHeader(
        'Content-Type',
        asset.contentType ||
          item.fileMime ||
          'application/octet-stream'
      );

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${(
          item.fileName ||
          asset.filename ||
          'download'
        ).replace(/"/g, '')}"`
      );

      stream.on(
        'error',
        (err) => {
          if (
            !res.headersSent
          ) {
            next(err);
          } else {
            res.destroy(
              err
            );
          }
        }
      );

      stream.pipe(
        res
      );

      return;
    }

    /* =====================================================
       LEGACY FILE
    ===================================================== */

    if (
      !item.filePath
    ) {
      return res
        .status(404)
        .json({
          message:
            'No file attached',
        });
    }

    const resolvedPath =
      resolveLegacyFilePath(
        item.filePath
      );

    if (
      !resolvedPath ||
      !fs.existsSync(
        resolvedPath
      )
    ) {
      return res
        .status(404)
        .json({
          message:
            'File not found',
        });
    }

    return res.download(
      resolvedPath,
      item.fileName ||
        'download'
    );
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   LECTURER ADD RESOURCE
========================================================= */

export async function lecturerAddHubItem(
  req,
  res,
  next
) {
  try {
    if (
      !req.auth?.sub
    ) {
      return res
        .status(401)
        .json({
          message:
            'Unauthorized',
        });
    }

    const lecturer =
      await Admin.findById(
        req.auth.sub
      )
        .lean();

    if (
      !lecturer ||
      lecturer.role !==
        'lecturer'
    ) {
      return res
        .status(403)
        .json({
          message:
            'Forbidden',
        });
    }

    const {
      resourceType,
      title,
      description,
      contentUrl,
      textContent,
      batchId,
      intakeId,
    } = req.body || {};

    const type =
      normalizeId(
        resourceType
      ).toLowerCase();

    if (
      ![
        'file',
        'link',
        'video',
        'note',
      ].includes(type)
    ) {
      return res
        .status(400)
        .json({
          message:
            'Invalid resource type. Use file, link, video or note.',
        });
    }

    const safeTitle =
      safeStr(
        title
      );

    if (!safeTitle) {
      return res
        .status(400)
        .json({
          message:
            'Title is required',
        });
    }

    const targetBatchId =
      normalizeId(
        batchId
      ) ||
      normalizeId(
        lecturer.batchId
      );

    const targetIntakeId =
      normalizeId(
        intakeId
      ) ||
      normalizeId(
        lecturer.intakeId
      );

    const targetBranchId =
      normalizeId(
        lecturer.branchId
      );

    if (
      !targetBatchId
    ) {
      return res
        .status(400)
        .json({
          message:
            'No batch assigned to your account',
        });
    }

    if (
      normalizeId(
        lecturer.batchId
      ) &&
      targetBatchId !==
        normalizeId(
          lecturer.batchId
        )
    ) {
      return res
        .status(403)
        .json({
          message:
            'You can only add resources for your assigned batch',
        });
    }

    let filePath = '';
    let fileAssetId = '';
    let fileName = '';
    let fileSize = 0;
    let fileMime = '';

    if (
      type ===
      'file'
    ) {
      const file =
        req.file ||
        getUploadedFiles(
          req,
          'file'
        )[0];

      if (!file) {
        return res
          .status(400)
          .json({
            message:
              'File is required',
          });
      }

      if (
        !isAllowedFile(
          file
        )
      ) {
        removeUploadedFiles(
          [file]
        );

        return res
          .status(400)
          .json({
            message:
              'Invalid file type. Only PDF, DOCX, PPTX, XLSX, ZIP, DOC, XLS, PPT and TXT are allowed.',
          });
      }

      try {
        fileAssetId =
          await storeFileUpload(
            file,
            {
              scope:
                'knowledge-hub',

              resourceType:
                type,

              title:
                safeTitle,

              branchId:
                targetBranchId,

              intakeId:
                targetIntakeId,

              batchId:
                targetBatchId,
            }
          );

        fileName =
          file.originalname;

        fileSize =
          file.size;

        fileMime =
          file.mimetype;
      } finally {
        removeUploadedFiles(
          [file]
        );
      }
    }

    if (
      type ===
        'link' ||
      type ===
        'video'
    ) {
      if (
        !contentUrl ||
        !isValidUrl(
          contentUrl
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              'A valid URL is required',
          });
      }
    }

    if (
      type ===
      'note'
    ) {
      if (
        !safeStr(
          textContent ||
            '',
          20000
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              'Note content is required',
          });
      }
    }

    let created;

    try {
      created =
        await KnowledgeHubItem.create({
          branchId:
            targetBranchId,

          intakeId:
            targetIntakeId,

          batchId:
            targetBatchId,

          resourceType:
            type,

          title:
            safeTitle,

          description:
            safeStr(
              description ||
                '',
              1000
            ),

          filePath,

          fileAssetId,

          fileName,

          fileSize,

          fileMime,

          contentUrl:
            contentUrl
              ? safeStr(
                  contentUrl,
                  1000
                )
              : '',

          textContent:
            textContent
              ? safeStr(
                  textContent,
                  20000
                )
              : '',

          addedBy:
            String(
              lecturer._id
            ),

          addedByName:
            lecturer.name ||
            'Lecturer',

          addedByRole:
            'lecturer',
        });
    } catch (err) {
      if (
        fileAssetId
      ) {
        await Promise.allSettled([
          deleteFileAsset(
            fileAssetId
          ),
        ]);
      }

      throw err;
    }

    return res
      .status(201)
      .json({
        item:
          toItem(
            created
          ),
      });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   LECTURER DELETE RESOURCE
========================================================= */

export async function lecturerDeleteHubItem(
  req,
  res,
  next
) {
  try {
    const item =
      await KnowledgeHubItem.findById(
        req.params.id
      )
        .lean();

    if (!item) {
      return res
        .status(404)
        .json({
          message:
            'Resource not found',
        });
    }

    if (
      String(
        item.addedBy
      ) !==
      String(
        req.auth?.sub ||
          ''
      )
    ) {
      return res
        .status(403)
        .json({
          message:
            'You can only delete your own resources',
        });
    }

    await removeStoredKnowledgeHubFiles(
      item
    );

    await KnowledgeHubItem.findByIdAndDelete(
      req.params.id
    );

    return res.json({
      ok: true,
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   ADMIN LIST ITEMS
========================================================= */

export async function adminListHubItems(
  req,
  res,
  next
) {
  try {
    const {
      branchId,
      intakeId,
      batchId,
      resourceType,
    } = req.query || {};

    const filter = {};

    if (
      branchId
    ) {
      filter.branchId =
        normalizeId(
          branchId
        );
    }

    if (
      intakeId
    ) {
      filter.intakeId =
        normalizeId(
          intakeId
        );
    }

    if (
      batchId
    ) {
      filter.batchId =
        normalizeId(
          batchId
        );
    }

    if (
      resourceType
    ) {
      filter.resourceType =
        normalizeId(
          resourceType
        );
    }

    const items =
      await KnowledgeHubItem.find(
        filter
      )
        .sort({
          createdAt: -1,
        })
        .lean();

    return res.json({
      items:
        items.map(
          toItem
        ),
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   ADMIN ADD RESOURCE
========================================================= */

export async function adminAddHubItem(
  req,
  res,
  next
) {
  let uploadedFiles =
    [];

  let imageAssetIds =
    [];

  let fileAssetId =
    '';

  try {
    const {
      resourceType,
      title,
      description,
      contentUrl,
      textContent,
      branchId,
      intakeId,
      batchId,
    } = req.body || {};

    const type =
      normalizeId(
        resourceType
      ).toLowerCase();

    const safeTitle =
      safeStr(
        title
      );

    if (
      !VALID_RESOURCE_TYPES.has(
        type
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Invalid resource type',
        });
    }

    if (
      !safeTitle
    ) {
      return res
        .status(400)
        .json({
          message:
            'Title is required',
        });
    }

    /*
      Keep branch/batch validation because
      your existing form/hierarchy uses them.
    */

    const safeBranchId =
      normalizeId(
        branchId
      );

    const safeIntakeId =
      normalizeId(
        intakeId
      );

    const safeBatchId =
      normalizeId(
        batchId
      );

    if (
      !safeBranchId
    ) {
      return res
        .status(400)
        .json({
          message:
            'Branch is required',
        });
    }

    if (
      !safeBatchId
    ) {
      return res
        .status(400)
        .json({
          message:
            'Batch is required',
        });
    }

    let filePath = '';
    let fileName = '';
    let fileSize = 0;
    let fileMime = '';

    let imagePaths =
      [];

    let imageNames =
      [];

    /* =====================================================
       FILE
    ===================================================== */

    if (
      type ===
      'file'
    ) {
      const file =
        req.file ||
        getUploadedFiles(
          req,
          'file'
        )[0];

      if (!file) {
        return res
          .status(400)
          .json({
            message:
              'File is required',
          });
      }

      uploadedFiles =
        [file];

      if (
        !isAllowedFile(
          file
        )
      ) {
        removeUploadedFiles(
          uploadedFiles
        );

        return res
          .status(400)
          .json({
            message:
              'Invalid file type',
          });
      }

      fileAssetId =
        await storeFileUpload(
          file,
          {
            scope:
              'knowledge-hub',

            resourceType:
              type,

            title:
              safeTitle,

            branchId:
              safeBranchId,

            intakeId:
              safeIntakeId,

            batchId:
              safeBatchId,
          }
        );

      fileName =
        file.originalname;

      fileSize =
        file.size;

      fileMime =
        file.mimetype;

      removeUploadedFiles(
        uploadedFiles
      );

      uploadedFiles =
        [];
    }

    /* =====================================================
       LINK / VIDEO
    ===================================================== */

    if (
      type ===
        'link' ||
      type ===
        'video'
    ) {
      if (
        !contentUrl ||
        !isValidUrl(
          contentUrl
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              'A valid URL is required',
          });
      }
    }

    /* =====================================================
       NOTE
    ===================================================== */

    if (
      type ===
      'note'
    ) {
      if (
        !safeStr(
          textContent ||
            '',
          20000
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              'Note content is required',
          });
      }
    }

    /* =====================================================
       GALLERY
    ===================================================== */

    if (
      type ===
      'gallery'
    ) {
      const files =
        getUploadedFiles(
          req,
          'images'
        );

      uploadedFiles =
        files;

      if (
        files.length ===
        0
      ) {
        return res
          .status(400)
          .json({
            message:
              'At least one image is required',
          });
      }

      if (
        files.length >
        6
      ) {
        removeUploadedFiles(
          files
        );

        return res
          .status(400)
          .json({
            message:
              'You can upload up to 6 images',
          });
      }

      const invalidFile =
        files.find(
          (file) =>
            !isAllowedImage(
              file
            )
        );

      if (
        invalidFile
      ) {
        removeUploadedFiles(
          files
        );

        return res
          .status(400)
          .json({
            message:
              'Invalid image type. Use JPG, JPEG, PNG, WebP or GIF.',
          });
      }

      imageNames =
        files.map(
          (file) =>
            file.originalname
        );

      /*
        Store images in GridFS.

        This is preferable to local container disk because
        deployments/restarts will not delete the images.
      */

      try {
        for (
          const file of files
        ) {
          const assetId =
            await storeImageUpload(
              file,
              {
                scope:
                  'knowledge-hub',

                resourceType:
                  type,

                title:
                  safeTitle,

                branchId:
                  safeBranchId,

                intakeId:
                  safeIntakeId,

                batchId:
                  safeBatchId,
              }
            );

          imageAssetIds.push(
            assetId
          );
        }
      } catch (err) {
        await Promise.allSettled(
          imageAssetIds.map(
            (assetId) =>
              deleteImageAsset(
                assetId
              )
          )
        );

        imageAssetIds =
          [];

        throw err;
      } finally {
        removeUploadedFiles(
          files
        );

        uploadedFiles =
          [];
      }
    }

    /* =====================================================
       ADMIN INFORMATION
    ===================================================== */

    const adminId =
      String(
        req.adminAuth?.sub ||
        req.adminAuth?.id ||
        ''
      );

    let adminName =
      'Admin';

    if (
      adminId
    ) {
      const admin =
        await Admin.findById(
          adminId
        )
          .select(
            'name role'
          )
          .lean();

      if (
        admin?.name
      ) {
        adminName =
          admin.name;
      }
    }

    /* =====================================================
       CREATE DOCUMENT
    ===================================================== */

    let created;

    try {
      created =
        await KnowledgeHubItem.create({
          branchId:
            safeBranchId,

          intakeId:
            safeIntakeId,

          batchId:
            safeBatchId,

          resourceType:
            type,

          title:
            safeTitle,

          description:
            safeStr(
              description ||
                '',
              1000
            ),

          filePath,

          fileAssetId,

          fileName,

          fileSize,

          fileMime,

          imageAssetIds,

          imagePaths,

          imageNames,

          contentUrl:
            contentUrl
              ? safeStr(
                  contentUrl,
                  1000
                )
              : '',

          textContent:
            textContent
              ? safeStr(
                  textContent,
                  20000
                )
              : '',

          addedBy:
            adminId,

          addedByName:
            adminName,

          addedByRole:
            req.adminAuth?.role ===
              'superadmin'
              ? 'superadmin'
              : 'admin',
        });
    } catch (err) {
      if (
        fileAssetId
      ) {
        await Promise.allSettled([
          deleteFileAsset(
            fileAssetId
          ),
        ]);
      }

      if (
        imageAssetIds.length
      ) {
        await Promise.allSettled(
          imageAssetIds.map(
            (assetId) =>
              deleteImageAsset(
                assetId
              )
          )
        );
      }

      throw err;
    }

    return res
      .status(201)
      .json({
        item:
          toItem(
            created
          ),
      });
  } catch (err) {
    /*
      Remove temporary multer files in case
      an unexpected failure happened.
    */

    if (
      uploadedFiles.length
    ) {
      removeUploadedFiles(
        uploadedFiles
      );
    }

    next(err);
  }
}

/* =========================================================
   ADMIN DELETE RESOURCE
========================================================= */

export async function adminDeleteHubItem(
  req,
  res,
  next
) {
  try {
    /*
      Load first, delete assets, then remove DB document.

      This is safer than deleting the MongoDB document first.
    */

    const item =
      await KnowledgeHubItem.findById(
        req.params.id
      )
        .lean();

    if (!item) {
      return res
        .status(404)
        .json({
          message:
            'Resource not found',
        });
    }

    await removeStoredKnowledgeHubFiles(
      item
    );

    await KnowledgeHubItem.findByIdAndDelete(
      req.params.id
    );

    return res.json({
      ok: true,
      message:
        'Knowledge Hub resource deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}