// sidepanel.js

// Global application state
let notesState = [];
let editingNoteId = null;
let currentView = 'list'; // 'list' or 'editor'
let editorMode = 'view'; // 'view' or 'edit'
let saveTimeout = null;
let activeTagFilters = [];
let isStorageLoaded = false;
let saveChain = Promise.resolve(true);
let deleteDialogState = null;

const NOTES_STORAGE_KEY = 'notes';

// HTML Elements
const headerListView = document.getElementById('header-list-view');
const headerEditView = document.getElementById('header-edit-view');
const listViewContainer = document.getElementById('list-view-container');
const editorViewContainer = document.getElementById('editor-view-container');

const notesGrid = document.getElementById('notes-grid');
const addNoteBtn = document.getElementById('add-note-btn');
const backBtn = document.getElementById('back-btn');
const emptyState = document.getElementById('empty-state');
const saveStatus = document.getElementById('save-status');

const editorContent = document.getElementById('editor-content');

const tagFilterBar = document.getElementById('tag-filter-bar');
const editorTagList = document.getElementById('editor-tag-list');
const editorTagInput = document.getElementById('editor-tag-input');

// Toggle Mode Elements
const toggleViewBtn = document.getElementById('toggle-view-btn');
const toggleEditBtn = document.getElementById('toggle-edit-btn');
const editorEditFields = document.getElementById('editor-edit-fields');
const editorViewFields = document.getElementById('editor-view-fields');
const editorTagsWrapper = document.getElementById('editor-tags-wrapper');
const editorTagsEditSection = document.getElementById('editor-tags-edit-section');
const editorTagsViewSection = document.getElementById('editor-tags-view-section');
const editorViewTagList = document.getElementById('editor-view-tag-list');
const editorViewContent = document.getElementById('editor-view-content');

// Initialize Extension Sidepanel
document.addEventListener('DOMContentLoaded', async () => {
  await loadNotes();
  setupEventListeners();
  setupStorageChangeListener();
  showListView();
});

// Load notes from chrome.storage.local or localStorage fallback
async function loadNotes() {
  try {
    let rawNotes = [];
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const result = await chrome.storage.local.get(NOTES_STORAGE_KEY);
      rawNotes = result[NOTES_STORAGE_KEY] || [];
    } else {
      const localData = localStorage.getItem('chrome_notes_fallback');
      rawNotes = localData ? JSON.parse(localData) : [];
    }
    notesState = normalizeNotes(rawNotes);

    isStorageLoaded = true;
  } catch (error) {
    console.error('Failed to load notes from storage:', error);
  }
}

function normalizeNotes(rawNotes) {
  if (!Array.isArray(rawNotes)) return [];

  return rawNotes
    .filter(note => note && typeof note === 'object' && typeof note.id === 'string' && typeof note.content === 'string')
    .map(note => ({
      id: note.id,
      content: note.content,
      tags: Array.isArray(note.tags) ? note.tags.filter(tag => typeof tag === 'string') : [],
      created_at: Number.isFinite(note.created_at) ? note.created_at : Date.now(),
      updated_at: Number.isFinite(note.updated_at) ? note.updated_at : (Number.isFinite(note.created_at) ? note.created_at : Date.now()),
      pinned: Boolean(note.pinned),
      deleted_at: Number.isFinite(note.deleted_at) ? note.deleted_at : null
    }));
}

function mergeNotes(firstNotes, secondNotes) {
  const records = new Map();

  for (const note of [...firstNotes, ...secondNotes]) {
    const current = records.get(note.id);
    if (!current || note.updated_at >= current.updated_at) {
      records.set(note.id, note);
    }
  }

  return Array.from(records.values());
}

function markNoteUpdated(note) {
  note.updated_at = Date.now();
}

// Save notes to chrome.storage.local or localStorage fallback
function saveNotes() {
  saveChain = saveChain.then(saveNotesNow, saveNotesNow);
  return saveChain;
}

