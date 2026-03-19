<template>
  <div class="app-shell">
    <header class="top-nav-wrap">
      <nav class="top-nav">
        <NuxtLink to="/">Operations workspace</NuxtLink>
        <NuxtLink to="/settlement-chargeback-monitor">Chargeback monitor</NuxtLink>
        <NuxtLink to="/payment-attempt-timeline">Attempt timeline</NuxtLink>
        <NuxtLink to="/release-gate-evidence-digest">Release-gate digest</NuxtLink>
      </nav>
    </header>
    <NuxtPage />
  </div>
</template>
