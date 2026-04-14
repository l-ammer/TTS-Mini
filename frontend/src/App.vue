<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useTtsStore } from './stores/ttsStore';
import UploadForm from './components/UploadForm.vue';
import JobList from './components/JobList.vue';

const store = useTtsStore();

// Poll for job updates every 5 seconds
let pollInterval;

onMounted(() => {
  store.fetchJobs();
  store.fetchVoices();

  pollInterval = setInterval(() => {
    store.fetchJobs();
  }, 5000);
});

onUnmounted(() => {
  clearInterval(pollInterval);
});
</script>

<template>
  <div class="min-h-screen bg-slate-900">
    <!-- Header -->
    <header class="border-b border-slate-700 bg-slate-800/50 backdrop-blur">
      <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div>
            <h1 class="text-xl font-bold text-slate-100">Vibe Voice</h1>
            <p class="text-xs text-slate-400">PDF zu MP3 - Kostenlose deutsche TTS</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span
            v-if="store.pendingJobs.length > 0"
            class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300"
          >
            <svg class="w-4 h-4 mr-1 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ store.pendingJobs.length }} {{ store.pendingJobs.length === 1 ? 'Auftrag' : 'Aufträge' }} aktiv
          </span>
          <span
            v-else
            class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Bereit
          </span>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-6xl mx-auto px-4 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Left: Upload Form -->
        <div class="lg:col-span-4">
          <UploadForm />
        </div>

        <!-- Right: Job List -->
        <div class="lg:col-span-8">
          <JobList />
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-slate-700 mt-auto">
      <div class="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-slate-400">
        <p>
          Powered by <a href="https://github.com/rhasspy/piper" target="_blank" class="text-emerald-400 hover:text-emerald-300">Piper TTS</a> •
          Lokal & Datenschutzfreundlich •
          <a href="https://github.com/thorsten-voice" target="_blank" class="text-emerald-400 hover:text-emerald-300">Thorsten Voice</a>
        </p>
      </div>
    </footer>
  </div>
</template>
