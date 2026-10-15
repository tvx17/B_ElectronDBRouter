import type { App } from "electron";

export function registerDatabaseShutdown(
  app: App,
  close: () => Promise<void>,
  reportError: (error: unknown) => void
) {
  let finished = false;
  let shutdown: Promise<void> | undefined;
  app.on("before-quit", event => {
    if (finished) return;
    event.preventDefault();
    shutdown ??= close()
      .then(() => {
        finished = true;
        app.quit();
      })
      .catch(error => {
        reportError(error);
        app.exit(1);
      });
  });
  process.on("SIGINT", () => app.quit());
  process.on("SIGTERM", () => app.quit());
}
