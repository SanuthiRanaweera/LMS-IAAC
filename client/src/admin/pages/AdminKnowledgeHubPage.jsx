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
   BUILD MEDIA URL
========================================================= */

function buildHubImageUrl(itemId, index, apiBase = '') {
  if (!itemId && itemId !== 0) {
    return '';
  }

  const path =
    `/api/knowledge-hub/media/${encodeURIComponent(
      String(itemId)
    )}/${index}`;

  const base = String(apiBase || '')
    .trim()
    .replace(/\/+$/, '');

  /*
    Same-domain production:

    /api/knowledge-hub/media/...
  */
  if (!base) {
    return path;
  }

  return `${base}${path}`;
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
     API BASE
  ======================================================= */

  const [apiBase, setApiBase] = useState(
    import.meta.env.VITE_API_URL || ''
  );

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

      setItems(
        nextItems
      );

      console.log(
        'Knowledge Hub items:',
        nextItems
      );
    } catch (err) {
      console.error(
        'Knowledge Hub load error:',
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
     RESOLVE API BASE
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function resolveApiBase() {
      try {
        const base =
          await getApiBaseUrl();

        if (cancelled) {
          return;
        }

        setApiBase(
          String(
            base || ''
          )
            .trim()
            .replace(
              /\/+$/,
              ''
            )
        );
      } catch (err) {
        console.warn(
          'Failed to determine API base URL:',
          err
        );
      }
    }

    resolveApiBase();

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

    setFormErr('');

    if (
      fileRef.current
    ) {
      fileRef.current.value =
        '';
    }
  }

  /* =======================================================
     IMAGE SELECT
  ======================================================= */

  function onImageChange(
    event
  ) {
    const selectedFiles =
      Array.from(
        event.target.files ||
          []
      );

    const allowedFiles =
      selectedFiles.filter(
        (file) =>
          file.type.startsWith(
            'image/'
          )
      );

    if (
      allowedFiles.length !==
      selectedFiles.length
    ) {
      setFormErr(
        'Only image files are allowed.'
      );
    } else {
      setFormErr('');
    }

    if (
      allowedFiles.length >
      6
    ) {
      setFormErr(
        'Maximum 6 images are allowed.'
      );
    }

    setImages(
      allowedFiles.slice(
        0,
        6
      )
    );
  }

  /* =======================================================
     CREATE POST
  ======================================================= */

  async function onCreate(
    event
  ) {
    event.preventDefault();

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
        'Please add at least one image.'
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

    setFormErr('');

    try {
      let apiOrigin =
        apiBase;

      if (
        !apiOrigin
      ) {
        apiOrigin =
          await getApiBaseUrl();
      }

      apiOrigin =
        String(
          apiOrigin || ''
        )
          .trim()
          .replace(
            /\/+$/,
            ''
          );

      const formData =
        new globalThis.FormData();

      formData.append(
        'resourceType',
        'gallery'
      );

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
            file
          );
        }
      );

      const endpoint =
        apiOrigin
          ? `${apiOrigin}/api/admin/knowledge-hub`
          : '/api/admin/knowledge-hub';

      const response =
        await fetch(
          endpoint,
          {
            method:
              'POST',

            body:
              formData,

            credentials:
              'include',
          }
        );

      if (
        !response.ok
      ) {
        const data =
          await response
            .json()
            .catch(
              () => ({})
            );

        throw new Error(
          data?.message ||
            `Failed to publish (${response.status})`
        );
      }

      resetForm();

      setShowForm(
        false
      );

      await loadItems();
    } catch (err) {
      console.error(
        'Publish knowledge hub post failed:',
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
     DELETE POST
  ======================================================= */

  async function onDelete(
    id
  ) {
    const confirmed =
      window.confirm(
        'Delete this knowledge hub post?'
      );

    if (!confirmed) {
      return;
    }

    try {
      await apiDelete(
        `/api/admin/knowledge-hub/${id}`
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
              if (
                showForm
              ) {
                resetForm();
              }

              setShowForm(
                (value) =>
                  !value
              );
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            {showForm ? (
              <>
                <X
                  size={14}
                />

                Close form
              </>
            ) : (
              <>
                <Plus
                  size={14}
                />

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
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {formErr}
            </div>
          ) : null}

          <form
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
            onSubmit={
              onCreate
            }
          >
            {/* TITLE */}

            <div>
              <label className="text-xs font-semibold text-slate-600">
                Title *
              </label>

              <input
                value={
                  title
                }
                onChange={(
                  event
                ) =>
                  setTitle(
                    event
                      .target
                      .value
                  )
                }
                className={`mt-1 ${inputCls}`}
                required
                placeholder="Week 3 highlights"
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
                    event
                      .target
                      .value
                  )
                }
                className={`mt-1 ${inputCls} min-h-28 resize-y`}
                required
                placeholder="Write the summary that students should read with the images."
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
                accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={
                  onImageChange
                }
                className="mt-1 block w-full text-sm text-slate-600"
              />

              <p className="mt-1 text-xs text-slate-500">
                Up to 6 images. JPG, PNG, WebP, or GIF.
              </p>

              <p className="mt-2 text-xs font-medium text-slate-700">
                {fileLabel(
                  images
                )}
              </p>
            </div>

            {/* PREVIEWS */}

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
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
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
                          `Preview ${index + 1}`
                        }
                        className="h-32 w-full object-cover"
                      />
                    </div>
                  )
                )}
              </div>
            ) : null}

            {/* ACTIONS */}

            <div className="flex items-center gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={
                  saving
                }
                className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
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
                onClick={() => {
                  resetForm();

                  setShowForm(
                    false
                  );
                }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
            <h3 className="text-sm font-bold text-slate-900">
              Published posts
            </h3>

            <p className="text-xs text-slate-500">
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
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading
              ? 'Refreshing…'
              : 'Refresh'}
          </button>
        </div>

        {/* ERROR */}

        {listErr ? (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {listErr}
          </div>
        ) : null}

        {/* LOADING */}

        {loading ? (
          <div className="text-sm text-slate-500">
            Loading…
          </div>
        ) : items.length ===
          0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No posts yet. Publish the first gallery above.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map(
              (item) => {
                /*
                  IMPORTANT:

                  We do not use item.imagePaths as the final URL.

                  We only use its length so that we know
                  how many images belong to the item.

                  The real src is generated from:

                  /api/knowledge-hub/media/:id/:index
                */

                const imageCount =
                  Array.isArray(
                    item.imageAssetIds
                  )
                    ? item.imageAssetIds.length
                    : Array.isArray(
                          item.imagePaths
                        )
                      ? item.imagePaths.length
                      : Array.isArray(
                            item.imageNames
                          )
                        ? item.imageNames.length
                        : 0;

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
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm"
                  >
                    {/* IMAGES */}

                    {imageCount >
                    0 ? (
                      <div
                        className={[
                          'grid gap-0.5 bg-slate-200',

                          imageCount ===
                          1
                            ? 'grid-cols-1'
                            : 'grid-cols-2',
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
                            const src =
                              buildHubImageUrl(
                                item.id,
                                index,
                                apiBase
                              );

                            return (
                              <div
                                key={`${item.id}-${index}`}
                                className="relative min-h-40 overflow-hidden bg-slate-100"
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
                                    `${item.title || 'Knowledge Hub'} image ${index + 1}`
                                  }
                                  className={
                                    imageCount ===
                                    1
                                      ? 'h-72 w-full object-cover'
                                      : 'h-44 w-full object-cover'
                                  }
                                  onLoad={() => {
                                    console.log(
                                      'Knowledge Hub image loaded:',
                                      src
                                    );
                                  }}
                                  onError={(
                                    event
                                  ) => {
                                    console.error(
                                      'Knowledge Hub image failed:',
                                      {
                                        itemId:
                                          item.id,

                                        index,

                                        src,
                                      }
                                    );

                                    event.currentTarget.style.opacity =
                                      '0';
                                  }}
                                />

                                {index ===
                                  3 &&
                                imageCount >
                                  4 ? (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-xl font-bold text-white">
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
                      <div className="flex h-40 items-center justify-center bg-slate-100 text-slate-400">
                        <ImageIcon
                          size={
                            28
                          }
                        />
                      </div>
                    )}

                    {/* CONTENT */}

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900">
                            {item.title ||
                              'Untitled'}
                          </p>

                          <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-500">
                            {item.description ||
                              ''}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            onDelete(
                              item.id
                            )
                          }
                          aria-label="Delete post"
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-rose-600 hover:bg-rose-100"
                        >
                          <Trash2
                            size={14}
                          />
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        <span className="rounded-full bg-white px-2.5 py-1">
                          {item.resourceType ||
                            'gallery'}
                        </span>

                        <span className="rounded-full bg-white px-2.5 py-1">
                          all students
                        </span>

                        {imageCount >
                        0 ? (
                          <span className="rounded-full bg-white px-2.5 py-1">
                            {
                              imageCount
                            }{' '}
                            image
                            {imageCount !==
                            1
                              ? 's'
                              : ''}
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