async function saveNotesNow() {
  if (!isStorageLoaded) {
    console.warn('Blocked saveNotes() call because storage has not been successfully loaded yet. This prevents data loss.');
    return false;
  }

  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const result = await chrome.storage.local.get(NOTES_STORAGE_KEY);
      notesState = mergeNotes(normalizeNotes(result[NOTES_STORAGE_KEY]), notesState);
      await chrome.storage.local.set({ [NOTES_STORAGE_KEY]: notesState });
    } else {
      localStorage.setItem('chrome_notes_fallback', JSON.stringify(notesState));
    }
    return true;
  } catch (error) {
    console.error('Failed to save notes to storage:', error);
    setSaveStatusText('Save failed');
    return false;
  }
}

function notesMatch(firstNotes, secondNotes) {
  return JSON.stringify(firstNotes) === JSON.stringify(secondNotes);
}

function setupStorageChangeListener() {
  if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) return;

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes[NOTES_STORAGE_KEY]) return;

    const incomingNotes = normalizeNotes(changes[NOTES_STORAGE_KEY].newValue);
    const mergedNotes = mergeNotes(incomingNotes, notesState);
    const mustPersistLocalChanges = !notesMatch(mergedNotes, incomingNotes);
    notesState = mergedNotes;

    if (currentView === 'editor' && editingNoteId) {
      const currentNote = notesState.find(note => note.id === editingNoteId && !note.deleted_at);
      if (currentNote && document.activeElement !== editorContent) {
        editorContent.value = currentNote.content;
      }
      renderEditorMode();
    } else {
      renderTagFilterBar();
      renderNotes();
    }

    if (mustPersistLocalChanges) void saveNotes();
  });
}

// Show the List View (All notes list)
function showListView() {
  currentView = 'list';
  editingNoteId = null;

  headerListView.style.display = 'flex';
  headerEditView.style.display = 'none';
  listViewContainer.style.display = 'flex';
  editorViewContainer.style.display = 'none';

  renderTagFilterBar();
  renderNotes();
}

// Show the Editor View (Full-page note editor)
function showEditorView(noteId) {
  currentView = 'editor';
  editingNoteId = noteId;

  headerListView.style.display = 'none';
  headerEditView.style.display = 'flex';
  listViewContainer.style.display = 'none';
  editorViewContainer.style.display = 'flex';

  // Always initialize content inputs in case we exit directly from view mode
  const note = notesState.find(n => n.id === noteId);
  if (note && !note.deleted_at) {
    editorContent.value = note.content;
  }

  renderEditorMode();
  setSaveStatusText('Saved');
}

// Render the editor content based on the current mode (view or edit)
function renderEditorMode() {
  if (currentView !== 'editor' || !editingNoteId) return;

  const note = notesState.find(n => n.id === editingNoteId && !n.deleted_at);
  if (!note) return;

  if (editorMode === 'view') {
    // View mode styling & active button
    toggleViewBtn.classList.add('active');
    toggleEditBtn.classList.remove('active');
    toggleViewBtn.setAttribute('aria-pressed', 'true');
    toggleEditBtn.setAttribute('aria-pressed', 'false');
    editorEditFields.style.display = 'none';
    editorViewFields.style.display = 'flex';
    saveStatus.style.display = 'none';

    // Show/hide tag sections
    editorTagsEditSection.style.display = 'none';
    editorViewTagList.innerHTML = '';
    if (note.tags && note.tags.length > 0) {
      editorTagsWrapper.style.display = 'block';
      editorTagsViewSection.style.display = 'block';
      note.tags.forEach(tag => {
        const badge = document.createElement('span');
        badge.className = 'note-card-tag-badge';
        badge.textContent = tag;
        editorViewTagList.appendChild(badge);
      });
    } else {
      editorTagsWrapper.style.display = 'none';
      editorTagsViewSection.style.display = 'none';
    }

    // Render HTML content
    editorViewContent.innerHTML = parseMarkdown(note.content);
    toggleViewBtn.focus();
  } else {
    // Edit mode styling & active button
    toggleViewBtn.classList.remove('active');
    toggleEditBtn.classList.add('active');
    toggleViewBtn.setAttribute('aria-pressed', 'false');
    toggleEditBtn.setAttribute('aria-pressed', 'true');
    editorEditFields.style.display = 'flex';
    editorViewFields.style.display = 'none';
    saveStatus.style.display = 'inline';

    // Show/hide tag sections
    editorTagsWrapper.style.display = 'block';
    editorTagsEditSection.style.display = 'block';
    editorTagsViewSection.style.display = 'none';

    renderEditorTags();

    // Focus handling and cursor placement only if user is not already actively editing
    if (document.activeElement !== editorContent) {
      editorContent.value = note.content;
      editorContent.focus();
      editorContent.setSelectionRange(editorContent.value.length, editorContent.value.length);
    }
  }
}

