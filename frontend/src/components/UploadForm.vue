<script setup>
import { ref, computed } from 'vue';
import { useTtsStore } from '../stores/ttsStore';

const store = useTtsStore();

const file = ref(null);
const isDragging = ref(false);
const uploadProgress = ref(0);
const fileError = ref('');

const fileInput = ref(null);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const canUpload = computed(() => {
  return file.value && !store.loading && !fileError.value;
});

const selectedVoiceName = computed(() => {
  const voice = store.voices.find(v => v.id === store.selectedVoice);
  return voice?.name || store.selectedVoice;
});

function handleDragOver(e) {
  e.preventDefault();
  isDragging.value = true;
}

function handleDragLeave(e) {
  e.preventDefault();
  isDragging.value = false;
}

function handleDrop(e) {
  e.preventDefault();
  isDragging.value = false;

  const droppedFile = e.dataTransfer.files[0];
  validateAndSetFile(droppedFile);
}

function handleFileSelect(e) {
  const selectedFile = e.target.files[0];
  validateAndSetFile(selectedFile);
}

function validateAndSetFile(selectedFile) {
  fileError.value = '';

  if (!selectedFile) return;

  if (selectedFile.type !== 'application/pdf') {
    fileError.value = 'Nur PDF-Dateien werden unterstützt';
    return;
  }

  if (selectedFile.size > MAX_FILE_SIZE) {
    fileError.value = 'Datei zu groß (Maximum: 50 MB)';
    return;
  }

  file.value = selectedFile;
}

function clearFile() {
  file.value = null;
  fileError.value = '';
  uploadProgress.value = 0;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

async function handleUpload() {
  if (!canUpload.value) return;

  uploadProgress.value = 0;

  try {
    // Simulate progress during upload
    const progressInterval = setInterval(() => {
      if (uploadProgress.value < 90) {
        uploadProgress.value += 10;
      }
    }, 200);

    await store.uploadPDF(file.value);

    clearInterval(progressInterval);
    uploadProgress.value = 100;

    // Reset after success
    setTimeout(() => {
      clearFile();
    }, 1000);

  } catch (err) {
    fileError.value = err.response?.data?.error || 'Upload fehlgeschlagen';
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
</script>

<template>
  <div class="card">
    <h2 class="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
      <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      PDF Hochladen
    </h2>

    <!-- Drop Zone -->
    <div
      v-if="!file"
      class="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center transition-all duration-200 cursor-pointer"
      :class="{ 'drag-active border-emerald-400 bg-emerald-500/10': isDragging }"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="fileInput?.click()"
    >
      <input
        ref="fileInput"
        type="file"
        accept=".pdf"
        class="hidden"
        @change="handleFileSelect"
      >

      <svg class="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>

      <p class="text-slate-300 mb-1">
        <span class="font-medium text-emerald-400">Klicke hier</span> oder ziehe eine PDF hinein
      </p>
      <p class="text-xs text-slate-500">
        Maximum: 50 MB
      </p>
    </div>

    <!-- Selected File -->
    <div v-else class="bg-slate-700/50 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-slate-100 truncate">
            {{ file.name }}
          </p>
          <p class="text-xs text-slate-400">
            {{ formatFileSize(file.size) }}
          </p>

          <!-- Progress Bar -->
          <div v-if="store.loading" class="mt-2">
            <div class="h-1.5 bg-slate-600 rounded-full overflow-hidden">
              <div
                class="h-full bg-emerald-500 rounded-full transition-all duration-300"
                :style="{ width: `${uploadProgress}%` }"
              />
            </div>
          </div>
        </div>

        <button
          v-if="!store.loading"
          @click="clearFile"
          class="text-slate-400 hover:text-red-400 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="fileError || store.error" class="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
      <p class="text-sm text-red-300 flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {{ fileError || store.error }}
      </p>
    </div>

    <!-- Settings -->
    <div class="mt-6 space-y-4">
      <!-- Voice Selection -->
      <div>
        <label class="block text-sm font-medium text-slate-300 mb-2">
          Stimme
        </label>
        <select
          v-model="store.selectedVoice"
          class="input-field"
        >
          <option
            v-for="voice in store.voices"
            :key="voice.id"
            :value="voice.id"
          >
            {{ voice.name }}
            {{ voice.recommended ? ' (Empfohlen)' : '' }}
          </option>
        </select>
        <p class="mt-1 text-xs text-slate-500">
          {{ store.voices.find(v => v.id === store.selectedVoice)?.description }}
        </p>
      </div>

      <!-- Speed Slider -->
      <div>
        <label class="block text-sm font-medium text-slate-300 mb-2">
          Sprechgeschwindigkeit: {{ store.playbackSpeed.toFixed(1) }}x
        </label>
        <input
          v-model.number="store.playbackSpeed"
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          class="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        >
        <div class="flex justify-between text-xs text-slate-500 mt-1">
          <span>Langsam</span>
          <span>Normal</span>
          <span>Schnell</span>
        </div>
      </div>
    </div>

    <!-- Upload Button -->
    <button
      @click="handleUpload"
      :disabled="!canUpload"
      class="btn-primary w-full mt-6 flex items-center justify-center gap-2"
    >
      <svg
        v-if="store.loading"
        class="w-5 h-5 spinner"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>

      <svg
        v-else
        class="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>

      {{ store.loading ? 'Wird hochgeladen...' : 'Hochladen & Verarbeiten' }}
    </button>
  </div>
</template>
