import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import '@fontsource-variable/figtree'
import '@fontsource-variable/jetbrains-mono'
import './style.css'
import App from './App.vue'
import HomeView from './views/HomeView.vue'
import ExercisesView from './views/ExercisesView.vue'
import ExerciseView from './views/ExerciseView.vue'
import QuizView from './views/QuizView.vue'
import TrackerView from './views/TrackerView.vue'
import GlossaryView from './views/GlossaryView.vue'
import ReferencesView from './views/ReferencesView.vue'
import TrackView from './views/TrackView.vue'
import { boot, state } from './store'
import { startChat } from './chat'
import ChatView from './views/ChatView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/exercises', component: ExercisesView },
    { path: '/exercises/:id', component: ExerciseView, props: true },
    { path: '/quiz', component: QuizView },
    { path: '/take-home/:track', component: TrackView, props: true },
    { path: '/take-home/:track/quiz', component: QuizView, props: true },
    { path: '/chat', component: ChatView },
    { path: '/glossary', component: GlossaryView },
    { path: '/references', component: ReferencesView },
    { path: '/live', component: TrackerView },
  ],
  // In-page links (the glossary's and references' topic lists) land below the sticky header.
  // A # holding settings (the Live page's #exercise=<id>) is not an anchor, and changing it stays put.
  scrollBehavior: (to, from) => {
    if (to.hash.includes('=')) return to.path === from.path ? false : { top: 0 }
    return to.hash ? { el: to.hash, top: 88 } : { top: 0 }
  },
})

// The chat listens app-wide, so the pet and nav can show unread questions on any page.
boot().then(() => state.content && startChat(state.content.realtime.key))
createApp(App).use(router).mount('#app')