// Switch between view and edit modes inside the editor
async function setEditorMode(mode) {
  if (editorMode === mode) return;

  if (editorMode === 'edit') {
    // Save any pending typed updates first
    if (saveTimeout) clearTimeout(saveTimeout);
    await performAutosave();
  }

  editorMode = mode;
  renderEditorMode();
}

// Render preview cards in List View
function renderNotes() {
  notesGrid.innerHTML = '';
  
  // Filter notes by active tags (AND logic)
  let filteredNotes = notesState.filter(note => !note.deleted_at);
  if (activeTagFilters.length > 0) {
    filteredNotes = filteredNotes.filter(n => 
      n.tags && activeTagFilters.every(filterTag => 
        n.tags.some(t => t.toLowerCase() === filterTag.toLowerCase())
      )
    );
  }

  const hasNotes = filteredNotes.length > 0;

  if (!hasNotes) {
    emptyState.style.display = 'flex';
    notesGrid.style.display = 'none';
    
    // Customize empty state if filtered
    if (activeTagFilters.length > 0) {
      emptyState.querySelector('.empty-title').textContent = 'No matching notes';
      const formattedTags = activeTagFilters.map(t => `"${t}"`).join(', ');
      emptyState.querySelector('.empty-desc').textContent = `No notes are tagged with all of the selected tags: ${formattedTags}.`;
    } else {
      emptyState.querySelector('.empty-title').textContent = 'No notes yet';
      emptyState.querySelector('.empty-desc').textContent = 'Click the Add Note button above to capture your thoughts, tasks, and ideas.';
    }
    return;
  }

  emptyState.style.display = 'none';
  notesGrid.style.display = 'grid';

  // Sort notes: pinned first, then created_at descending
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    const aPinned = !!a.pinned;
    const bPinned = !!b.pinned;
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return b.created_at - a.created_at;
  });

  sortedNotes.forEach(note => {
    const noteCard = document.createElement('article');
    noteCard.className = 'note-card';
    noteCard.dataset.id = note.id;

    const tagsHtml = note.tags && note.tags.length > 0
      ? `<div class="note-card-tags">
          ${note.tags.map(t => `<span class="note-card-tag-badge">${escapeHtml(t)}</span>`).join('')}
         </div>`
      : '';

    noteCard.innerHTML = `
      <button class="note-card-open" type="button" aria-label="Open note"></button>
      <div class="note-actions">
        <button class="btn-note-menu" type="button" aria-label="Note actions" aria-expanded="false">
          <svg class="menu-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </button>
        <div class="dropdown-menu">
          <button class="dropdown-item btn-action-pin" type="button">
            <svg class="dropdown-item-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(45deg);">
              <line x1="12" x2="12" y1="17" y2="22"/>
              <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.5A2 2 0 0 1 15 9.26V6a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v3.26a2 2 0 0 1-.78 1.24l-2.78 3.5a2 2 0 0 0-.44 1.24Z"/>
            </svg>
            <span>${note.pinned ? 'Unpin' : 'Pin'}</span>
          </button>
          <button class="dropdown-item delete btn-action-delete-trigger" type="button">
            <svg class="dropdown-item-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Delete</span>
          </button>
        </div>
      </div>
      <div class="note-card-body">
        ${parseMarkdown(note.content)}
      </div>
      ${tagsHtml}
      ${note.pinned ? `
        <div class="pinned-indicator" title="Pinned Note">
          <svg class="pinned-indicator-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" x2="12" y1="17" y2="22"/>
            <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.5A2 2 0 0 1 15 9.26V6a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v3.26a2 2 0 0 1-.78 1.24l-2.78 3.5a2 2 0 0 0-.44 1.24Z"/>
          </svg>
        </div>
      ` : ''}
    `;

    notesGrid.appendChild(noteCard);
  });
}

