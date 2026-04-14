<script setup>
import { ref, computed, onUnmounted } from 'vue';
import { useTtsStore } from '../stores/ttsStore';

const props = defineProps({
  jobId: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    default: 'audio.mp3'
  }
});

const store = useTtsStore();

const audio = ref(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1);

const streamUrl = computed(() => store.getAudioUrl(props.jobId));
const downloadUrl = computed(() => store.getDownloadUrl(props.jobId));
const downloadFilename = computed(() => {
  const base = props.filename.replace(/\.pdf$/i, '');
  return `${base}.mp3`;
});

const progressPercent = computed(() => {
  if (!duration.value) return 0;
  return (currentTime.value / duration.value) * 100;
});

const formattedCurrentTime = computed(() => formatTime(currentTime.value));
const formattedDuration = computed(() => formatTime(duration.value));

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function togglePlay() {
  if (!audio.value) return;

  if (isPlaying.value) {
    audio.value.pause();
  } else {
    audio.value.play();
  }
}

function onPlay() {
  isPlaying.value = true;
}

function onPause() {
  isPlaying.value = false;
}

function onTimeUpdate() {
  if (audio.value) {
    currentTime.value = audio.value.currentTime;
  }
}

function onLoadedMetadata() {
  if (audio.value) {
    duration.value = audio.value.duration;
  }
}

function onEnded() {
  isPlaying.value = false;
  currentTime.value = 0;
}

function onError() {
  console.error('Audio loading error');
  isPlaying.value = false;
}

function seek(event) {
  if (!audio.value || !duration.value) return;

  const rect = event.target.getBoundingClientRect();
  const percent = (event.clientX - rect.left) / rect.width;
  const newTime = percent * duration.value;

  audio.value.currentTime = newTime;
  currentTime.value = newTime;
}

function setVolume(value) {
  volume.value = value;
  if (audio.value) {
    audio.value.volume = value;
  }
}

// Cleanup
onUnmounted(() => {
  if (audio.value) {
    audio.value.pause();
    audio.value.src = '';
  }
});
</script>

<template>
  <div class="bg-slate-700/50 rounded-lg p-3">
    <!-- Hidden Audio Element -->
    <audio
      ref="audio"
      :src="streamUrl"
      @play="onPlay"
      @pause="onPause"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoadedMetadata"
      @ended="onEnded"
      @error="onError"
      preload="metadata"
    />

    <div class="flex items-center gap-3">
      <!-- Play/Pause Button -->
      <button
        @click="togglePlay"
        class="w-10 h-10 flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-full transition-colors"
        :class="{ 'animate-pulse': isPlaying }"
      >
        <svg v-if="isPlaying" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      <!-- Progress Bar -->
      <div class="flex-1">
        <div
          class="h-1.5 bg-slate-600 rounded-full cursor-pointer overflow-hidden"
          @click="seek"
        >
          <div
            class="h-full bg-emerald-500 rounded-full transition-all duration-100"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
        <div class="flex justify-between text-xs text-slate-400 mt-1">
          <span>{{ formattedCurrentTime }}</span>
          <span>{{ formattedDuration }}</span>
        </div>
      </div>

      <!-- Volume Control -->
      <div class="flex items-center gap-2">
        <button
          @click="setVolume(volume === 0 ? 1 : 0)"
          class="text-slate-400 hover:text-slate-300"
        >
          <svg v-if="volume > 0.5" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
          <svg v-else-if="volume > 0" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072" />
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          :value="volume"
          @input="setVolume($event.target.value)"
          class="w-16 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        >
      </div>

      <!-- Download Button -->
      <a
        :href="downloadUrl"
        :download="downloadFilename"
        class="p-2 text-slate-400 hover:text-emerald-400 transition-colors"
        title="MP3 herunterladen"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </a>
    </div>
  </div>
</template>
