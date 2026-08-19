import fs from 'fs';
import path from 'path';

import { Router } from 'express';
import multer from 'multer';

import {
  requireAdminRole,
} from '../middleware/adminAuth.js';

import {
  requireAuth,
  requireLecturer,
} from '../middleware/auth.js';

import {
  listMyHubItems,
  studentDownloadResource,
  streamHubImage,
  lecturerAddHubItem,
  lecturerDeleteHubItem,
  adminListHubItems,
  adminAddHubItem,
  adminDeleteHubItem,
} from '../controllers/knowledgehub.controller.js';

/* =========================================================
   ROUTERS
========================================================= */

export const knowledgeHubRouter =
  Router();

export const knowledgeHubAdminRouter =
  Router();

/* =========================================================
   TEMPORARY UPLOAD DIRECTORY
========================================================= */

const uploadDir =
  path.resolve(
    process.cwd(),
    'uploads',
    'knowledgehub',
    'temp'
  );

if (
  !fs.existsSync(
    uploadDir
  )
) {
  fs.mkdirSync(
    uploadDir,
    {
      recursive: true,
    }
  );
}

/* =========================================================
   MULTER STORAGE
========================================================= */

/*
  Use diskStorage instead of memoryStorage.

  Why?

  memoryStorage keeps the entire image/file in RAM.

  If an admin uploads:
  6 images × 10 MB
  Node may temporarily keep around 60 MB+ in memory.

  Disk storage is safer.

  Your controller uploads the temporary file to GridFS
  and then deletes the temporary file.
*/

const storage =
  multer.diskStorage({
    destination(
      req,
      file,
      callback
    ) {
      callback(
        null,
        uploadDir
      );
    },

    filename(
      req,
      file,
      callback
    ) {
      const originalExtension =
        path
          .extname(
            file.originalname ||
              ''
          )
          .toLowerCase();

      const safeExtension =
        originalExtension ||
        '';

      const uniqueName =
        `${Date.now()}-${Math.round(
          Math.random() *
            1e9
        )}${safeExtension}`;

      callback(
        null,
        uniqueName
      );
    },
  });

/* =========================================================
   FILE FILTER
========================================================= */

/*
  Basic early filtering.

  The controller performs another strict validation,
  so this is an additional protection.
*/