// Setup Event Listeners
function setupEventListeners() {
  // Add Note Button
  addNoteBtn.addEventListener('click', async () => {
    await addNewNote();
  });

  // Back Link Button
  backBtn.addEventListener('click', async () => {
    await handleBackClick();
  });

  // Note Cards Interactions inside Grid (Delegation)
  notesGrid.addEventListener('click', async (e) => {
    const card = e.target.closest('.note-card');
    if (!card) return;

    const noteId = card.dataset.id;

    // 1. Handle Checkbox Clicking inside Previews
    if (e.target.classList.contains('checklist-checkbox')) {
      e.stopPropagation();
      const lineIndex = parseInt(e.target.getAttribute('data-line'), 10);
      await toggleCheckbox(noteId, lineIndex, e.target.checked);
      return;
    }

    // 2. Handle Menu Button Click
    const menuBtn = e.target.closest('.btn-note-menu');
    if (menuBtn) {
      e.stopPropagation();
      toggleDropdown(noteId);
      return;
    }

    // 2.1 Handle Pin Action Click
    const pinBtn = e.target.closest('.btn-action-pin');
    if (pinBtn) {
      e.stopPropagation();
      await togglePinNote(noteId);
      return;
    }

    // 2.2 Handle Delete trigger Click
    const deleteTrigger = e.target.closest('.btn-action-delete-trigger');
    if (deleteTrigger) {
      e.stopPropagation();
      closeAllDropdowns();
      showDeleteConfirmation(card, noteId, deleteTrigger);
      return;
    }

    // 3. Handle Deletion Confirmation Tooltip Buttons
    if (e.target.classList.contains('btn-confirm-yes')) {
      e.stopPropagation();
      await deleteNote(noteId);
      return;
    }
    if (e.target.classList.contains('btn-confirm-no')) {
      e.stopPropagation();
      removeDeleteConfirmation(card);
      return;
    }
    if (e.target.closest('.delete-confirm-overlay')) {
      e.stopPropagation();
      return;
    }

    const openButton = e.target.closest('.note-card-open');
    if (openButton) {
      editorMode = 'view';
      showEditorView(noteId);
    }
  });

  // Double click a note card to open directly in edit mode
  notesGrid.addEventListener('dblclick', (e) => {
    const card = e.target.closest('.note-card');
    if (!card) return;

    // Prevent trigger if clicking buttons or dropdowns
    if (e.target.closest('.btn-note-menu') || e.target.closest('.dropdown-menu') || e.target.classList.contains('checklist-checkbox')) {
      return;
    }

    const noteId = card.dataset.id;
    editorMode = 'edit';
    showEditorView(noteId);
  });

  // Double click inside note preview (view mode) to transition to edit mode
  editorViewFields.addEventListener('dblclick', () => {
    setEditorMode('edit');
  });

  // Editor Inputs (Debounced autosave)
  editorContent.addEventListener('input', () => {
    const note = notesState.find(item => item.id === editingNoteId && !item.deleted_at);
    if (note) {
      note.content = editorContent.value;
      markNoteUpdated(note);
    }
    triggerAutosave();
  });

  // Keydown listener for editorContent (Command/Control + Enter, and auto-markup insert)
  editorContent.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      setEditorMode('view');
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const start = editorContent.selectionStart;
      const end = editorContent.selectionEnd;
      const text = editorContent.value;
      
      const beforeCursor = text.substring(0, start);
      const afterCursor = text.substring(end);
      const lineStartIdx = beforeCursor.lastIndexOf('\n') + 1;
      const currentLine = beforeCursor.substring(lineStartIdx);
      
      const checkboxMatch = currentLine.match(/^(\s*-\s*\[[ xX]\])\s*(.*)/);
      const bulletMatch = currentLine.match(/^(\s*-\s+)(.*)/);
      
      if (checkboxMatch) {
        e.preventDefault();
        const spaces = checkboxMatch[1].match(/^\s*/)[0];
        const insertText = '\n' + spaces + '- [ ] ';
        
        editorContent.value = beforeCursor + insertText + afterCursor;
        editorContent.selectionStart = editorContent.selectionEnd = start + insertText.length;
        triggerAutosave();
      } else if (bulletMatch) {
        e.preventDefault();
        const spaces = bulletMatch[1].match(/^\s*/)[0];
        const insertText = '\n' + spaces + '- ';
        
        editorContent.value = beforeCursor + insertText + afterCursor;
        editorContent.selectionStart = editorContent.selectionEnd = start + insertText.length;
        triggerAutosave();
      }
    }
  });

  // Keep modal keyboard focus contained and let Escape cancel deletion.
  document.addEventListener('keydown', async (e) => {
    if (deleteDialogState) {
      const dialog = deleteDialogState.card.querySelector('.delete-confirm-overlay');
      if (e.key === 'Escape') {
        e.preventDefault();
        removeDeleteConfirmation(deleteDialogState.card);
        return;
      }
      if (e.key === 'Tab' && dialog) {
        const buttons = Array.from(dialog.querySelectorAll('button:not([disabled])'));
        const firstButton = buttons[0];
        const lastButton = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === firstButton) {
          e.preventDefault();
          lastButton.focus();
        } else if (!e.shiftKey && document.activeElement === lastButton) {
          e.preventDefault();
          firstButton.focus();
        }
        return;
      }
    }

    if (e.key === 'Escape' && currentView === 'editor') {
      await handleBackClick();
    }
  });

  // Tag Filter Bar clicks (delegation)
  tagFilterBar.addEventListener('click', (e) => {
    const tagBtn = e.target.closest('.filter-tag');
    if (!tagBtn) return;
    
    const tag = tagBtn.getAttribute('data-tag');
    if (tag === 'all') {
      activeTagFilters = [];
    } else {
      const lowerTag = tag.toLowerCase();
      const index = activeTagFilters.indexOf(lowerTag);
      if (index > -1) {
        activeTagFilters.splice(index, 1); // Deselect if already selected
      } else {
        activeTagFilters.push(lowerTag); // Select if not selected
      }
    }
    
    renderTagFilterBar();
    renderNotes();
  });

  // Handle adding tag inside editor
  const addTagFromInput = () => {
    if (!editingNoteId) return;
    const val = editorTagInput.value.trim();
    if (!val) return;
    
    // Clean tag: remove leading #, keep casing, alphanumeric & dash/under only
    const cleanedTag = val.replace(/^#+/, '').trim().replace(/[^a-zA-Z0-9-_]/g, '');
    if (cleanedTag) {
      const note = notesState.find(n => n.id === editingNoteId);
      if (note) {
        if (!note.tags) note.tags = [];
        const lowerTags = note.tags.map(t => t.toLowerCase());
        if (!lowerTags.includes(cleanedTag.toLowerCase())) {
          note.tags.push(cleanedTag);
          markNoteUpdated(note);
          renderEditorTags();
          triggerAutosave();
        }
      }
    }
    editorTagInput.value = '';
  };

  editorTagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTagFromInput();
    }
  });

  editorTagInput.addEventListener('blur', addTagFromInput);

  // Handle removing tag inside editor
  editorTagList.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.remove-btn');
    if (!removeBtn) return;
    
    const indexToRemove = parseInt(removeBtn.getAttribute('data-index'), 10);
    const note = notesState.find(n => n.id === editingNoteId && !n.deleted_at);
    if (note && note.tags) {
      note.tags.splice(indexToRemove, 1);
      markNoteUpdated(note);
      renderEditorTags();
      triggerAutosave();
    }
  });

  // Close ellipsis menus when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.btn-note-menu') && !e.target.closest('.dropdown-menu')) {
      closeAllDropdowns();
    }
  });

  // Toggle View/Edit Mode Buttons
  toggleViewBtn.addEventListener('click', () => setEditorMode('view'));
  toggleEditBtn.addEventListener('click', () => setEditorMode('edit'));

  // Interactive Checklist support in editor view mode
  editorViewFields.addEventListener('click', async (e) => {
    if (e.target.classList.contains('checklist-checkbox')) {
      if (!editingNoteId) return;
      const lineIndex = parseInt(e.target.getAttribute('data-line'), 10);
      await toggleCheckbox(editingNoteId, lineIndex, e.target.checked);
      
      // Update HTML in View Mode immediately
      const note = notesState.find(n => n.id === editingNoteId && !n.deleted_at);
      if (note) {
        editorViewContent.innerHTML = parseMarkdown(note.content);
      }
    }
  });

  // Queue any pending save when the sidebar page hides/closes.
  window.addEventListener('pagehide', () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    void saveNotes();
  });
}

