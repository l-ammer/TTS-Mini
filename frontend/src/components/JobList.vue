<script setup>
import { computed } from 'vue';
import { useTtsStore } from '../stores/ttsStore';
import AudioPlayer from './AudioPlayer.vue';

const store = useTtsStore();

const statusConfig = {
  pending: {
    label: 'Wartend',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    class: 'status-pending'
  },
  processing: {
    label: 'Verarbeitung',
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    class: 'status-processing'
  },
  completed: {
    label: 'Fertig',
    icon: 'M5 13l4 4L19 7',
    class: 'status-completed'
  },
  failed: {
    label: 'Fehlgeschlagen',
    icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    class: 'status-failed'
  }
};

function getStatusConfig(status) {
  return statusConfig[status] || statusConfig.pending;
}

async function deleteJob(id, event) {
  event.stopPropagation();
  if (confirm('Möchtest du diesen Auftrag wirklich löschen?')) {
    await store.deleteJob(id);
  }
}

function refreshJob(id) {
  store.refreshJob(id);
}

const activeJobs = computed(() =>
  store.sortedJobs.filter(j => j.status === 'pending' || j.status === 'processing')
);

const finishedJobs = computed(() =>
  store.sortedJobs.filter(j => j.status === 'completed' || j.status === 'failed')
);
</script>

<template>
  <div>
    <!-- Active Jobs -->
    <div v-if="activeJobs.length > 0" class="mb-6">
      <h2 class="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
        <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Aktive Aufträge
      </h2>

      <div class="space-y-3">
        <div
          v-for="job in activeJobs"
          :key="job.id"
          class="card p-4 border-l-4 border-l-yellow-500"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p class="font-medium text-slate-100 truncate max-w-xs">
                  {{ job.filename }}
                </p>
                <p class="text-xs text-slate-400">
                  {{ store.formatDate(job.created_at) }}
                </p>
              </div>
            </div>

            <span :class="getStatusConfig(job.status).class">
              <svg class="w-3 h-3 mr-1" :class="{ 'spinner': job.status === 'processing' }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getStatusConfig(job.status).icon" />
              </svg>
              {{ getStatusConfig(job.status).label }}
            </span>
          </div>

          <!-- Progress Bar for Processing -->
          <div v-if="job.status === 'processing'" class="mt-3">
            <div class="flex justify-between text-xs text-slate-400 mb-1">
              <span>Wird verarbeitet...</span>
              <span>{{ job.progress }}%</span>
            </div>
            <div class="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                class="h-full bg-emerald-500 rounded-full transition-all duration-500"
                :style="{ width: `${job.progress}%` }"
              />
            </div>
          </div>

          <!-- Pending Indicator -->
          <div v-else class="mt-3 text-xs text-slate-500">
            Wartet in der Warteschlange...
          </div>
        </div>
      </div>
    </div>

    <!-- Finished Jobs -->
    <div>
      <h2 class="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
        <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        {{ finishedJobs.length > 0 ? 'Verarbeitete Aufträge' : 'Verlauf' }}
      </h2>

      <!-- Empty State -->
      <div v-if="finishedJobs.length === 0" class="card text-center py-12">
        <svg class="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p class="text-slate-400">Noch keine Aufträge</p>
        <p class="text-sm text-slate-500 mt-1">
          Lade eine PDF hoch, um sie in Sprache zu verwandeln
        </p>
      </div>

      <!-- Job Cards -->
      <div v-else class="space-y-3">
        <div
          v-for="job in finishedJobs"
          :key="job.id"
          class="card p-4"
          :class="{ 'border-l-4 border-l-emerald-500': job.status === 'completed', 'border-l-4 border-l-red-500': job.status === 'failed' }"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p class="font-medium text-slate-100 truncate max-w-xs">
                  {{ job.filename }}
                </p>
                <div class="flex items-center gap-2 text-xs text-slate-400">
                  <span>{{ store.formatDate(job.created_at) }}</span>
                  <span>•</span>
                  <span class="text-slate-500">{{ job.voice.replace('de-thorsten-', '') }}</span>
                  <span v-if="job.speed !== 1.0" class="text-emerald-400">{{ job.speed }}x</span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <span :class="getStatusConfig(job.status).class">
                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getStatusConfig(job.status).icon" />
                </svg>
                {{ getStatusConfig(job.status).label }}
              </span>

              <button
                @click="deleteJob(job.id, $event)"
                class="p-2 text-slate-400 hover:text-red-400 transition-colors"
                title="Löschen"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="job.status === 'failed' && job.error_message" class="mt-3 p-2 bg-red-500/10 rounded text-xs text-red-300">
            {{ job.error_message }}
          </div>

          <!-- Audio Player for Completed Jobs -->
          <AudioPlayer
            v-if="job.status === 'completed'"
            :job-id="job.id"
            :filename="job.filename"
            class="mt-3"
          />
        </div>
      </div>
    </div>
  </div>
</template>