function fileFilter(
  req,
  file,
  callback
) {
  const mime =
    String(
      file.mimetype ||
        ''
    ).toLowerCase();

  const extension =
    path
      .extname(
        file.originalname ||
          ''
      )
      .toLowerCase();

  const allowedImageMimes =
    new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ]);

  const allowedImageExtensions =
    new Set([
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
      '.gif',
    ]);

  const allowedFileMimes =
    new Set([
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

  const allowedFileExtensions =
    new Set([
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

  const isImage =
    allowedImageMimes.has(
      mime
    ) &&
    allowedImageExtensions.has(
      extension
    );

  const isDocument =
    allowedFileMimes.has(
      mime
    ) &&
    allowedFileExtensions.has(
      extension
    );

  /*
    Some browsers send PDFs as
    application/octet-stream.
  */

  const isPdfFallback =
    extension ===
    '.pdf';

  if (
    isImage ||
    isDocument ||
    isPdfFallback
  ) {
    return callback(
      null,
      true
    );
  }

  const error =
    new Error(
      'Unsupported file type.'
    );

  error.status =
    400;

  return callback(
    error
  );
}

/* =========================================================
   MULTER CONFIGURATION
========================================================= */

/*
  Set a reasonable PER FILE limit.

  For Knowledge Hub:
  25 MB per individual file/image is already large.

  6 images × 25 MB = potentially 150 MB total.

  Nginx should have:

  client_max_body_size 200M;

  which you already added.
*/

const hubUpload =
  multer({
    storage,

    fileFilter,

    limits: {
      /*
        Maximum size of ONE file.
      */

      fileSize:
        25 *
        1024 *
        1024,

      /*
        Maximum number of uploaded files.
      */

      files:
        6,

      /*
        Form field protection.
      */

      fields:
        20,

      fieldSize:
        2 *
        1024 *
        1024,
    },
  });

/* =========================================================
   MULTER ERROR HANDLER WRAPPER
========================================================= */

function handleUpload(
  uploadMiddleware
) {
  return function (
    req,
    res,
    next
  ) {
    uploadMiddleware(
      req,
      res,
      (err) => {
        if (!err) {
          return next();
        }

        /*
          Multer-specific errors.
        */

        if (
          err instanceof
          multer.MulterError
        ) {
          if (
            err.code ===
            'LIMIT_FILE_SIZE'
          ) {
            return res
              .status(413)
              .json({
                message:
                  'One of the uploaded files is too large. Maximum size is 25 MB per file.',
              });
          }

          if (
            err.code ===
            'LIMIT_FILE_COUNT'
          ) {
            return res
              .status(400)
              .json({
                message:
                  'Too many files uploaded.',
              });
          }

          if (
            err.code ===
            'LIMIT_UNEXPECTED_FILE'
          ) {
            return res
              .status(400)
              .json({
                message:
                  'Unexpected upload field or too many files.',
              });
          }

          return res
            .status(400)
            .json({
              message:
                err.message ||
                'Upload failed.',
            });
        }

        /*
          Custom fileFilter errors.
        */

        return res
          .status(
            err?.status ||
              400
          )
          .json({
            message:
              err?.message ||
              'Upload failed.',
          });
      }
    );
  };
}

/* =========================================================
   STUDENT + LECTURER ROUTES
========================================================= */

/*
  GET
  /api/knowledge-hub
*/

knowledgeHubRouter.get(
  '/',
  requireAuth,
  listMyHubItems
);

/*
  GET
  /api/knowledge-hub/download/:id
*/

knowledgeHubRouter.get(
  '/download/:id',
  requireAuth,
  studentDownloadResource
);

/*
  GET
  /api/knowledge-hub/media/:id/:index

  Image access intentionally does not require student auth.

  This is useful because <img src="..."> loads the image
  directly through the browser.

  If you later want strict authentication on images,
  we can add it.
*/

knowledgeHubRouter.get(
  '/media/:id/:index',
  streamHubImage
);

/* =========================================================
   LECTURER ROUTES
========================================================= */

/*
  POST
  /api/knowledge-hub/lecturer
*/

knowledgeHubRouter.post(
  '/lecturer',

  requireAuth,

  requireLecturer,

  handleUpload(
    hubUpload.single(
      'file'
    )
  ),

  lecturerAddHubItem
);

/*
  DELETE
  /api/knowledge-hub/lecturer/:id
*/

knowledgeHubRouter.delete(
  '/lecturer/:id',

  requireAuth,

  requireLecturer,

  lecturerDeleteHubItem
);

/* =========================================================
   ADMIN ROUTES
========================================================= */

/*
  These are mounted in server.js under:

  /api/admin/knowledge-hub

  requireAdmin is already applied there.
*/

/*
  GET
  /api/admin/knowledge-hub
*/

knowledgeHubAdminRouter.get(
  '/',

  requireAdminRole([
    'superadmin',
  ]),

  adminListHubItems
);

/*
  POST
  /api/admin/knowledge-hub

  Supports:

  file:
    one file

  images:
    maximum six images
*/

knowledgeHubAdminRouter.post(
  '/',

  requireAdminRole([
    'superadmin',
  ]),

  handleUpload(
    hubUpload.fields([
      {
        name:
          'file',

        maxCount:
          1,
      },

      {
        name:
          'images',

        maxCount:
          6,
      },
    ])
  ),

  adminAddHubItem
);

/*
  DELETE
  /api/admin/knowledge-hub/:id
*/

knowledgeHubAdminRouter.delete(
  '/:id',

  requireAdminRole([
    'superadmin',
  ]),

  adminDeleteHubItem
);