// Create a new note and enter Edit View
async function addNewNote() {
  const newNote = {
    id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    content: '',
    tags: [],
    created_at: Date.now(),
    updated_at: Date.now(),
    isNew: true // temporary flag to identify newly created notes
  };

  notesState.unshift(newNote);
  await saveNotes();
  editorMode = 'edit';
  showEditorView(newNote.id);
}

// Trigger debounced save
function triggerAutosave() {
  const note = notesState.find(item => item.id === editingNoteId && !item.deleted_at);
  if (note) {
    note.content = editorContent.value;
    markNoteUpdated(note);
  }
  setSaveStatusText('Saving...');
  
  if (saveTimeout) clearTimeout(saveTimeout);
  
  saveTimeout = setTimeout(async () => {
    await performAutosave();
  }, 400); // 400ms debounce
}

// Perform active autosave write
async function performAutosave() {
  if (!editingNoteId) return;

  const noteIndex = notesState.findIndex(n => n.id === editingNoteId);
  if (noteIndex === -1) return;

  // Sync memory state
  notesState[noteIndex].content = editorContent.value;

  // If they typed something, it's no longer a brand new unsaved empty note
  if (editorContent.value.trim() !== '') {
    delete notesState[noteIndex].isNew;
  }

  if (await saveNotes()) {
    setSaveStatusText('Saved');
  }
}

