<template>
  <q-page padding>
    <h1 class="text-h5">Electron API Beispiele</h1>
    <p>
      Notizen werden lokal gespeichert. Die Nutzer-Beispiele bleiben ohne
      Speicherung. PGlite ist Standard; SQLite dient ausschließlich als
      Fallback.
    </p>
    <p v-if="!available">Bitte mit npm run dev -- -m electron starten.</p>
    <div class="row q-gutter-sm">
      <q-btn
        v-for="example in examples"
        :key="example.label"
        :label="example.label"
        :disable="!available"
        color="primary"
        @click="run(example.request)"
      />
    </div>
    <pre class="q-mt-md" style="white-space: pre-wrap">{{ result }}</pre>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { request } from "@/services/electron-api";
import type { ApiRequest } from "@/shared/electron-api";

const available = Boolean(window.electronApi);
const result = ref("Eine Anfrage auswählen.");
const examples: { label: string; request: ApiRequest }[] = [
  { label: "Datenbankstatus", request: { method: "GET", url: "/database" } },
  { label: "Notizen laden", request: { method: "GET", url: "/notes" } },
  {
    label: "Notiz speichern",
    request: {
      method: "POST",
      url: "/notes",
      data: { title: "Meine erste Notiz" }
    }
  },
  {
    label: "GET Liste",
    request: { method: "GET", url: "/users?search=Max%20Mustermann" }
  },
  { label: "GET ID", request: { method: "GET", url: "/users/42" } },
  {
    label: "POST",
    request: { method: "POST", url: "/users", data: { name: "Ada" } }
  },
  {
    label: "PUT",
    request: { method: "PUT", url: "/users/42", data: { name: "Grace" } }
  },
  {
    label: "PATCH",
    request: { method: "PATCH", url: "/users/42", data: { name: "Lin" } }
  },
  { label: "DELETE", request: { method: "DELETE", url: "/users/42" } },
  { label: "404", request: { method: "GET", url: "/unknown" } }
];

async function run(input: ApiRequest) {
  try {
    result.value = JSON.stringify(await request(input), null, 2);
  } catch (error) {
    result.value = error instanceof Error ? error.message : String(error);
  }
}
</script>
