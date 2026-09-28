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
import { boot } from './store'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/exercises', component: ExercisesView },
    { path: '/exercises/:id', component: ExerciseView, props: true },
    { path: '/quiz', component: QuizView },
    { path: '/glossary', component: GlossaryView },
    { path: '/live', component: TrackerView },
  ],
  // In-page links (the glossary's topic list) land below the sticky header.
  scrollBehavior: (to) => (to.hash ? { el: to.hash, top: 88 } : { top: 0 }),
})

boot()
createApp(App).use(router).mount('#app')