// Handle Back link (forced final save & clean up empty notes)
async function handleBackClick() {
  if (saveTimeout) clearTimeout(saveTimeout);

  if (editingNoteId) {
    const contentVal = editorContent.value.trim();
    const note = notesState.find(n => n.id === editingNoteId && !n.deleted_at);

    // Discard note ONLY if it is newly created and completely empty
    if (contentVal === '' && note && note.isNew) {
      notesState = notesState.filter(n => n.id !== editingNoteId);
      await saveNotes();
    } else {
      // Force final save
      const noteIndex = notesState.findIndex(n => n.id === editingNoteId);
      if (noteIndex !== -1) {
        notesState[noteIndex].content = editorContent.value;
        markNoteUpdated(notesState[noteIndex]);
        // Clean up temporary isNew flag before saving to persistent storage
        delete notesState[noteIndex].isNew;
        await saveNotes();
      }
    }
  }

  showListView();
}

// Save status message display helper
function setSaveStatusText(text) {
  saveStatus.textContent = text;
  saveStatus.style.opacity = text === 'Saving...' ? '0.6' : '0.8';
}

// Toggle Checkbox state directly from Preview View or Editor View
async function toggleCheckbox(noteId, lineIndex, checked) {
  const note = notesState.find(n => n.id === noteId);
  if (!note) return;

  const lines = note.content.split('\n');
  if (lineIndex < 0 || lineIndex >= lines.length) return;

  const line = lines[lineIndex];
  const checkboxMatch = line.match(/^(-\s*\[)([ xX])(\]\s*(.*))/);
  
  if (checkboxMatch) {
    const replacement = checked ? 'x' : ' ';
    lines[lineIndex] = `${checkboxMatch[1]}${replacement}${checkboxMatch[3]}`;
    note.content = lines.join('\n');
    markNoteUpdated(note);
    
    await saveNotes();

    // Keep textarea editor content in sync
    if (editingNoteId === noteId) {
      editorContent.value = note.content;
    }
    
    // Partially update card content display to prevent page rendering redraw jumps
    const card = findNoteCard(noteId);
    if (card) {
      const cardBody = card.querySelector('.note-card-body');
      if (cardBody) {
        cardBody.innerHTML = parseMarkdown(note.content);
      }
    }
  }
}

// Show Deletion Overlay
function showDeleteConfirmation(card, noteId, returnFocus) {
  if (card.querySelector('.delete-confirm-overlay')) return;

  const overlay = document.createElement('div');
  overlay.className = 'delete-confirm-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'delete-confirm-heading');
  overlay.innerHTML = `
    <p id="delete-confirm-heading" class="delete-confirm-msg">Delete this note?</p>
    <div class="delete-confirm-actions">
      <button class="btn-confirm btn-confirm-yes" type="button">Delete</button>
      <button class="btn-confirm btn-confirm-no" type="button">Cancel</button>
    </div>
  `;

  card.appendChild(overlay);
  deleteDialogState = { card, returnFocus };
  overlay.querySelector('.btn-confirm-no').focus();
}

