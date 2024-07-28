import Vue from 'vue'
import Router from 'vue-router'
import AutoPlay from "../components/AutoPlay.vue";

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'AutoPlay',
      component: AutoPlay
    }
  ],
  mode: 'history'
})
