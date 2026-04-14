import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import axios from 'axios';

const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const useTtsStore = defineStore('tts', () => {
  // State
  const jobs = ref([]);
  const voices = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const selectedVoice = ref('de-thorsten-medium');
  const playbackSpeed = ref(1.0);

  // Getters
  const sortedJobs = computed(() => {
    return [...jobs.value].sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );
  });

  const pendingJobs = computed(() =>
    jobs.value.filter(j => j.status === 'pending' || j.status === 'processing')
  );

  const completedJobs = computed(() =>
    jobs.value.filter(j => j.status === 'completed')
  );

  // Actions
  async function fetchJobs() {
    try {
      const response = await api.get('/jobs');
      jobs.value = response.data.jobs;
      error.value = null;
    } catch (err) {
      error.value = err.response?.data?.message || 'Fehler beim Laden der Aufträge';
      console.error('Fetch jobs error:', err);
    }
  }

  async function fetchVoices() {
    try {
      const response = await api.get('/voices');
      voices.value = response.data.voices;
    } catch (err) {
      console.error('Fetch voices error:', err);
      // Fallback voices
      voices.value = [
        { id: 'de-thorsten-low', name: 'Thorsten (Low)', recommended: false },
        { id: 'de-thorsten-medium', name: 'Thorsten (Medium)', recommended: true },
        { id: 'de-thorsten-high', name: 'Thorsten (High)', recommended: false }
      ];
    }
  }

  async function uploadPDF(file, voice = null, speed = null) {
    loading.value = true;
    error.value = null;

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('voice', voice || selectedVoice.value);
      formData.append('speed', speed || playbackSpeed.value);

      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Add new job to list
      jobs.value.unshift(response.data.job);

      loading.value = false;
      return response.data.job;

    } catch (err) {
      loading.value = false;
      error.value = err.response?.data?.error || 'Upload fehlgeschlagen';
      console.error('Upload error:', err);
      throw err;
    }
  }

  async function deleteJob(id) {
    try {
      await api.delete(`/jobs/${id}`);
      jobs.value = jobs.value.filter(j => j.id !== id);
    } catch (err) {
      error.value = err.response?.data?.message || 'Löschen fehlgeschlagen';
      console.error('Delete job error:', err);
    }
  }

  async function refreshJob(id) {
    try {
      const response = await api.get(`/jobs/${id}`);
      const index = jobs.value.findIndex(j => j.id === id);
      if (index !== -1) {
        jobs.value[index] = response.data.job;
      }
      return response.data.job;
    } catch (err) {
      console.error('Refresh job error:', err);
    }
  }

  function getAudioUrl(id) {
    return `${API_BASE}/audio/${id}?stream=true`;
  }

  function getDownloadUrl(id) {
    return `${API_BASE}/audio/${id}?download=true`;
  }

  function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDuration(seconds) {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function formatFileSize(bytes) {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(2)} MB`;
  }

  return {
    jobs,
    voices,
    loading,
    error,
    selectedVoice,
    playbackSpeed,
    sortedJobs,
    pendingJobs,
    completedJobs,
    fetchJobs,
    fetchVoices,
    uploadPDF,
    deleteJob,
    refreshJob,
    getAudioUrl,
    getDownloadUrl,
    formatDate,
    formatDuration,
    formatFileSize
  };
});