// Dismiss Deletion Overlay
function removeDeleteConfirmation(card) {
  const overlay = card.querySelector('.delete-confirm-overlay');
  if (overlay) {
    overlay.remove();
  }
  if (deleteDialogState?.card === card) {
    const { returnFocus } = deleteDialogState;
    deleteDialogState = null;
    returnFocus?.focus();
  }
}

// Delete Note Card
async function deleteNote(noteId) {
  const note = notesState.find(item => item.id === noteId);
  if (!note) return;

  note.deleted_at = Date.now();
  markNoteUpdated(note);
  await saveNotes();
  renderNotes();
  deleteDialogState = null;
  addNoteBtn.focus();
}

function findNoteCard(noteId) {
  return Array.from(notesGrid.querySelectorAll('.note-card')).find(card => card.dataset.id === noteId);
}

// Toggle actions dropdown menu
function toggleDropdown(noteId) {
  const card = findNoteCard(noteId);
  if (!card) return;
  const actions = card.querySelector('.note-actions');
  const dropdown = card.querySelector('.dropdown-menu');
  
  if (dropdown && actions) {
    const isOpen = dropdown.classList.contains('show');
    closeAllDropdowns(); // Close other open dropdowns first
    if (!isOpen) {
      dropdown.classList.add('show');
      actions.classList.add('active');
      card.querySelector('.btn-note-menu').setAttribute('aria-expanded', 'true');
    }
  }
}

// Close all open dropdown menus
function closeAllDropdowns() {
  const activeDropdowns = notesGrid.querySelectorAll('.dropdown-menu.show');
  activeDropdowns.forEach(d => d.classList.remove('show'));
  const activeActions = notesGrid.querySelectorAll('.note-actions.active');
  activeActions.forEach(a => a.classList.remove('active'));
  notesGrid.querySelectorAll('.btn-note-menu[aria-expanded="true"]').forEach(button => button.setAttribute('aria-expanded', 'false'));
}

// Toggle pinned status of a note
async function togglePinNote(noteId) {
  const note = notesState.find(n => n.id === noteId && !n.deleted_at);
  if (!note) return;

  note.pinned = !note.pinned;
  markNoteUpdated(note);
  await saveNotes();
  renderNotes();
}

// Safe HTML character escaping
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Sanitizes URLs for safe rendering in anchor tags
function sanitizeUrl(url) {
  const trimmed = url.trim();
  if (trimmed.toLowerCase().startsWith('javascript:')) {
    return '#';
  }
  // Check if it starts with #, /, //, or a valid protocol scheme
  if (trimmed.startsWith('#') || trimmed.startsWith('/') || trimmed.startsWith('//') || /^[a-z0-9+.-]+:/i.test(trimmed)) {
    return trimmed;
  }
  // Otherwise, default to external https link
  return 'https://' + trimmed;
}

