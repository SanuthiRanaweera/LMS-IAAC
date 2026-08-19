import { useEffect, useRef, useState } from 'react';

import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import {
  apiDelete,
  apiGet,
  getApiBaseUrl,
} from '../../api/http.js';

/* =========================================================
   FILE LABEL
========================================================= */

function fileLabel(files) {
  if (!files.length) {
    return 'No images selected';
  }

  if (files.length === 1) {
    return files[0].name;
  }

  return `${files.length} images selected`;
}

/* =========================================================
   IMAGE URL

   IMPORTANT:
   Do NOT add apiBase here.

   Production URL becomes:

   https://iaaccampus.com/api/knowledge-hub/media/ID/0

   because the browser automatically uses the current domain.
========================================================= */

function buildHubImageUrl(itemId, index) {
  if (!itemId) {
    return '';
  }

  return `/api/knowledge-hub/media/${encodeURIComponent(
    String(itemId)
  )}/${index}`;
}

/* =========================================================
   API ORIGIN FOR MULTIPART UPLOAD

   getApiBaseUrl() may return:

   https://iaaccampus.com
   OR
   https://iaaccampus.com/api

   We remove the final /api because below we append
   /api/admin/knowledge-hub ourselves.
========================================================= */

function normalizeApiOrigin(value) {
  const raw = String(value || '')
    .trim()
    .replace(/\/+$/, '');

  if (!raw) {
    return '';
  }

  if (raw.endsWith('/api')) {
    return raw.slice(0, -4);
  }

  return raw;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function AdminKnowledgeHubPage() {
  /* =======================================================
     POSTS
  ======================================================= */

  const [items, setItems] = useState([]);

  const [loading, setLoading] = useState(true);

  const [listErr, setListErr] = useState('');

  /* =======================================================
     FORM
  ======================================================= */

  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');

  const [description, setDescription] = useState('');

  const [images, setImages] = useState([]);

  const [previewUrls, setPreviewUrls] = useState([]);

  const [formErr, setFormErr] = useState('');

  const [saving, setSaving] = useState(false);

  const fileRef = useRef(null);

  /* =======================================================
     API ORIGIN
  ======================================================= */

  const [apiOrigin, setApiOrigin] = useState('');

  /* =======================================================
     LOAD POSTS
  ======================================================= */

  async function loadItems() {
    setLoading(true);

    setListErr('');

    try {
      const data =
        await apiGet(
          '/api/admin/knowledge-hub'
        );

      const nextItems =
        Array.isArray(
          data?.items
        )
          ? data.items
          : [];

      console.log(
        'Knowledge Hub API response:',
        data
      );

      console.log(
        'Knowledge Hub items:',
        nextItems
      );

      setItems(
        nextItems
      );
    } catch (err) {
      console.error(
        'Knowledge Hub load failed:',
        err
      );

      setListErr(
        err?.message ||
          'Failed to load knowledge hub posts.'
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadItems();
  }, []);

  /* =======================================================
     GET API ORIGIN
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function resolveApiOrigin() {
      try {
        const base =
          await getApiBaseUrl();

        if (cancelled) {
          return;
        }

        const normalized =
          normalizeApiOrigin(
            base
          );

        console.log(
          'Raw API base:',
          base
        );

        console.log(
          'Normalized API origin:',
          normalized
        );

        setApiOrigin(
          normalized
        );
      } catch (err) {
        console.warn(
          'Could not resolve API origin:',
          err
        );

        /*
          Same-origin production fallback.
        */

        setApiOrigin('');
      }
    }

    resolveApiOrigin();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     LOCAL IMAGE PREVIEWS
  ======================================================= */

  useEffect(() => {
    const nextUrls =
      images.map(
        (file) =>
          globalThis.URL.createObjectURL(
            file
          )
      );

    setPreviewUrls(
      nextUrls
    );

    return () => {
      nextUrls.forEach(
        (url) => {
          globalThis.URL.revokeObjectURL(
            url
          );
        }
      );
    };
  }, [images]);

  /* =======================================================
     RESET FORM
  ======================================================= */

  function resetForm() {
    setTitle('');

    setDescription('');

    setImages([]);

    setPreviewUrls([]);

    setFormErr('');

    if (fileRef.current) {
      fileRef.current.value =
        '';
    }
  }

  /* =======================================================
     IMAGE SELECT
  ======================================================= */

  function onImageChange(event) {
    const selectedFiles =
      Array.from(
        event.target.files ||
          []
      );

    if (
      selectedFiles.length >
      6
    ) {
      setFormErr(
        'Maximum 6 images are allowed.'
      );
    } else {
      setFormErr('');
    }

    const validFiles =
      selectedFiles.filter(
        (file) => {
          const type =
            String(
              file.type || ''
            ).toLowerCase();

          return [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
          ].includes(type);
        }
      );

    if (
      validFiles.length !==
      selectedFiles.length
    ) {
      setFormErr(
        'Only JPG, JPEG, PNG, WebP and GIF images are allowed.'
      );
    }

    setImages(
      validFiles.slice(
        0,
        6
      )
    );
  }

  /* =======================================================
     CREATE POST
  ======================================================= */

  async function onCreate(event) {
    event.preventDefault();

    setFormErr('');

    if (!title.trim()) {
      setFormErr(
        'Title is required.'
      );

      return;
    }

    if (
      !description.trim()
    ) {
      setFormErr(
        'Description is required.'
      );

      return;
    }

    if (
      images.length === 0
    ) {
      setFormErr(
        'Please select at least one image.'
      );

      return;
    }

    if (
      images.length > 6
    ) {
      setFormErr(
        'Maximum 6 images are allowed.'
      );

      return;
    }

    setSaving(true);

    try {
      const formData =
        new globalThis.FormData();

      formData.append(
        'resourceType',
        'gallery'
      );

      /*
        Knowledge Hub is visible to
        every student.
      */

      formData.append(
        'branchId',
        'all'
      );

      formData.append(
        'intakeId',
        'all'
      );

      formData.append(
        'batchId',
        'all'
      );

      formData.append(
        'title',
        title.trim()
      );

      formData.append(
        'description',
        description.trim()
      );

      images.forEach(
        (file) => {
          formData.append(
            'images',
            file,
            file.name
          );
        }
      );

      /*
        PRODUCTION:

        /api/admin/knowledge-hub

        DEVELOPMENT:

        apiOrigin can point to backend server.
      */

      const endpoint =
        apiOrigin
          ? `${apiOrigin}/api/admin/knowledge-hub`
          : '/api/admin/knowledge-hub';

      console.log(
        'Knowledge Hub upload endpoint:',
        endpoint
      );

      const response =
        await fetch(
          endpoint,
          {
            method:
              'POST',

            credentials:
              'include',

            body:
              formData,
          }
        );

      const responseData =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        console.error(
          'Knowledge Hub publish response:',
          response.status,
          responseData
        );

        throw new Error(
          responseData?.message ||
            `Failed to publish (${response.status})`
        );
      }

      console.log(
        'Knowledge Hub published:',
        responseData
      );

      resetForm();

      setShowForm(
        false
      );

      await loadItems();
    } catch (err) {
      console.error(
        'Knowledge Hub publish failed:',
        err
      );

      setFormErr(
        err?.message ||
          'Failed to publish post.'
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     DELETE
  ======================================================= */

  async function onDelete(id) {
    const confirmed =
      window.confirm(
        'Delete this knowledge hub post?'
      );

    if (!confirmed) {
      return;
    }

    try {
      await apiDelete(
        `/api/admin/knowledge-hub/${encodeURIComponent(
          id
        )}`
      );

      await loadItems();
    } catch (err) {
      globalThis.alert(
        err?.message ||
          'Failed to delete post.'
      );
    }
  }

  /* =======================================================
     INPUT STYLE
  ======================================================= */

  const inputCls =
    'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100';

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="space-y-5">
      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-[#003580] to-sky-700 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-100">
              Admin publishing
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Knowledge Hub
            </h2>

            <p className="mt-2 max-w-2xl text-sm text-sky-100">
              Publish image-rich posts that are visible to all students on the Knowledge Hub page.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (showForm) {
                resetForm();
              }

              setShowForm(
                (current) =>
                  !current
              );
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            {showForm ? (
              <>
                <X size={14} />

                Close form
              </>
            ) : (
              <>
                <Plus size={14} />

                New post
              </>
            )}
          </button>
        </div>
      </div>

      {/* ===================================================
          CREATE FORM
      =================================================== */}

      {showForm ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {formErr ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
              {formErr}
            </div>
          ) : null}

          <form
            onSubmit={
              onCreate
            }
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            {/* TITLE */}

            <div>
              <label className="text-xs font-semibold text-slate-600">
                Title *
              </label>

              <input
                type="text"
                value={title}
                onChange={(
                  event
                ) =>
                  setTitle(
                    event.target
                      .value
                  )
                }
                placeholder="Week 3 highlights"
                required
                className={`mt-1 ${inputCls}`}
              />
            </div>

            {/* DESCRIPTION */}

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">
                Description *
              </label>

              <textarea
                value={
                  description
                }
                onChange={(
                  event
                ) =>
                  setDescription(
                    event.target
                      .value
                  )
                }
                placeholder="Write the summary that students should read with the images."
                required
                className={`mt-1 ${inputCls} min-h-32 resize-y`}
              />
            </div>

            {/* IMAGES */}

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">
                Images *
              </label>

              <input
                ref={
                  fileRef
                }
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
                onChange={
                  onImageChange
                }
                className="mt-2 block w-full text-sm text-slate-600"
              />

              <p className="mt-2 text-xs text-slate-500">
                Maximum 6 images. JPG, JPEG, PNG, WebP or GIF.
              </p>

              <p className="mt-2 text-xs font-semibold text-slate-700">
                {fileLabel(
                  images
                )}
              </p>
            </div>

            {/* LOCAL PREVIEWS */}

            {previewUrls.length >
            0 ? (
              <div className="grid grid-cols-2 gap-3 md:col-span-2 sm:grid-cols-3 lg:grid-cols-4">
                {previewUrls.map(
                  (
                    url,
                    index
                  ) => (
                    <div
                      key={
                        url
                      }
                      className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                    >
                      <img
                        src={
                          url
                        }
                        alt={
                          images[
                            index
                          ]
                            ?.name ||
                          `Preview ${
                            index +
                            1
                          }`
                        }
                        className="h-36 w-full object-cover"
                      />
                    </div>
                  )
                )}
              </div>
            ) : null}

            {/* FORM BUTTONS */}

            <div className="flex flex-wrap items-center gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={
                  saving
                }
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Upload
                  size={14}
                />

                {saving
                  ? 'Publishing…'
                  : 'Publish post'}
              </button>

              <button
                type="button"
                disabled={
                  saving
                }
                onClick={() => {
                  resetForm();

                  setShowForm(
                    false
                  );
                }}
                className="min-h-11 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {/* ===================================================
          PUBLISHED POSTS
      =================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Published posts
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Visible to all students in the student Knowledge Hub.
            </p>
          </div>

          <button
            type="button"
            onClick={
              loadItems
            }
            disabled={
              loading
            }
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {loading
              ? 'Refreshing…'
              : 'Refresh'}
          </button>
        </div>

        {/* ERROR */}

        {listErr ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {listErr}
          </div>
        ) : null}

        {/* LOADING */}

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Loading posts…
          </div>
        ) : items.length ===
          0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
            No posts yet. Publish your first Knowledge Hub post.
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {items.map(
              (item) => {
                /*
                  Backend currently returns imagePaths containing:

                  /api/knowledge-hub/media/ID/0

                  However we only need the number
                  of images.

                  The URL is regenerated below.
                */

                let imageCount =
                  0;

                if (
                  Array.isArray(
                    item.imagePaths
                  ) &&
                  item
                    .imagePaths
                    .length >
                    0
                ) {
                  imageCount =
                    item
                      .imagePaths
                      .length;
                } else if (
                  Array.isArray(
                    item.imageNames
                  )
                ) {
                  imageCount =
                    item
                      .imageNames
                      .length;
                }

                const visibleImageCount =
                  Math.min(
                    imageCount,
                    4
                  );

                return (
                  <article
                    key={
                      item.id
                    }
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    {/* =====================================
                        IMAGE GALLERY
                    ===================================== */}

                    {imageCount >
                    0 ? (
                      <div
                        className={[
                          'grid overflow-hidden bg-slate-100',

                          imageCount ===
                          1
                            ? 'grid-cols-1'
                            : 'grid-cols-2',

                          imageCount >
                          1
                            ? 'gap-px'
                            : '',
                        ].join(
                          ' '
                        )}
                      >
                        {Array.from(
                          {
                            length:
                              visibleImageCount,
                          },
                          (
                            _,
                            index
                          ) => {
                            /*
                              IMPORTANT FIX

                              NO apiBase here.
                            */

                            const src =
                              buildHubImageUrl(
                                item.id,
                                index
                              );

                            return (
                              <div
                                key={`${item.id}-${index}`}
                                className="relative overflow-hidden bg-slate-100"
                              >
                                <img
                                  src={
                                    src
                                  }
                                  alt={
                                    item
                                      .imageNames?.[
                                      index
                                    ] ||
                                    `${item.title || 'Knowledge Hub'} image ${
                                      index +
                                      1
                                    }`
                                  }
                                  className={
                                    imageCount ===
                                    1
                                      ? 'h-80 w-full object-cover'
                                      : 'h-56 w-full object-cover'
                                  }
                                  onLoad={() => {
                                    console.log(
                                      '✅ Knowledge Hub image loaded:',
                                      src
                                    );
                                  }}
                                  onError={(
                                    event
                                  ) => {
                                    console.error(
                                      '❌ Knowledge Hub image failed:',
                                      {
                                        itemId:
                                          item.id,

                                        index,

                                        src,
                                      }
                                    );

                                    /*
                                      DO NOT:
                                      opacity = 0

                                      Keep the image element visible
                                      so debugging is easier.
                                    */

                                    event.currentTarget.alt =
                                      `Image failed to load: ${src}`;
                                  }}
                                />

                                {/* MORE IMAGES */}

                                {index ===
                                  3 &&
                                imageCount >
                                  4 ? (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-2xl font-bold text-white">
                                    +
                                    {imageCount -
                                      4}
                                  </div>
                                ) : null}
                              </div>
                            );
                          }
                        )}
                      </div>
                    ) : (
                      <div className="flex h-56 items-center justify-center bg-slate-100 text-slate-400">
                        <div className="text-center">
                          <ImageIcon
                            size={
                              34
                            }
                            className="mx-auto"
                          />

                          <p className="mt-2 text-xs">
                            No images
                          </p>
                        </div>
                      </div>
                    )}

                    {/* =====================================
                        CONTENT
                    ===================================== */}

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-base font-bold text-slate-900">
                            {item.title ||
                              'Untitled'}
                          </h4>

                          {item.description ? (
                            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                              {
                                item.description
                              }
                            </p>
                          ) : null}
                        </div>

                        {/* DELETE */}

                        <button
                          type="button"
                          onClick={() =>
                            onDelete(
                              item.id
                            )
                          }
                          title="Delete post"
                          aria-label="Delete post"
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-rose-600 transition hover:bg-rose-50"
                        >
                          <Trash2
                            size={17}
                          />
                        </button>
                      </div>

                      {/* TAGS */}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          {item.resourceType ||
                            'gallery'}
                        </span>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          All students
                        </span>

                        {imageCount >
                        0 ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            {
                              imageCount
                            }{' '}
                            image
                            {imageCount ===
                            1
                              ? ''
                              : 's'}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}