// Safe Inline Markdown parsing (bold elements and links)
function parseInlineMarkdown(str) {
  const escaped = escapeHtml(str);
  // Matches **text** non-greedily and replaces with strong tag
  const withBold = escaped.replace(/\*\frac{n(n+1)}{2}\*\*/g, '<strong>$1</strong>')
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Matches [description](link) supporting balanced parentheses inside link part
  return withBold.replace(/\[([^\]]+)\]\(((?:[^()]+|\([^()]*\))*)\)/g, (match, desc, url) => {
    const safeUrl = sanitizeUrl(url);
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${desc}</a>`;
  });
}

// Safe Custom Markdown line-by-line parser
function parseMarkdown(text) {
  if (!text) {
    return `<p class="empty-note-placeholder" style="color: var(--text-muted); font-style: italic;">No text content</p>`;
  }

  const lines = text.split('\n');
  const parsedHtml = [];
  let inBulletList = false;

  lines.forEach((line, index) => {
    // 1. Checkbox lines matching: - [ ] content or - [x] content
    const checkboxMatch = line.match(/^-\s*\[([ xX])\]\s*(.*)/);

    // 2. Regular bullet point lines matching: - content
    const bulletMatch = line.match(/^-\s+(.*)/);

    // 3. Header lines matching: # Content, ## Content, etc.
    const headerMatch = line.match(/^(#{1,6})\s+(.*)/);

    if (checkboxMatch) {
      if (inBulletList) {
        parsedHtml.push('</ul>');
        inBulletList = false;
      }

      const isChecked = checkboxMatch[1].toLowerCase() === 'x';
      const content = checkboxMatch[2];

      parsedHtml.push(`
        <div class="checklist-item">
          <input type="checkbox" class="checklist-checkbox" ${isChecked ? 'checked' : ''} data-line="${index}" aria-label="Toggle task">
          <span class="checklist-text">${parseInlineMarkdown(content)}</span>
        </div>
      `);
    } else if (bulletMatch) {
      if (!inBulletList) {
        parsedHtml.push('<ul class="bullet-list">');
        inBulletList = true;
      }

      const content = bulletMatch[1];
      parsedHtml.push(`<li>${parseInlineMarkdown(content)}</li>`);
    } else if (headerMatch) {
      if (inBulletList) {
        parsedHtml.push('</ul>');
        inBulletList = false;
      }

      const level = headerMatch[1].length;
      const content = headerMatch[2];
      parsedHtml.push(`<h${level} class="markdown-header markdown-h${level}">${parseInlineMarkdown(content)}</h${level}>`);
    } else {
      if (inBulletList) {
        parsedHtml.push('</ul>');
        inBulletList = false;
      }

      const trimmedLine = line.trim();
      if (trimmedLine === '') {
        parsedHtml.push('<div style="height: 4px;"></div>');
      } else {
        parsedHtml.push(`<p>${parseInlineMarkdown(line)}</p>`);
      }
    }
  });

  if (inBulletList) {
    parsedHtml.push('</ul>');
  }

  return parsedHtml.join('');
}

// Render tag badges in the note editor view
function renderEditorTags() {
  if (!editingNoteId) return;
  const note = notesState.find(n => n.id === editingNoteId);
  if (!note) return;

  editorTagList.innerHTML = '';
  const tags = note.tags || [];
  tags.forEach((tag, idx) => {
    const chip = document.createElement('div');
    chip.className = 'editor-tag-chip';
    chip.innerHTML = `
      <span>${escapeHtml(tag)}</span>
      <button class="remove-btn" data-index="${idx}" aria-label="Remove tag">&times;</button>
    `;
    editorTagList.appendChild(chip);
  });
  editorTagInput.value = '';
}

// Render dynamic tag filter bar in the list view
function renderTagFilterBar() {
  // Compile unique list of tags across all notes (lowercase -> original case representation)
  const tagMap = new Map();
  notesState.forEach(note => {
    if (note.tags && Array.isArray(note.tags)) {
      note.tags.forEach(tag => {
        const trimmed = tag.trim();
        if (trimmed !== '') {
          const lower = trimmed.toLowerCase();
          if (!tagMap.has(lower)) {
            tagMap.set(lower, trimmed);
          }
        }
      });
    }
  });

  const sortedTags = Array.from(tagMap.values()).sort((a, b) => a.localeCompare(b));

  // If there are no tags at all, hide the filter bar to save vertical space
  if (sortedTags.length === 0) {
    tagFilterBar.innerHTML = '';
    tagFilterBar.style.display = 'none';
    activeTagFilters = []; // Clear filter if tags are deleted
    return;
  }

  tagFilterBar.style.display = 'flex';
  
  // Build chips
  const isAllActive = activeTagFilters.length === 0;
  let barHtml = `
    <button class="filter-tag filter-tag-all ${isAllActive ? 'active' : ''}" data-tag="all">All tags</button>
  `;
  
  sortedTags.forEach(tag => {
    const isActive = activeTagFilters.includes(tag.toLowerCase());
    barHtml += `
      <button class="filter-tag ${isActive ? 'active' : ''}" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>
    `;
  });

  tagFilterBar.innerHTML = barHtml;

  // If any active filter is no longer present in any note, remove it
  const lowerSortedTags = sortedTags.map(t => t.toLowerCase());
  const validFilters = activeTagFilters.filter(f => lowerSortedTags.includes(f));
  if (validFilters.length !== activeTagFilters.length) {
    activeTagFilters = validFilters;
    renderTagFilterBar();
    renderNotes();
  }
}
